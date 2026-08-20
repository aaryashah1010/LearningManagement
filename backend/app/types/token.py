from typing import Literal

from pydantic import BaseModel


class TokenData(BaseModel):
    id: int
    role: Literal["teacher", "student"]
    email: str
