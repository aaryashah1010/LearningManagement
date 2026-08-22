from typing import Literal

from pydantic import BaseModel

from app.models.curriculum_node import NodeLevel

NodeVerdict = Literal["strong", "needs_practice", "weak", "insufficient_data"]


class NodeAccuracy(BaseModel):
    node_id: int
    name: str
    level: NodeLevel
    path: str
    correct_count: int
    total_count: int
    accuracy: float | None
    verdict: NodeVerdict
    page_start: int | None
    page_end: int | None


class StudentNodeBucket(BaseModel):
    node_id: int
    name: str
    path: str
    strong_count: int
    needs_practice_count: int
    weak_count: int
    insufficient_data_count: int


class StudentReport(BaseModel):
    student_id: int
    student_name: str
    test_id: int
    score_correct: int
    score_total: int
    score_percent: float | None
    node_accuracies: list[NodeAccuracy]
    weak_nodes: list[NodeAccuracy]
    summary: str | None


class ClassReport(BaseModel):
    class_id: int
    test_id: int
    students_evaluated: int
    average_score_percent: float | None
    node_accuracies: list[NodeAccuracy]
    node_student_buckets: list[StudentNodeBucket]
    summary: str | None


class TestReportResponse(BaseModel):
    class_report: ClassReport
    student_reports: list[StudentReport]
