from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_user
from app.repositories.book_repository import BookRepository
from app.repositories.curriculum_node_repository import CurriculumNodeRepository
from app.types.token import TokenData
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/books", tags=["books"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.get("/{book_id}/curriculum")
async def get_curriculum(book_id: int, current_user: TokenData = Depends(get_current_user)) -> JSONResponse:
    book_result = BookRepository.find_by_id(book_id)
    if book_result.is_err():
        return _err(book_result.error)
    result = CurriculumNodeRepository.get_tree(book_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response([c.model_dump() for c in result.value]))
