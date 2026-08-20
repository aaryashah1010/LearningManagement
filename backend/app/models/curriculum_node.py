from typing import Literal

from pydantic import BaseModel

NodeLevel = Literal["chapter", "topic", "subtopic"]


class CurriculumNode(BaseModel):
    id: int
    book_id: int
    parent_id: int | None
    level: NodeLevel
    name: str
    page_start: int | None
    page_end: int | None


class SubtopicNode(BaseModel):
    id: int
    name: str
    page_start: int | None
    page_end: int | None


class TopicNode(BaseModel):
    id: int
    name: str
    page_start: int | None
    page_end: int | None
    subtopics: list[SubtopicNode]


class ChapterNode(BaseModel):
    id: int
    name: str
    page_start: int | None
    page_end: int | None
    topics: list[TopicNode]
