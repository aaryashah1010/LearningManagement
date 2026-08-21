from pydantic import BaseModel


class TaxonomyNode(BaseModel):
    id: int
    path: str


class QuestionToMap(BaseModel):
    question_id: int
    question_text: str


class NodeMapping(BaseModel):
    question_id: int
    node_id: int
    reasoning: str


class BubbleJudgment(BaseModel):
    question_number: int
    selected_option: str | None
    confidence: float
