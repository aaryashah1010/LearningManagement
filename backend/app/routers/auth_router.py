from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_user
from app.models.student import StudentLoginRequest, to_student_view
from app.models.teacher import TeacherLoginRequest, to_teacher_view
from app.repositories.student_repository import StudentRepository
from app.repositories.teacher_repository import TeacherRepository
from app.types.auth_response import ChangePasswordRequest, LoginResponse, RefreshTokenRequest
from app.types.token import TokenData
from app.utils.errors import ERRORS
from app.utils.jwt import create_auth_token, create_refresh_token, decode_refresh_token
from app.utils.password import hash_password, verify_password
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


@router.post("/teacher/login")
async def teacher_login(body: TeacherLoginRequest) -> JSONResponse:
    result = TeacherRepository.find_by_email(body.email)
    if result.is_err() or not verify_password(body.password, result.value.password_hash):
        return _err(ERRORS["INVALID_CREDENTIALS"])
    teacher = result.value
    token_data = TokenData(id=teacher.id, role="teacher", email=teacher.email)
    payload = LoginResponse(
        user=to_teacher_view(teacher),
        auth_token=create_auth_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )
    return JSONResponse(status_code=200, content=success_response(payload.model_dump(), "Login successful"))


@router.post("/student/login")
async def student_login(body: StudentLoginRequest) -> JSONResponse:
    result = StudentRepository.find_by_email_or_phone(body.identifier, body.identifier)
    if result.is_err() or not verify_password(body.password, result.value.password_hash):
        return _err(ERRORS["INVALID_CREDENTIALS"])
    student = result.value
    token_data = TokenData(id=student.id, role="student", email=student.email or "")
    payload = LoginResponse(
        user=to_student_view(student),
        auth_token=create_auth_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )
    return JSONResponse(status_code=200, content=success_response(payload.model_dump(), "Login successful"))


@router.post("/refresh-token")
async def refresh_token(body: RefreshTokenRequest) -> JSONResponse:
    result = decode_refresh_token(body.refresh_token)
    if result.is_err():
        return _err(ERRORS["INVALID_REFRESH_TOKEN"])
    token_data = result.value
    new_auth_token = create_auth_token(token_data)
    return JSONResponse(status_code=200, content=success_response({"auth_token": new_auth_token}))


@router.patch("/password")
async def change_password(
    body: ChangePasswordRequest, current_user: TokenData = Depends(get_current_user)
) -> JSONResponse:
    repo: Literal["teacher", "student"] = current_user.role
    account_result = (
        TeacherRepository.find_by_id(current_user.id)
        if repo == "teacher"
        else StudentRepository.find_by_id(current_user.id)
    )
    if account_result.is_err():
        return _err(account_result.error)
    account = account_result.value
    if not verify_password(body.current_password, account.password_hash):
        return _err(ERRORS["INCORRECT_CURRENT_PASSWORD"])

    new_hash = hash_password(body.new_password)
    update_result = (
        TeacherRepository.update_password_hash(current_user.id, new_hash)
        if repo == "teacher"
        else StudentRepository.update_password_hash(current_user.id, new_hash)
    )
    if update_result.is_err():
        return _err(update_result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Password updated successfully"))
