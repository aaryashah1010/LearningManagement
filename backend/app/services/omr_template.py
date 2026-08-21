"""
Static geometry for the official OMR sheet ("ATTITUDE CLASSES FOR EXCELLENCE - OMR",
see omr-extraction-strategy.md § The template). This is a third-party sheet design,
not one this project authored, so there's no print spec to read exact dimensions
from — positions here are fractions of the detected outer table border, measured
from a scanned sample sheet, not absolute mm. Still a single fixed config read once
and reused for every submission, never discovered per photo.
"""

from dataclasses import dataclass

# Canonical size the deskewed table region is warped to, matching the sampled
# sheet's near-square table aspect ratio.
CANON_WIDTH_PX = 1000
CANON_HEIGHT_PX = 1007

# Row bands, as fractions of the table height. Above DATA_ROWS_TOP_FRAC is the
# title row, NAME/STD row, SUB/DATE row, and A/B/C/D header row — none of that is
# read by this pipeline (student identity comes from the app session, not OCR).
DATA_ROWS_TOP_FRAC = 0.1312
DATA_ROWS_BOTTOM_FRAC = 0.9657
ROWS_PER_BLOCK = 25
ROW_HEIGHT_FRAC = (DATA_ROWS_BOTTOM_FRAC - DATA_ROWS_TOP_FRAC) / ROWS_PER_BLOCK

QUESTIONS_PER_ROW = ("A", "B", "C", "D")

# The sheet is one table split into two equal-width blocks (Q1-25 left, Q26-50
# right), each block laid out as 5 equal-width columns: question-number, then
# A/B/C/D. Measured directly off the canonical warped table (not the raw scan —
# the printed circles' own ring edges create phantom density peaks that threw off
# an earlier measurement against the unwarped photo).
BLOCK_WIDTH_FRAC = 0.5
BLOCK_X_FRACS = (0.0, BLOCK_WIDTH_FRAC)
LABEL_WIDTH_FRAC_OF_BLOCK = 0.2
OPTION_WIDTH_FRAC_OF_BLOCK = (1 - LABEL_WIDTH_FRAC_OF_BLOCK) / len(QUESTIONS_PER_ROW)


@dataclass(frozen=True)
class BubblePosition:
    question_number: int
    option: str
    center_frac: tuple[float, float]  # (x, y) as a fraction of the canonical table size


def _option_x_offsets_frac() -> list[float]:
    # Offsets are fractions of a block's own width, not the whole table — scale by
    # BLOCK_WIDTH_FRAC before adding to a block's starting x fraction.
    return [
        (LABEL_WIDTH_FRAC_OF_BLOCK + (i + 0.5) * OPTION_WIDTH_FRAC_OF_BLOCK) * BLOCK_WIDTH_FRAC
        for i in range(len(QUESTIONS_PER_ROW))
    ]


def _block_bubbles(block_x_frac: float, first_question: int) -> list[BubblePosition]:
    x_offsets = _option_x_offsets_frac()
    bubbles = []
    for row in range(ROWS_PER_BLOCK):
        question_number = first_question + row
        y_frac = DATA_ROWS_TOP_FRAC + (row + 0.5) * ROW_HEIGHT_FRAC
        for option, x_offset in zip(QUESTIONS_PER_ROW, x_offsets, strict=True):
            bubbles.append(
                BubblePosition(
                    question_number=question_number,
                    option=option,
                    center_frac=(block_x_frac + x_offset, y_frac),
                )
            )
    return bubbles


# All 50 questions' bubble centers, as fractions of the canonical table — the single
# source of truth for the fill-reading code. Never discovered from a photo.
TEMPLATE_BUBBLES: list[BubblePosition] = _block_bubbles(BLOCK_X_FRACS[0], 1) + _block_bubbles(
    BLOCK_X_FRACS[1], ROWS_PER_BLOCK + 1
)


def frac_to_canon_px(point_frac: tuple[float, float]) -> tuple[float, float]:
    x_frac, y_frac = point_frac
    return (x_frac * CANON_WIDTH_PX, y_frac * CANON_HEIGHT_PX)


# Sized off row height (not a printed bubble diameter, since we don't have one) —
# large enough to comfortably sit inside a hand-drawn circle without reaching its
# printed outline.
BUBBLE_RADIUS_PX = round(0.35 * ROW_HEIGHT_FRAC * CANON_HEIGHT_PX)
