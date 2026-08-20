from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_user
from app.repositories.book_repository import BookRepository
from app.repositories.subject_repository import SubjectRepository
from app.types.token import TokenData
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/subjects", tags=["subjects"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.get("/")
async def list_subjects(current_user: TokenData = Depends(get_current_user)) -> JSONResponse:
    result = SubjectRepository.list_all()
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response([s.model_dump() for s in result.value]))


@router.get("/{subject_id}/books")
async def list_books(subject_id: int, current_user: TokenData = Depends(get_current_user)) -> JSONResponse:
    subject_result = SubjectRepository.find_by_id(subject_id)
    if subject_result.is_err():
        return _err(subject_result.error)
    result = BookRepository.list_by_subject(subject_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=200,
        content=success_response([b.model_dump(mode="json") for b in result.value]),
    )
