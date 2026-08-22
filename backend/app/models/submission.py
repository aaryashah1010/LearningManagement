from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

from app.models.question import CORRECT_OPTIONS

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
    # OCR can misread bad handwriting — lets the teacher correct the displayed text
    # itself, separate from (but usually alongside) picking the right student.
    raw_extracted_name: str | None = None


class UpdateAnswerRequest(BaseModel):
    selected_option: str | None

    @field_validator("selected_option")
    @classmethod
    def validate_selected_option(cls, value: str | None) -> str | None:
        if value is None:
            return None
        upper = value.upper()
        if upper not in CORRECT_OPTIONS:
            raise ValueError("selected_option must be one of A, B, C, D, or null")
        return upper
