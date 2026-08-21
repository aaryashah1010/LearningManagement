import pymupdf as fitz

from app.utils.errors import ERRORS, AppError
from app.utils.result import Result, err, ok

# Matches the DPI validated against the OMR sample sheets in omr-extraction-strategy.md.
RENDER_DPI = 200


def split_pdf_to_page_images(pdf_bytes: bytes) -> Result[list[bytes], AppError]:
    """Renders each page of a teacher-uploaded bulk OMR PDF to a PNG image, one per
    student sheet. Not a swappable provider — there's exactly one way to rasterize a
    PDF page here, unlike the CV/LLM/storage services."""
    try:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
            if document.page_count == 0:
                return err(ERRORS["SUBMISSION_PDF_INVALID"])
            zoom = RENDER_DPI / 72
            matrix = fitz.Matrix(zoom, zoom)
            images = [page.get_pixmap(matrix=matrix).tobytes("png") for page in document]
        return ok(images)
    except Exception:
        return err(ERRORS["SUBMISSION_PDF_INVALID"])
