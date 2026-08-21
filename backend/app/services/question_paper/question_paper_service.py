import re
from typing import Protocol

import pymupdf as fitz
from pydantic import BaseModel

from app.config.settings import settings
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("question_paper_service")

# Matches "Ans. :", "Ans.  :", "Ans :" etc. Answer text after it is either "d.  text"
# or "(D) text" — both formats appear in the same real sample paper. Searched (not
# anchored to the start) since a formula-heavy option can leave garbled fragments
# right after "Ans. :" before the real letter marker appears.
_ANS_MARKER_RE = re.compile(r"Ans\.?\s*:")
_ANS_LETTER_RE = re.compile(r"\(([A-Da-d])\)|\b([A-Da-d])\.\s")
_OPTIONS_RE = re.compile(r"\(A\)(.*?)\(B\)(.*?)\(C\)(.*?)\(D\)(.*)", re.DOTALL)
_QUESTION_START_RE = re.compile(r"(?m)^\s*(\d+)\.\s*")


class ParsedQuestion(BaseModel):
    question_number: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    image: bytes | None = None


class ParsedPaper(BaseModel):
    questions: list[ParsedQuestion]
    # Question numbers whose text didn't match the expected pattern at all — surfaced
    # so a teacher can add them manually, never silently guessed or dropped.
    unparsed_question_numbers: list[int]


class IQuestionPaperService(Protocol):
    def parse(self, pdf_bytes: bytes) -> Result[ParsedPaper, "AppError"]: ...


class TextLayerQuestionPaperService:
    """Parses a question paper by reading the PDF's own text layer — no AI, no OCR.
    Requires the PDF to have real extractable text (a scanned/photographed paper with
    no text layer will fail to parse, cleanly, rather than produce garbage); swap in
    an OCR-based implementation behind IQuestionPaperService if that's ever needed."""

    def parse(self, pdf_bytes: bytes) -> Result[ParsedPaper, "AppError"]:
        try:
            with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
                if document.page_count == 0:
                    return err(ERRORS["QUESTION_PAPER_PARSE_FAILED"])
                full_text = "".join(page.get_text("text", sort=True) + "\n" for page in document)

                starts = list(_QUESTION_START_RE.finditer(full_text))
                questions: list[ParsedQuestion] = []
                unparsed: list[int] = []
                for i, match in enumerate(starts):
                    question_number = int(match.group(1))
                    segment_end = starts[i + 1].start() if i + 1 < len(starts) else len(full_text)
                    segment = full_text[match.end() : segment_end]
                    parsed = self._parse_segment(question_number, segment)
                    if parsed is None:
                        unparsed.append(question_number)
                    else:
                        questions.append(parsed)

                self._attach_images(document, questions)
        except Exception:
            logger.exception("Error parsing question paper PDF")
            return err(ERRORS["QUESTION_PAPER_PARSE_FAILED"])

        if not questions and not unparsed:
            return err(ERRORS["QUESTION_PAPER_PARSE_FAILED"])
        return ok(ParsedPaper(questions=questions, unparsed_question_numbers=unparsed))

    def _parse_segment(self, question_number: int, segment: str) -> ParsedQuestion | None:
        parts = _ANS_MARKER_RE.split(segment, maxsplit=1)
        if len(parts) != 2:
            return None
        stem_and_options, after_ans = parts

        options_match = _OPTIONS_RE.search(stem_and_options)
        if options_match is None:
            return None
        stem = stem_and_options[: options_match.start()].strip()
        option_a, option_b, option_c, option_d = (
            g.strip().replace("\n", " ") for g in options_match.groups()
        )

        letter_match = _ANS_LETTER_RE.search(after_ans)
        if letter_match is None:
            return None
        correct_option = (letter_match.group(1) or letter_match.group(2)).upper()

        return ParsedQuestion(
            question_number=question_number,
            question_text=stem,
            option_a=option_a,
            option_b=option_b,
            option_c=option_c,
            option_d=option_d,
            correct_option=correct_option,
        )

    def _attach_images(self, document: fitz.Document, questions: list[ParsedQuestion]) -> None:
        """Finds which page each question is on and, if a page has an embedded image
        positioned between one question's stem and the next question's, attaches it —
        mutates `questions` in place. Position-based only, no OCR or layout inference."""
        stem_by_number = {q.question_number: q.question_text[:20] for q in questions}

        for page in document:
            blocks = page.get_text("blocks", sort=True)
            boundaries: list[tuple[float, int]] = []
            for question_number, stem_prefix in stem_by_number.items():
                for block in blocks:
                    if stem_prefix and stem_prefix in block[4]:
                        boundaries.append((block[1], question_number))
                        break
            if not boundaries:
                continue
            boundaries.sort()

            images = page.get_images(full=True)
            if not images:
                continue
            question_by_number = {q.question_number: q for q in questions}
            for image in images:
                xref = image[0]
                rects = page.get_image_rects(xref)
                if not rects:
                    continue
                image_y0 = rects[0].y0
                owner = None
                for i, (boundary_y, question_number) in enumerate(boundaries):
                    next_y = boundaries[i + 1][0] if i + 1 < len(boundaries) else float("inf")
                    if boundary_y <= image_y0 < next_y:
                        owner = question_number
                        break
                if owner is not None:
                    question_by_number[owner].image = document.extract_image(xref)["image"]


def get_question_paper_service() -> IQuestionPaperService:
    if settings.QUESTION_PAPER_PARSER_PROVIDER == "text_layer":
        return TextLayerQuestionPaperService()
    raise ValueError(f"Unknown QUESTION_PAPER_PARSER_PROVIDER: {settings.QUESTION_PAPER_PARSER_PROVIDER}")
