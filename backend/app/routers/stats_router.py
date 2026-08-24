from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_admin, get_current_teacher
from app.repositories.stats_repository import StatsRepository
from app.types.token import TokenData
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.get("/admin")
async def get_admin_stats(current_admin: TokenData = Depends(get_current_admin)) -> JSONResponse:
    result = StatsRepository.get_admin_stats()
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value.model_dump(mode="json")))


@router.get("/teacher")
async def get_teacher_stats(current_teacher: TokenData = Depends(get_current_teacher)) -> JSONResponse:
    result = StatsRepository.get_teacher_stats(current_teacher.id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value.model_dump(mode="json")))
