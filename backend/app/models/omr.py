from pydantic import BaseModel


class QuestionAnswer(BaseModel):
    question_number: int
    selected_option: str | None  # None when no bubble was confidently read
    needs_review: bool


class AnswerMap(BaseModel):
    answers: list[QuestionAnswer]
