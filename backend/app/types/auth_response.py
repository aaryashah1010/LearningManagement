from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class LoginResponse(BaseModel, Generic[T]):
    user: T
    auth_token: str
    refresh_token: str
