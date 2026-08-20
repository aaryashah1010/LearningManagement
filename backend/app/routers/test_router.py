from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_teacher_or_admin
from app.models.question import BulkQuestionsRequest
from app.models.test import CreateTestData
from app.repositories.test_repository import TestRepository
from app.types.token import TokenData
from app.utils.errors import ERRORS
from app.utils.responses import error_response, success_response
from app.utils.scoping import ensure_class_assigned_or_admin

router = APIRouter(tags=["tests"])


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


def _ensure_test_scoped(test_id: int, current_user: TokenData):
    test_result = TestRepository.find_by_id(test_id)
    if test_result.is_err():
        return test_result
    scoped = ensure_class_assigned_or_admin(test_result.value.class_id, current_user)
    if scoped.is_err():
        return scoped
    return test_result


@router.post("/api/classes/{class_id}/tests")
async def create_test(
    class_id: int, body: CreateTestData, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = ensure_class_assigned_or_admin(class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    result = TestRepository.create(class_id, body.book_id, body.title, body.setup_path)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=201,
        content=success_response(result.value.model_dump(mode="json"), "Test created successfully"),
    )


@router.get("/api/classes/{class_id}/tests")
async def list_tests(
    class_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = ensure_class_assigned_or_admin(class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    result = TestRepository.list_for_class(class_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=200, content=success_response([t.model_dump(mode="json") for t in result.value])
    )


@router.get("/api/tests/{test_id}")
async def get_test(
    test_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    return JSONResponse(status_code=200, content=success_response(scoped.value.model_dump(mode="json")))


@router.post("/api/tests/{test_id}/questions/bulk")
async def create_questions_bulk(
    test_id: int, body: BulkQuestionsRequest, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    test = scoped.value
    if test.setup_path != "in_app":
        return _err(ERRORS["TEST_SETUP_PATH_MISMATCH"])
    if test.published_at is not None:
        return _err(ERRORS["TEST_ALREADY_PUBLISHED"])

    result = TestRepository.create_questions_bulk(test_id, body.questions)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=201,
        content=success_response(
            [q.model_dump(mode="json") for q in result.value], "Questions created successfully"
        ),
    )


@router.get("/api/tests/{test_id}/questions")
async def list_questions(
    test_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    result = TestRepository.list_questions(test_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=200, content=success_response([q.model_dump(mode="json") for q in result.value])
    )


@router.post("/api/tests/{test_id}/publish")
async def publish_test(
    test_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    if scoped.value.published_at is not None:
        return _err(ERRORS["TEST_ALREADY_PUBLISHED"])

    result = TestRepository.publish(test_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Test published"))
