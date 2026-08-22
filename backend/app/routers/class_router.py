from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_admin, get_current_teacher_or_admin
from app.models.class_ import AssignTeacherRequest, CreateClassData, TransferEnrollmentRequest
from app.repositories.class_repository import ClassRepository
from app.types.token import TokenData
from app.utils.responses import error_response, success_response
from app.utils.scoping import ensure_class_assigned_or_admin

router = APIRouter(prefix="/api/classes", tags=["classes"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.post("/")
async def create_class(
    body: CreateClassData, current_admin: TokenData = Depends(get_current_admin)
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
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    if current_user.role == "admin":
        result = ClassRepository.list_all(cursor, limit)
    else:
        result = ClassRepository.list_assigned_classes(current_user.id, cursor, limit)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value))


@router.get("/{class_id}")
async def get_class(
    class_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = ensure_class_assigned_or_admin(class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
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
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    scoped = ensure_class_assigned_or_admin(class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    result = ClassRepository.list_enrollments(class_id, cursor, limit)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value))


@router.patch("/{class_id}/enrollments/{student_id}")
async def transfer_enrollment(
    class_id: int,
    student_id: int,
    body: TransferEnrollmentRequest,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    scoped_source = ensure_class_assigned_or_admin(class_id, current_user)
    if scoped_source.is_err():
        return _err(scoped_source.error)
    scoped_dest = ensure_class_assigned_or_admin(body.new_class_id, current_user)
    if scoped_dest.is_err():
        return _err(scoped_dest.error)
    result = ClassRepository.transfer_enrollment(class_id, body.new_class_id, student_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Student moved to new class"))


@router.delete("/{class_id}/enrollments/{student_id}")
async def remove_enrollment(
    class_id: int, student_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = ensure_class_assigned_or_admin(class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    result = ClassRepository.remove_enrollment(class_id, student_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Student removed from class"))


@router.post("/{class_id}/teachers")
async def assign_teacher(
    class_id: int, body: AssignTeacherRequest, current_admin: TokenData = Depends(get_current_admin)
) -> JSONResponse:
    class_result = ClassRepository.find_by_id(class_id)
    if class_result.is_err():
        return _err(class_result.error)
    result = ClassRepository.assign_teacher(class_id, body.teacher_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Teacher assigned to class"))


@router.delete("/{class_id}/teachers/{teacher_id}")
async def unassign_teacher(
    class_id: int, teacher_id: int, current_admin: TokenData = Depends(get_current_admin)
) -> JSONResponse:
    result = ClassRepository.unassign_teacher(class_id, teacher_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Teacher unassigned from class"))
