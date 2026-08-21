from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config.settings import settings
from app.database.pool import connect_to_database
from app.middleware.error_handlers import register_error_handlers
from app.middleware.rate_limit import limiter
from app.routers import (
    accounts_router,
    auth_router,
    book_router,
    class_router,
    health_router,
    subject_router,
    submission_router,
    test_router,
)
from app.utils.errors import ERRORS
from app.utils.responses import error_response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await connect_to_database()  # app never starts serving requests until this succeeds
    yield


app = FastAPI(title="Learning Management API", lifespan=lifespan)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    error = ERRORS["TOO_MANY_REQUESTS"]
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


app.include_router(health_router.router, prefix="/api")
app.include_router(auth_router.router)
app.include_router(accounts_router.router)
app.include_router(class_router.router)
app.include_router(subject_router.router)
app.include_router(book_router.router)
app.include_router(test_router.router)
app.include_router(submission_router.router)
