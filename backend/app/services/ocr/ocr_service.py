import base64
import re
from typing import Protocol

import httpx

from app.config.settings import settings
from app.utils.errors import ERRORS, AppError
from app.utils.result import Result, err, ok


class IOcrService(Protocol):
    async def extract_student_name(self, header_image: bytes) -> Result[str, "AppError"]: ...


_VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate"
_NAME_LABEL_RE = re.compile(r"^name$", re.IGNORECASE)
_NEXT_LABEL_RE = re.compile(r"^std\.?$", re.IGNORECASE)


def _word_box(vertices: list[dict]) -> tuple[float, float, float, float]:
    xs = [v.get("x", 0) for v in vertices]
    ys = [v.get("y", 0) for v in vertices]
    return min(xs), max(xs), min(ys), max(ys)


class GoogleVisionOcrService:
    """Reads handwriting via Cloud Vision's plain TEXT_DETECTION. Vision has no notion
    of "the NAME field" — it only returns raw text plus a bounding box per word, so the
    name value is located by finding the "NAME" label word, then collecting whatever
    other words sit in that same row between it and the next label ("STD")."""

    async def extract_student_name(self, header_image: bytes) -> Result[str, "AppError"]:
        image_b64 = base64.b64encode(header_image).decode()
        payload = {
            "requests": [
                {"image": {"content": image_b64}, "features": [{"type": "TEXT_DETECTION"}]}
            ]
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    _VISION_ENDPOINT, params={"key": settings.VISION_API_KEY}, json=payload
                )
                response.raise_for_status()
                data = response.json()
            annotations = data["responses"][0].get("textAnnotations", [])
        except Exception:
            return err(ERRORS["OCR_SERVICE_ERROR"])

        # annotations[0] is the full block of text; each entry after it is one word.
        words = [
            (a["description"], _word_box(a["boundingPoly"]["vertices"])) for a in annotations[1:]
        ]
        name = self._name_from_words(words)
        if not name:
            return err(ERRORS["OCR_SERVICE_ERROR"])
        return ok(name)

    def _name_from_words(self, words: list[tuple[str, tuple[float, float, float, float]]]) -> str | None:
        name_label = next((box for text, box in words if _NAME_LABEL_RE.match(text)), None)
        if name_label is None:
            return None
        _, name_x1, name_y0, name_y1 = name_label
        row_center = (name_y0 + name_y1) / 2

        next_label = next(
            (box for text, box in words if _NEXT_LABEL_RE.match(text) and box[0] > name_x1),
            None,
        )
        right_bound = next_label[0] if next_label else float("inf")

        name_words = sorted(
            (
                (x0, text)
                for text, (x0, x1, y0, y1) in words
                if name_x1 < x0 < right_bound and y0 < row_center < y1
            ),
            key=lambda item: item[0],
        )
        name = " ".join(text for _, text in name_words).strip()
        return name or None


def get_ocr_service() -> IOcrService:
    if settings.OCR_PROVIDER == "google_vision":
        return GoogleVisionOcrService()
    raise ValueError(f"Unknown OCR_PROVIDER: {settings.OCR_PROVIDER}")
