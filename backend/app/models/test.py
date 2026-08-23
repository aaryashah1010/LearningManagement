from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.models.submission import SubmissionStatus

TestSetupPath = Literal["in_app", "uploaded_pdf"]


class Test(BaseModel):
    id: int
    class_id: int
    book_id: int
    title: str
    setup_path: TestSetupPath
    source_pdf_url: str | None
    published_at: datetime | None
    created_at: datetime


class CreateTestData(BaseModel):
    book_id: int
    title: str
    setup_path: TestSetupPath


class StudentTestSummary(BaseModel):
    """One published test plus the requesting student's own submission for it (if
    any) — powers the student Tests list without a second per-test request. Mirrors
    app/repositories/report_repository.py's correct_count/total_count shape, computed
    from whatever answers exist rather than a stored score column."""

    id: int
    class_id: int
    book_id: int
    title: str
    published_at: datetime
    submission_id: int | None
    submission_status: SubmissionStatus | None
    correct_count: int | None
    total_count: int | None
