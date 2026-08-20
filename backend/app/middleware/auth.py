from fastapi import Depends, Header

from app.types.token import TokenData
from app.utils.errors import ERRORS
from app.utils.jwt import decode_auth_token
from app.utils.responses import app_error_to_http_exception


def _get_token_data(authorization: str = Header(None)) -> TokenData:
    if not authorization or not authorization.startswith("Bearer "):
        raise app_error_to_http_exception(ERRORS["NO_TOKEN_PROVIDED"])
    token = authorization.removeprefix("Bearer ")
    result = decode_auth_token(token)
    if result.is_err():
        raise app_error_to_http_exception(result.error)
    return result.value


def get_current_user(token_data: TokenData = Depends(_get_token_data)) -> TokenData:
    return token_data


def get_current_teacher(token_data: TokenData = Depends(_get_token_data)) -> TokenData:
    if token_data.role != "teacher":
        raise app_error_to_http_exception(ERRORS["FORBIDDEN"])
    return token_data


def get_current_admin(token_data: TokenData = Depends(_get_token_data)) -> TokenData:
    if token_data.role != "admin":
        raise app_error_to_http_exception(ERRORS["FORBIDDEN"])
    return token_data


def get_current_teacher_or_admin(token_data: TokenData = Depends(_get_token_data)) -> TokenData:
    if token_data.role not in ("teacher", "admin"):
        raise app_error_to_http_exception(ERRORS["FORBIDDEN"])
    return token_data


def get_current_student(token_data: TokenData = Depends(_get_token_data)) -> TokenData:
    if token_data.role != "student":
        raise app_error_to_http_exception(ERRORS["FORBIDDEN"])
    return token_data
