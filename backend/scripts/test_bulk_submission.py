"""
Dev utility — run a full bulk-submission PDF through the pipeline (split, bubble
detection, name OCR, optional roster matching), no app/DB needed.

Usage:
    uv run python scripts/test_bulk_submission.py path/to/bulk.pdf [roster.txt]

roster.txt is optional — one student name per line, used to simulate matching.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.bubble.bubble_service import OpenCvBubbleService  # noqa: E402
from app.services.llm.llm_service import get_llm_service  # noqa: E402
from app.services.ocr.ocr_service import get_ocr_service  # noqa: E402
from app.services.pdf.pdf_service import split_pdf_to_page_images  # noqa: E402


def normalize_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


async def main() -> None:
    if len(sys.argv) not in (2, 3):
        print("Usage: uv run python scripts/test_bulk_submission.py path/to/bulk.pdf [roster.txt]")
        sys.exit(1)

    pdf_bytes = Path(sys.argv[1]).read_bytes()
    student_id_by_name = {}
    if len(sys.argv) == 3:
        names = Path(sys.argv[2]).read_text().splitlines()
        student_id_by_name = {normalize_name(n): i + 1 for i, n in enumerate(names) if n.strip()}

    pages_result = split_pdf_to_page_images(pdf_bytes)
    if pages_result.is_err():
        print(f"PDF SPLIT FAILED: {pages_result.error.message}")
        return

    bubble = OpenCvBubbleService(get_llm_service())
    ocr = get_ocr_service()

    for page_number, page_image in enumerate(pages_result.value, start=1):
        print(f"\n--- Page {page_number} ---")

        bubble_result = await bubble.detect_bubbles(page_image, test_id=1)
        if bubble_result.is_err():
            print(f"  BUBBLE DETECTION FAILED: {bubble_result.error.message}")
        else:
            flagged = [a for a in bubble_result.value.answers if a.needs_review]
            print(f"  Bubbles: {len(bubble_result.value.answers)} read, {len(flagged)} needs_review")
            for a in flagged:
                print(f"    Q{a.question_number}: {a.selected_option}  <- needs review")

        name_crop_result = await bubble.extract_name_region(page_image)
        if name_crop_result.is_err():
            print(f"  NAME CROP FAILED: {name_crop_result.error.message}")
            continue

        name_result = await ocr.extract_student_name(name_crop_result.value)
        if name_result.is_err():
            print(f"  NAME OCR FAILED: {name_result.error.message}")
            continue

        raw_name = name_result.value
        if student_id_by_name:
            student_id = student_id_by_name.get(normalize_name(raw_name))
            match = f"student_id={student_id}" if student_id else "UNMATCHED"
        else:
            match = "no roster given"
        print(f"  Name: {raw_name!r} -> {match}")


if __name__ == "__main__":
    asyncio.run(main())
