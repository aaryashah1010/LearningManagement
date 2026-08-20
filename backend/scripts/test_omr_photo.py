"""
Dev utility — run a real photo through OpenCvOcrService directly, no app/DB needed.

Usage:
    uv run python scripts/test_omr_photo.py path/to/photo.jpg
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.cv_ocr_service import OpenCvOcrService  # noqa: E402


async def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: uv run python scripts/test_omr_photo.py path/to/photo.jpg")
        sys.exit(1)

    image_path = Path(sys.argv[1])
    image_bytes = image_path.read_bytes()

    service = OpenCvOcrService()
    result = await service.detect_bubbles(image_bytes, test_id=1)

    if result.is_err():
        print(f"EXTRACTION FAILED: {result.error.message} (code {result.error.code})")
        return

    for answer in result.value.answers:
        flag = "  <- needs review" if answer.needs_review else ""
        print(f"Q{answer.question_number}: {answer.selected_option}{flag}")


if __name__ == "__main__":
    asyncio.run(main())
