from pydantic import BaseModel


class TaxonomyNode(BaseModel):
    id: int
    path: str


class QuestionToMap(BaseModel):
    question_id: int
    question_text: str
    # Set only for questions with an associated diagram — the stem alone can be too
    # vague to classify (e.g. "study the ray diagram and select the correct statement"
    # names no topic at all without seeing which diagram it actually is).
    image: bytes | None = None


class NodeMapping(BaseModel):
    question_id: int
    node_id: int
    reasoning: str


class BubbleJudgment(BaseModel):
    question_number: int
    selected_option: str | None
    confidence: float
