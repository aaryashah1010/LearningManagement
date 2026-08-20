import itertools
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

# Expected span between marker centers, from the template itself — used to validate a
# candidate corner assignment by shape, not by raw image position (see _assign_corners).
_MARKER_SPAN_MM = template.PAGE_WIDTH_MM - 2 * (template.MARKER_INSET_MM + template.MARKER_SIZE_MM / 2)
_MARKER_RISE_MM = template.PAGE_HEIGHT_MM - 2 * (template.MARKER_INSET_MM + template.MARKER_SIZE_MM / 2)
_EXPECTED_ASPECT = _MARKER_SPAN_MM / _MARKER_RISE_MM
_MAX_CANDIDATES_CONSIDERED = 12  # bounds permutation cost if noise produces extra squarish blobs


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


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

        markers = self._detect_corner_markers(raw)
        if markers is None:
            return err(ERRORS["CV_OCR_ERROR"])

        warped = self._deskew(raw, markers)
        ink_mask = self._threshold_to_ink_mask(warped)
        answers = self._read_bubbles(ink_mask)
        return ok(AnswerMap(answers=answers))

    def _blur_score(self, gray: np.ndarray) -> float:
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def _detect_corner_markers(self, gray: np.ndarray) -> dict[str, tuple[float, float]] | None:
        """Finds squarish candidate blobs, then assigns 4 of them to tl/tr/bl/br by
        which assignment's quadrilateral shape best matches the template's known
        marker-span aspect ratio (see _assign_corners) — not by raw image position,
        since perspective skew can shift a marker across the image's literal midpoint."""
        _, ink = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(ink, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        height, width = gray.shape
        min_area = 0.0002 * width * height
        max_area = 0.02 * width * height

        candidates: list[tuple[float, float]] = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if not (min_area <= area <= max_area):
                continue
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = w / float(h)
            if not (0.7 <= aspect_ratio <= 1.3):
                continue
            # 0.05: loose enough to collapse a blur/compression-roughened marker edge
            # into a clean quad — tighter values miss real markers under blur.
            perimeter = cv2.arcLength(contour, closed=True)
            approx = cv2.approxPolyDP(contour, epsilon=0.05 * perimeter, closed=True)
            if len(approx) != 4:
                continue

            moments = cv2.moments(contour)
            if moments["m00"] == 0:
                continue
            candidates.append((area, (moments["m10"] / moments["m00"], moments["m01"] / moments["m00"])))

        if len(candidates) < 4:
            return None
        # Cap candidate count for permutation cost; largest/cleanest blobs are the most
        # plausible real markers if more than expected squarish shapes were found.
        candidates.sort(key=lambda c: c[0], reverse=True)
        points = [point for _, point in candidates[:_MAX_CANDIDATES_CONSIDERED]]

        return self._assign_corners(points)

    def _assign_corners(self, points: list[tuple[float, float]]) -> dict[str, tuple[float, float]] | None:
        """Tries every way to assign 4 of the candidate points to tl/tr/bl/br, and
        keeps whichever assignment's quadrilateral shape (edge-length ratio, opposite
        sides roughly equal) is the closest match to the template's known aspect ratio.
        24 permutations per 4-candidate subset — cheap even with a few extra false
        positives after _MAX_CANDIDATES_CONSIDERED.

        Shape alone can't fully disambiguate orientation: a rectangle's 180-degree
        rotation or mirror has identical edge lengths and aspect ratio. The orientation
        penalty below breaks that tie by assuming the photo isn't upside-down or
        mirrored — true for any normal, right-side-up capture."""
        best: dict[str, tuple[float, float]] | None = None
        best_score = float("inf")

        for combo in itertools.permutations(points, 4):
            tl, tr, bl, br = combo
            top = _distance(tl, tr)
            bottom = _distance(bl, br)
            left = _distance(tl, bl)
            right = _distance(tr, br)
            if min(top, bottom, left, right) < 1e-6:
                continue

            avg_width = (top + bottom) / 2
            avg_height = (left + right) / 2
            aspect = avg_width / avg_height
            shape_score = (
                abs(aspect - _EXPECTED_ASPECT) / _EXPECTED_ASPECT
                + abs(top - bottom) / max(top, bottom)
                + abs(left - right) / max(left, right)
            )

            orientation_penalty = 0.0
            if (tl[1] + tr[1]) / 2 > (bl[1] + br[1]) / 2:  # "top" pair isn't above "bottom" pair
                orientation_penalty += 10.0
            if (tl[0] + bl[0]) / 2 > (tr[0] + br[0]) / 2:  # "left" pair isn't left of "right" pair
                orientation_penalty += 10.0

            score = shape_score + orientation_penalty
            if score < best_score:
                best_score = score
                best = {"tl": tl, "tr": tr, "bl": bl, "br": br}

        return best

    def _deskew(self, gray: np.ndarray, markers: dict[str, tuple[float, float]]) -> np.ndarray:
        src_points = np.float32([markers[corner] for corner in _CORNERS])
        dst_points = np.float32(
            [template.mm_to_canon_px(template.MARKER_CENTERS_MM[corner]) for corner in _CORNERS]
        )
        transform = cv2.getPerspectiveTransform(src_points, dst_points)
        return cv2.warpPerspective(gray, transform, (template.CANON_WIDTH_PX, template.CANON_HEIGHT_PX))

    def _threshold_to_ink_mask(self, warped: np.ndarray) -> np.ndarray:
        _, mask = cv2.threshold(warped, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
        return mask

    def _fill_ratio(self, ink_mask: np.ndarray, center_mm: tuple[float, float]) -> float:
        cx, cy = template.mm_to_canon_px(center_mm)
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
            ratio = self._fill_ratio(ink_mask, bubble.center_mm)
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
