"""
Static geometry for the one fixed OMR sheet template (omr-extraction-strategy.md).
Every number here is the same one the printed sheet was designed from — this is not
discovered per photo, it's read once and reused for every submission.
"""

from dataclasses import dataclass

# Canonical resolution the deskewed image is warped to. 150 DPI is plenty for bubble
# fill-ratio measurement (bubbles are ~5mm, i.e. ~30px at this scale) without the
# memory/compute cost of a full-resolution warp.
DPI = 150
PX_PER_MM = DPI / 25.4

PAGE_WIDTH_MM = 210.0
PAGE_HEIGHT_MM = 297.0
CANON_WIDTH_PX = round(PAGE_WIDTH_MM * PX_PER_MM)
CANON_HEIGHT_PX = round(PAGE_HEIGHT_MM * PX_PER_MM)

MARKER_SIZE_MM = 10.0
MARKER_INSET_MM = 8.0

# Marker *centers* in mm — used as the canonical target points for the homography.
MARKER_CENTERS_MM: dict[str, tuple[float, float]] = {
    "tl": (MARKER_INSET_MM + MARKER_SIZE_MM / 2, MARKER_INSET_MM + MARKER_SIZE_MM / 2),
    "tr": (
        PAGE_WIDTH_MM - MARKER_INSET_MM - MARKER_SIZE_MM / 2,
        MARKER_INSET_MM + MARKER_SIZE_MM / 2,
    ),
    "bl": (
        MARKER_INSET_MM + MARKER_SIZE_MM / 2,
        PAGE_HEIGHT_MM - MARKER_INSET_MM - MARKER_SIZE_MM / 2,
    ),
    "br": (
        PAGE_WIDTH_MM - MARKER_INSET_MM - MARKER_SIZE_MM / 2,
        PAGE_HEIGHT_MM - MARKER_INSET_MM - MARKER_SIZE_MM / 2,
    ),
}

GRID_TOP_MM = 58.0
COL_HEAD_HEIGHT_MM = 6.0
ROW_HEIGHT_MM = 8.36
ROWS_PER_COLUMN = 25
QUESTIONS_PER_ROW = ("A", "B", "C", "D")

LEFT_COL_X_MM = 12.0
RIGHT_COL_X_MM = 112.0
LABEL_WIDTH_MM = 12.0
BUBBLE_CELL_MM = 16.0
BUBBLE_DIAMETER_MM = 5.0


@dataclass(frozen=True)
class BubblePosition:
    question_number: int
    option: str
    center_mm: tuple[float, float]


def _bubble_x_offsets_mm() -> list[float]:
    # Bubbles sit centered in their 16mm cell, cells start right after the label column.
    return [LABEL_WIDTH_MM + (i + 0.5) * BUBBLE_CELL_MM for i in range(len(QUESTIONS_PER_ROW))]


def _column_bubbles(col_x_mm: float, first_question: int) -> list[BubblePosition]:
    x_offsets = _bubble_x_offsets_mm()
    data_top_mm = GRID_TOP_MM + COL_HEAD_HEIGHT_MM
    bubbles = []
    for row in range(ROWS_PER_COLUMN):
        question_number = first_question + row
        y_mm = data_top_mm + (row + 0.5) * ROW_HEIGHT_MM
        for option, x_offset in zip(QUESTIONS_PER_ROW, x_offsets, strict=True):
            bubbles.append(
                BubblePosition(
                    question_number=question_number,
                    option=option,
                    center_mm=(col_x_mm + x_offset, y_mm),
                )
            )
    return bubbles


# All 50 questions' bubble centers, in mm — the single source of truth for both the
# printed sheet and the fill-reading code. Never discovered from a photo.
TEMPLATE_BUBBLES: list[BubblePosition] = _column_bubbles(LEFT_COL_X_MM, 1) + _column_bubbles(
    RIGHT_COL_X_MM, ROWS_PER_COLUMN + 1
)


def mm_to_canon_px(point_mm: tuple[float, float]) -> tuple[float, float]:
    x_mm, y_mm = point_mm
    return (x_mm * PX_PER_MM, y_mm * PX_PER_MM)


BUBBLE_RADIUS_PX = round((BUBBLE_DIAMETER_MM / 2) * PX_PER_MM)
