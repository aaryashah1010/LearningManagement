from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_admin
from app.models.student import BulkStudentsRequest, to_student_view
from app.models.teacher import CreateTeacherData, to_teacher_view
from app.repositories.class_repository import ClassRepository
from app.repositories.student_repository import StudentRepository
from app.repositories.teacher_repository import TeacherRepository
from app.types.token import TokenData
from app.utils.errors import ERRORS
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
    search: str | None = Query(None),
    current_admin: TokenData = Depends(get_current_admin),
) -> JSONResponse:
    result = TeacherRepository.list_all(cursor, limit, search)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value))


@router.get("/students")
async def list_students(
    cursor: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    current_admin: TokenData = Depends(get_current_admin),
) -> JSONResponse:
    result = StudentRepository.list_all(cursor, limit, search)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value))


@router.post("/students/bulk")
async def create_students_bulk(
    body: BulkStudentsRequest, current_admin: TokenData = Depends(get_current_admin)
) -> JSONResponse:
    class_result = ClassRepository.find_by_id(body.class_id)
    if class_result.is_err():
        return _err(class_result.error)

    created = []
    failed = []
    seen_emails: set[str] = set()
    seen_phones: set[str] = set()
    for entry in body.students:
        # Two rows in the same batch sharing an email/phone would both resolve to the
        # same matched-or-created student (enroll_new_or_matched_student's dedup is
        # keyed on contact, not row identity), showing that one student twice in
        # `created` with no explanation. Catch it here instead, before either row
        # reaches the database.
        if (entry.email and entry.email in seen_emails) or (entry.phone and entry.phone in seen_phones):
            error = ERRORS["EMAIL_OR_PHONE_TAKEN"]
            failed.append(
                {
                    "name": entry.name,
                    "code": error.code,
                    "message": "Duplicate email or phone within this batch",
                }
            )
            continue
        if entry.email:
            seen_emails.add(entry.email)
        if entry.phone:
            seen_phones.add(entry.phone)

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
