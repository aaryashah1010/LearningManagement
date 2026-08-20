from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.responses import error_response, error_response_from

logger = get_logger("error_handlers")


def register_error_handlers(app: FastAPI) -> None:
    """Safety nets only — routers return error_response() directly and never raise."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=error_response_from(exc))

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "success" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        if exc.status_code == 404:
            error = ERRORS["ROUTE_NOT_FOUND"]
            return JSONResponse(
                status_code=error.status_code, content=error_response(error.message, error.code)
            )
        return JSONResponse(status_code=exc.status_code, content=error_response(str(exc.detail)))

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        error = ERRORS["VALIDATION_ERROR"]
        body = error_response(error.message, error.code)
        body["error"]["detail"] = jsonable_encoder(exc.errors())
        return JSONResponse(status_code=error.status_code, content=body)

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled error at {request.url.path}")
        error = ERRORS["UNHANDLED_ERROR"]
        return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))
