from typing import Protocol

import cv2
import numpy as np

from app.config.settings import settings
from app.models.omr import AnswerMap, QuestionAnswer
from app.services.bubble import omr_template as template
from app.services.llm.llm_service import ILlmService, get_llm_service
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("bubble_service")

# Calibrated against real sample sheets, not guessed — see omr-extraction-strategy.md
# § Confidence & Teacher Review for the fill-ratio data behind these numbers.
FILL_THRESHOLD = 0.65  # a bubble counts as "marked" above this
CONFIDENT_BLANK_THRESHOLD = 0.45  # below this, treat as unambiguously blank — no review
AMBIGUITY_MARGIN = 0.15
# Below this, the AI's own read is treated as no more trustworthy than the CV read that
# already flagged the question — still goes to manual review rather than being trusted.
AI_CONFIDENCE_THRESHOLD = 0.75
# Variance of the Laplacian — the standard blur-detection proxy. Doesn't reliably catch
# directional motion blur (edges stay sharp along one axis); needs_review per question
# is the backstop for whatever slips past this.
BLUR_VARIANCE_THRESHOLD = 20.0

_CORNERS = ("tl", "tr", "bl", "br")

# The outer table border must dominate the frame to be trusted as the sheet, not
# background clutter — same idea as requiring 4 corner markers before, just applied
# to a single border contour instead.
_MIN_TABLE_AREA_FRACTION = 0.2
_MAX_TABLE_AREA_FRACTION = 0.8
_CANDIDATE_CONTOURS_CONSIDERED = 10


class IBubbleService(Protocol):
    async def detect_bubbles(self, image: bytes, test_id: int) -> Result[AnswerMap, "AppError"]: ...
    async def extract_name_region(self, image: bytes) -> Result[bytes, "AppError"]: ...


