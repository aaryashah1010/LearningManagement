from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException

from app.types.pagination import Paginated
from app.utils.errors import AppError


def _is_paginated(data: Any) -> bool:
    return isinstance(data, dict) and "data" in data and "pagination" in data


def success_response(data: Any, message: str | None = None) -> dict:
    timestamp = datetime.now(UTC).isoformat()

    if isinstance(data, Paginated):
        data = data.model_dump(mode="json")

    if _is_paginated(data):
        return {
            "success": True,
            "message": message or "Operation successful",
            "data": data["data"],
            "pagination": data["pagination"],
            "timestamp": timestamp,
        }

    return {
        "success": True,
        "message": message or "Operation successful",
        "data": data,
        "timestamp": timestamp,
    }


def error_response(message: str, code: int = 10000) -> dict:
    return {
        "success": False,
        "error": {"code": code, "message": message},
        "timestamp": datetime.now(UTC).isoformat(),
    }


def error_response_from(error: AppError) -> dict:
    return error_response(error.message, error.code)


def app_error_to_http_exception(error: AppError) -> HTTPException:
    """Only for the auth Depends() boundary, which must raise to short-circuit. Routers
    return error_response() directly instead — never raise."""
    return HTTPException(status_code=error.status_code, detail=error_response_from(error))
