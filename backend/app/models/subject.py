from datetime import datetime

from pydantic import BaseModel


class Subject(BaseModel):
    id: int
    name: str


class NcertBook(BaseModel):
    id: int
    subject_id: int
    title: str
    grade: str | None
    edition_year: int | None
    pdf_url: str | None
    created_at: datetime
