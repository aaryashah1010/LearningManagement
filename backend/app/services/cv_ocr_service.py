from typing import Protocol

import cv2
import numpy as np

from app.config.settings import settings
from app.models.omr import AnswerMap, QuestionAnswer
from app.services import omr_template as template
from app.utils.errors import ERRORS, AppError
from app.utils.result import Result, err, ok

# Placeholder thresholds — not validated against real printed/photographed sheets yet.
# See omr-extraction-strategy.md § What still needs deciding.
FILL_THRESHOLD = 0.35  # a bubble counts as "marked" above this
CONFIDENT_BLANK_THRESHOLD = 0.10  # below this, treat as unambiguously blank — no review
AMBIGUITY_MARGIN = 0.12
# Variance of the Laplacian — the standard blur-detection proxy. Doesn't reliably catch
# directional motion blur (edges stay sharp along one axis); needs_review per question
# is the backstop for whatever slips past this.
BLUR_VARIANCE_THRESHOLD = 20.0

_CORNERS = ("tl", "tr", "bl", "br")

# The outer table border must dominate the frame to be trusted as the sheet, not
# background clutter — same idea as requiring 4 corner markers before, just applied
# to a single border contour instead.
_MIN_TABLE_AREA_FRACTION = 0.2
_CANDIDATE_CONTOURS_CONSIDERED = 10


class ICvOcrService(Protocol):
    async def detect_bubbles(self, image: bytes, test_id: int) -> Result[AnswerMap, "AppError"]: ...


class OpenCvOcrService:
    """Pure OpenCV against the one fixed sheet template (omr-extraction-strategy.md).
    No AI, no per-photo bubble discovery — positions come from omr_template.py."""

    async def detect_bubbles(self, image: bytes, test_id: int) -> Result[AnswerMap, "AppError"]:
        buffer = np.frombuffer(image, dtype=np.uint8)
        raw = cv2.imdecode(buffer, cv2.IMREAD_GRAYSCALE)
        if raw is None:
            return err(ERRORS["CV_OCR_ERROR"])

        if self._blur_score(raw) < BLUR_VARIANCE_THRESHOLD:
            return err(ERRORS["IMAGE_TOO_BLURRY"])

        corners = self._detect_table_corners(raw)
        if corners is None:
            return err(ERRORS["CV_OCR_ERROR"])

        warped = self._deskew(raw, corners)
        ink_mask = self._threshold_to_ink_mask(warped)
        answers = self._read_bubbles(ink_mask)
        return ok(AnswerMap(answers=answers))

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

        for contour in contours[:_CANDIDATE_CONTOURS_CONSIDERED]:
            area = cv2.contourArea(contour)
            if area < min_area:
                break  # sorted descending — nothing smaller is worth checking either
            perimeter = cv2.arcLength(contour, closed=True)
            approx = cv2.approxPolyDP(contour, epsilon=0.02 * perimeter, closed=True)
            if len(approx) != 4:
                continue
            return self._order_corners(approx.reshape(4, 2).astype(np.float64))

        return None

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


def get_cv_ocr_service() -> ICvOcrService:
    if settings.CV_OCR_PROVIDER == "opencv":
        return OpenCvOcrService()
    raise ValueError(f"Unknown CV_OCR_PROVIDER: {settings.CV_OCR_PROVIDER}")
