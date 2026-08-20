from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_teacher
from app.models.class_ import CreateClassData, TransferEnrollmentRequest
from app.repositories.class_repository import ClassRepository
from app.types.token import TokenData
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/classes", tags=["classes"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.post("/")
async def create_class(
    body: CreateClassData, current_teacher: TokenData = Depends(get_current_teacher)
) -> JSONResponse:
    result = ClassRepository.create(body.name)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=201,
        content=success_response(result.value.model_dump(mode="json"), "Class created successfully"),
    )


@router.get("/")
async def list_classes(
    cursor: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_teacher: TokenData = Depends(get_current_teacher),
) -> JSONResponse:
    result = ClassRepository.list_all(cursor, limit)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value))


@router.get("/{class_id}")
async def get_class(class_id: int, current_teacher: TokenData = Depends(get_current_teacher)) -> JSONResponse:
    detail_result = ClassRepository.detail(class_id)
    if detail_result.is_err():
        return _err(detail_result.error)
    body = detail_result.value.model_dump(mode="json")
    return JSONResponse(status_code=200, content=success_response(body))


@router.get("/{class_id}/enrollments")
async def list_enrollments(
    class_id: int,
    cursor: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_teacher: TokenData = Depends(get_current_teacher),
) -> JSONResponse:
    result = ClassRepository.list_enrollments(class_id, cursor, limit)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value))


@router.patch("/{class_id}/enrollments/{student_id}")
async def transfer_enrollment(
    class_id: int,
    student_id: int,
    body: TransferEnrollmentRequest,
    current_teacher: TokenData = Depends(get_current_teacher),
) -> JSONResponse:
    dest_result = ClassRepository.find_by_id(body.new_class_id)
    if dest_result.is_err():
        return _err(dest_result.error)
    result = ClassRepository.transfer_enrollment(class_id, body.new_class_id, student_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Student moved to new class"))


@router.delete("/{class_id}/enrollments/{student_id}")
async def remove_enrollment(
    class_id: int, student_id: int, current_teacher: TokenData = Depends(get_current_teacher)
) -> JSONResponse:
    result = ClassRepository.remove_enrollment(class_id, student_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Student removed from class"))
