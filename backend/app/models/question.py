from pydantic import BaseModel, field_validator, model_validator

CORRECT_OPTIONS = {"A", "B", "C", "D"}


class Question(BaseModel):
    id: int
    test_id: int
    question_number: int
    question_text: str
    max_marks: float
    correct_option: str


class CreateQuestionData(BaseModel):
    question_number: int
    question_text: str
    correct_option: str
    max_marks: float = 1.00

    @field_validator("correct_option")
    @classmethod
    def validate_correct_option(cls, value: str) -> str:
        upper = value.upper()
        if upper not in CORRECT_OPTIONS:
            raise ValueError("correct_option must be one of A, B, C, D")
        return upper


class BulkQuestionsRequest(BaseModel):
    questions: list[CreateQuestionData]

    @model_validator(mode="after")
    def validate_unique_question_numbers(self) -> "BulkQuestionsRequest":
        numbers = [q.question_number for q in self.questions]
        if len(numbers) != len(set(numbers)):
            raise ValueError("question_number must be unique within the batch")
        return self


class SetQuestionNodeRequest(BaseModel):
    node_id: int
