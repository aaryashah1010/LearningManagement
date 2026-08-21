from datetime import datetime
from typing import Literal

from pydantic import BaseModel

SubmissionStatus = Literal["pending", "processed", "needs_review"]


class Submission(BaseModel):
    id: int
    test_id: int
    student_id: int | None  # None when the OCR'd name didn't match anyone on the roster
    image_url: str
    raw_extracted_name: str | None
    status: SubmissionStatus
    created_at: datetime
    updated_at: datetime


class Answer(BaseModel):
    id: int
    submission_id: int
    question_id: int
    extracted_answer: str | None
    is_correct: bool | None
    needs_review: bool
    reviewed_by_teacher: bool


class CreateAnswerData(BaseModel):
    question_id: int
    extracted_answer: str | None
    is_correct: bool | None
    needs_review: bool


class AssignStudentRequest(BaseModel):
    student_id: int