class OpenCvBubbleService:
    """OpenCV bubble-position reading is the only per-photo discovery here — positions
    come from omr_template.py, never learned. AI only enters for the minority of
    questions OpenCv's fill-ratio read can't confidently call (see _resolve_with_ai);
    the common case (most sheets, most questions) never touches it, preserving the
    per-sheet cost/determinism this design exists for."""

    def __init__(self, llm: ILlmService) -> None:
        self._llm = llm

    async def detect_bubbles(self, image: bytes, test_id: int) -> Result[AnswerMap, "AppError"]:
        raw_result = self._decode_and_check_blur(image)
        if raw_result.is_err():
            return err(raw_result.error)
        raw = raw_result.value

        corners = self._detect_table_corners(raw)
        if corners is None:
            logger.info("Table border not detected — falling back to a whole-sheet AI read")
            return await self._read_whole_sheet_fallback(image)

        warped = self._deskew(raw, corners)
        ink_mask = self._threshold_to_ink_mask(warped)
        answers = self._read_bubbles(ink_mask)
        answers = await self._resolve_with_ai(warped, answers)
        return ok(AnswerMap(answers=answers))

    async def _read_whole_sheet_fallback(self, image: bytes) -> Result[AnswerMap, "AppError"]:
        """Last resort when the table's own border can't be found — asks the AI to
        read the raw, unaligned photo directly instead of failing outright. Every
        answer still goes through the same confidence gate as row-level adjudication,
        so a bad whole-sheet read surfaces as needs_review, never a silent guess."""
        judgment_result = await self._llm.read_whole_sheet(image)
        if judgment_result.is_err():
            logger.warning("Whole-sheet AI fallback failed (%s)", judgment_result.error.message)
            return err(ERRORS["BUBBLE_DETECTION_ERROR"])

        answers = [
            QuestionAnswer(
                question_number=judgment.question_number,
                selected_option=judgment.selected_option,
                needs_review=judgment.confidence < AI_CONFIDENCE_THRESHOLD,
            )
            for judgment in sorted(judgment_result.value, key=lambda j: j.question_number)
        ]
        logger.info(
            "Whole-sheet AI fallback resolved %d/%d questions confidently",
            sum(1 for a in answers if not a.needs_review),
            len(answers),
        )
        return ok(AnswerMap(answers=answers))

    async def extract_name_region(self, image: bytes) -> Result[bytes, "AppError"]:
        """Crops the sheet's header band (title, NAME/STD, SUB/DATE, column labels) for
        an LLM to read the handwritten NAME field from — cropped rather than pinpointed,
        since the header's own column widths haven't been measured the way the question
        grid's have, and the printed "NAME" label gives a vision model enough to anchor
        on regardless."""
        raw_result = self._decode_and_check_blur(image)
        if raw_result.is_err():
            return err(raw_result.error)
        raw = raw_result.value

        corners = self._detect_table_corners(raw)
        if corners is None:
            # Cloud Vision locates the NAME label by its own word position, not a fixed
            # crop — it doesn't need the sheet deskewed first, so the raw photo works
            # directly here even when the table border couldn't be found.
            return ok(image)

        warped = self._deskew(raw, corners)
        header_bottom_px = round(template.DATA_ROWS_TOP_FRAC * template.CANON_HEIGHT_PX)
        header = warped[:header_bottom_px, :]
        ok_encoded, buffer = cv2.imencode(".png", header)
        if not ok_encoded:
            return err(ERRORS["BUBBLE_DETECTION_ERROR"])
        return ok(buffer.tobytes())

    def _decode_and_check_blur(self, image: bytes) -> Result[np.ndarray, "AppError"]:
        buffer = np.frombuffer(image, dtype=np.uint8)
        raw = cv2.imdecode(buffer, cv2.IMREAD_GRAYSCALE)
        if raw is None:
            return err(ERRORS["BUBBLE_DETECTION_ERROR"])

        if self._blur_score(raw) < BLUR_VARIANCE_THRESHOLD:
            return err(ERRORS["IMAGE_TOO_BLURRY"])

        return ok(raw)

    def _blur_score(self, gray: np.ndarray) -> float:
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def _detect_table_corners(self, gray: np.ndarray) -> dict[str, tuple[float, float]] | None:
        """Finds the sheet's outer table border and returns its 4 corners — this
        sheet has no dedicated fiducial markers (it's a third-party design), so the
        table's own printed outline is used as the deskew reference instead, the
        same way a generic document scanner locates a page in a photo."""
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        edges = cv2.dilate(edges, np.ones((5, 5), np.uint8))
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        image_area = gray.shape[0] * gray.shape[1]
        min_area = _MIN_TABLE_AREA_FRACTION * image_area
        max_area = _MAX_TABLE_AREA_FRACTION * image_area

        candidates = [c for c in contours[:_CANDIDATE_CONTOURS_CONSIDERED] if cv2.contourArea(c) >= min_area]
        if not candidates:
            return None

        # A real capture (per the in-app guided capture flow) always has some
        # background margin around the table — a table filling almost the whole frame
        # means the shot was cropped too tight to trust, not a genuine full-sheet photo.
        candidates = [c for c in candidates if cv2.contourArea(c) <= max_area]
        if not candidates:
            return None

        for contour in candidates:
            perimeter = cv2.arcLength(contour, closed=True)
            approx = cv2.approxPolyDP(contour, epsilon=0.02 * perimeter, closed=True)
            if len(approx) == 4:
                return self._order_corners(approx.reshape(4, 2).astype(np.float64))

        # Real table borders don't always collapse to an exact 4-point polygon (text
        # touching the border, a slightly uneven printed/scanned line) — falling back
        # to the largest candidate's minimum-area rotated rectangle is more forgiving
        # than trying ever-looser epsilon values against a possibly-wrong contour.
        box = cv2.boxPoints(cv2.minAreaRect(candidates[0]))
        return self._order_corners(box.astype(np.float64))

    def _order_corners(self, points: np.ndarray) -> dict[str, tuple[float, float]]:
        """Orders 4 arbitrary quadrilateral points into tl/tr/bl/br using the
        standard sum/diff trick: top-left has the smallest x+y, bottom-right the
        largest; top-right has the smallest y-x, bottom-left the largest."""
        sums = points.sum(axis=1)
        diffs = points[:, 1] - points[:, 0]
        return {
            "tl": tuple(points[np.argmin(sums)]),
            "br": tuple(points[np.argmax(sums)]),
            "tr": tuple(points[np.argmin(diffs)]),
            "bl": tuple(points[np.argmax(diffs)]),
        }

    def _deskew(self, gray: np.ndarray, corners: dict[str, tuple[float, float]]) -> np.ndarray:
        src_points = np.float32([corners[corner] for corner in _CORNERS])
        dst_points = np.float32(
            [
                (0, 0),
                (template.CANON_WIDTH_PX, 0),
                (0, template.CANON_HEIGHT_PX),
                (template.CANON_WIDTH_PX, template.CANON_HEIGHT_PX),
            ]
        )
        transform = cv2.getPerspectiveTransform(src_points, dst_points)
        return cv2.warpPerspective(gray, transform, (template.CANON_WIDTH_PX, template.CANON_HEIGHT_PX))

    def _threshold_to_ink_mask(self, warped: np.ndarray) -> np.ndarray:
        _, mask = cv2.threshold(warped, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
        return mask

    def _fill_ratio(self, ink_mask: np.ndarray, center_frac: tuple[float, float]) -> float:
        cx, cy = template.frac_to_canon_px(center_frac)
        # Sample inside the printed outline, not up to its edge — every bubble has a
        # printed circle whether marked or not, and including that stroke in the ROI
        # gave blank bubbles a non-trivial baseline fill ratio instead of near-zero.
        r = template.BUBBLE_RADIUS_PX * 0.6
        x0, x1 = max(0, round(cx - r)), min(ink_mask.shape[1], round(cx + r))
        y0, y1 = max(0, round(cy - r)), min(ink_mask.shape[0], round(cy + r))
        roi = ink_mask[y0:y1, x0:x1]
        if roi.size == 0:
            return 0.0
        return float(np.count_nonzero(roi)) / roi.size

    def _read_bubbles(self, ink_mask: np.ndarray) -> list[QuestionAnswer]:
        by_question: dict[int, dict[str, float]] = {}
        for bubble in template.TEMPLATE_BUBBLES:
            ratio = self._fill_ratio(ink_mask, bubble.center_frac)
            by_question.setdefault(bubble.question_number, {})[bubble.option] = ratio

        answers = []
        for question_number in sorted(by_question):
            ratios = by_question[question_number]
            ranked = sorted(ratios.items(), key=lambda item: item[1], reverse=True)
            top_option, top_ratio = ranked[0]
            second_ratio = ranked[1][1] if len(ranked) > 1 else 0.0

            if top_ratio < CONFIDENT_BLANK_THRESHOLD:
                # Nowhere near the fill threshold on any option — unambiguously blank,
                # not a case that needs a human to look at it.
                selected_option, needs_review = None, False
            elif top_ratio < FILL_THRESHOLD:
                # Below the "marked" bar but not by much — could be a genuine mark the
                # CV under-read (faint pencil, bad lighting), not just a blank answer.
                selected_option, needs_review = None, True
            elif second_ratio >= FILL_THRESHOLD:
                # More than one option independently clears the fill threshold — a
                # real double-mark, not just a close call between winner and runner-up.
                selected_option, needs_review = None, True
            elif (top_ratio - second_ratio) < AMBIGUITY_MARGIN:
                selected_option, needs_review = top_option, True
            else:
                selected_option, needs_review = top_option, False

            answers.append(
                QuestionAnswer(
                    question_number=question_number,
                    selected_option=selected_option,
                    needs_review=needs_review,
                )
            )
        return answers

    async def _resolve_with_ai(
        self, warped: np.ndarray, answers: list[QuestionAnswer]
    ) -> list[QuestionAnswer]:
        flagged = [a for a in answers if a.needs_review]
        if not flagged:
            return answers

        question_numbers = [a.question_number for a in flagged]
        logger.info(
            "Sending %d ambiguous question(s) to AI for adjudication: %s", len(flagged), question_numbers
        )

        crops = [(a.question_number, self._crop_question_region(warped, a.question_number)) for a in flagged]
        judgment_result = await self._llm.adjudicate_bubbles(crops)
        if judgment_result.is_err():
            logger.warning(
                "AI adjudication call failed (%s) — keeping CV read as-is", judgment_result.error.message
            )
            return answers  # AI unavailable/failed — the CV read still stands, flagged as-is

        judgment_by_question = {j.question_number: j for j in judgment_result.value}
        resolved = []
        for answer in answers:
            judgment = judgment_by_question.get(answer.question_number)
            if judgment is not None and judgment.confidence >= AI_CONFIDENCE_THRESHOLD:
                logger.info(
                    "AI resolved Q%d: %s (confidence %.2f)",
                    answer.question_number,
                    judgment.selected_option,
                    judgment.confidence,
                )
                resolved.append(
                    QuestionAnswer(
                        question_number=answer.question_number,
                        selected_option=judgment.selected_option,
                        needs_review=False,
                    )
                )
            else:
                if judgment is not None:
                    logger.info(
                        "AI still not confident on Q%d: %s (confidence %.2f) — leaving for manual review",
                        answer.question_number,
                        judgment.selected_option,
                        judgment.confidence,
                    )
                resolved.append(answer)
        return resolved

    def _crop_question_region(self, warped: np.ndarray, question_number: int) -> bytes:
        x0f, x1f, y0f, y1f = template.question_row_bbox_frac(question_number)
        x0, y0 = template.frac_to_canon_px((x0f, y0f))
        x1, y1 = template.frac_to_canon_px((x1f, y1f))
        crop = warped[round(y0) : round(y1), round(x0) : round(x1)]
        _, buffer = cv2.imencode(".png", crop)
        return buffer.tobytes()


def get_bubble_service() -> IBubbleService:
    if settings.BUBBLE_DETECTION_PROVIDER == "opencv":
        return OpenCvBubbleService(get_llm_service())
    raise ValueError(f"Unknown BUBBLE_DETECTION_PROVIDER: {settings.BUBBLE_DETECTION_PROVIDER}")
