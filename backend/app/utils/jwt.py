from datetime import UTC, datetime, timedelta
from typing import Literal

from jose import JWTError, jwt

from app.config.settings import settings
from app.types.token import TokenData
from app.utils.errors import ERRORS, AppError
from app.utils.result import Result, err, ok

ALGORITHM = "HS256"


def create_auth_token(data: TokenData) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.JWT_AUTH_TOKEN_EXPIRE_MINUTES)
    payload = {**data.model_dump(), "exp": expire, "type": "auth"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(data: TokenData) -> str:
    expire = datetime.now(UTC) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {**data.model_dump(), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm=ALGORITHM)


def _decode(
    token: str, secret: str, expected_type: Literal["auth", "refresh"]
) -> Result[TokenData, "AppError"]:
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            return err(ERRORS["INVALID_AUTH_TOKEN"])
        return ok(TokenData(id=payload["id"], role=payload["role"], email=payload["email"]))
    except JWTError:
        return err(ERRORS["INVALID_AUTH_TOKEN"])


def decode_auth_token(token: str) -> Result[TokenData, "AppError"]:
    return _decode(token, settings.JWT_SECRET, "auth")


def decode_refresh_token(token: str) -> Result[TokenData, "AppError"]:
    return _decode(token, settings.JWT_REFRESH_SECRET, "refresh")
