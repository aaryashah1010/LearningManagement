from datetime import datetime
from typing import Literal

from pydantic import BaseModel

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
