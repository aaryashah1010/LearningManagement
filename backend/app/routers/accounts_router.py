from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_admin
from app.models.student import BulkStudentsRequest, to_student_view
from app.models.teacher import CreateTeacherData, to_teacher_view
from app.repositories.class_repository import ClassRepository
from app.repositories.teacher_repository import TeacherRepository
from app.types.pagination import Paginated
from app.types.token import TokenData
from app.utils.password import hash_password, password_from_dob
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.post("/teachers")
async def create_teacher(
    body: CreateTeacherData, current_admin: TokenData = Depends(get_current_admin)
) -> JSONResponse:
    result = TeacherRepository.create(body.name, body.email, hash_password(body.password))
    if result.is_err():
        return _err(result.error)
    view = to_teacher_view(result.value)
    return JSONResponse(
        status_code=201, content=success_response(view.model_dump(), "Teacher created successfully")
    )


@router.get("/teachers")
async def list_teachers(
    cursor: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    current_admin: TokenData = Depends(get_current_admin),
) -> JSONResponse:
    result = TeacherRepository.list_all(cursor, limit)
    if result.is_err():
        return _err(result.error)
    views = Paginated(
        data=[to_teacher_view(t) for t in result.value.data], pagination=result.value.pagination
    )
    return JSONResponse(status_code=200, content=success_response(views))


@router.post("/students/bulk")
async def create_students_bulk(
    body: BulkStudentsRequest, current_admin: TokenData = Depends(get_current_admin)
) -> JSONResponse:
    class_result = ClassRepository.find_by_id(body.class_id)
    if class_result.is_err():
        return _err(class_result.error)

    created = []
    failed = []
    for entry in body.students:
        password_hash = hash_password(password_from_dob(entry.date_of_birth))
        result = ClassRepository.enroll_new_or_matched_student(
            body.class_id, entry.name, entry.email, entry.phone, entry.date_of_birth, password_hash
        )
        if result.is_err():
            failed.append({"name": entry.name, "code": result.error.code, "message": result.error.message})
        else:
            created.append(to_student_view(result.value))

    return JSONResponse(
        status_code=201,
        content=success_response(
            {"created": [s.model_dump() for s in created], "failed": failed},
            "Students enrolled successfully" if not failed else "Some students could not be enrolled",
        ),
    )
