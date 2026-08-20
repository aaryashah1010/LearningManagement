from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.middleware.auth import get_current_teacher
from app.models.student import BulkStudentsRequest, to_student_view
from app.models.teacher import CreateTeacherData, to_teacher_view
from app.repositories.class_repository import ClassRepository
from app.repositories.student_repository import StudentRepository
from app.repositories.teacher_repository import TeacherRepository
from app.types.token import TokenData
from app.utils.errors import ERRORS
from app.utils.password import hash_password
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.post("/teachers")
async def create_teacher(
    body: CreateTeacherData, current_teacher: TokenData = Depends(get_current_teacher)
) -> JSONResponse:
    result = TeacherRepository.create(body.name, body.email, hash_password(body.password))
    if result.is_err():
        return _err(result.error)
    view = to_teacher_view(result.value)
    return JSONResponse(
        status_code=201, content=success_response(view.model_dump(), "Teacher created successfully")
    )


@router.post("/students/bulk")
async def create_students_bulk(
    body: BulkStudentsRequest, current_teacher: TokenData = Depends(get_current_teacher)
) -> JSONResponse:
    class_result = ClassRepository.find_by_id(body.class_id)
    if class_result.is_err():
        return _err(class_result.error)

    created = []
    for entry in body.students:
        match_result = StudentRepository.find_by_email_or_phone(entry.email, entry.phone)
        if match_result.is_ok():
            student = match_result.value
        elif match_result.error.code == ERRORS["RESOURCE_NOT_FOUND"].code:
            create_result = StudentRepository.create(
                entry.name, entry.email, entry.phone, hash_password(settings.DEFAULT_STUDENT_PASSWORD)
            )
            if create_result.is_err():
                return _err(create_result.error)
            student = create_result.value
        else:
            return _err(match_result.error)

        enroll_result = ClassRepository.enroll(body.class_id, student.id)
        if enroll_result.is_err():
            return _err(enroll_result.error)
        created.append(to_student_view(student))

    return JSONResponse(
        status_code=201,
        content=success_response([s.model_dump() for s in created], "Students enrolled successfully"),
    )
