from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PageInfo(BaseModel):
    has_next: bool
    next_cursor: int | None


class Paginated(BaseModel, Generic[T]):
    data: list[T]
    pagination: PageInfo
