from typing import Literal

from pydantic import BaseModel


class TokenData(BaseModel):
    id: int
    role: Literal["admin", "teacher", "student"]
    email: str
