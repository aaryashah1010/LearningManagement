from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_student, get_current_teacher_or_admin
from app.models.llm import QuestionToMap
from app.models.question import BulkQuestionsRequest, CreateQuestionData, SetQuestionNodeRequest
from app.models.test import CreateTestData
from app.repositories.curriculum_node_repository import CurriculumNodeRepository
from app.repositories.test_repository import TestRepository
from app.services.llm.llm_service import ILlmService, get_llm_service
from app.services.question_paper.question_paper_service import (
    IQuestionPaperService,
    get_question_paper_service,
)
from app.services.storage.storage_service import IStorageService, get_storage_service
from app.types.token import TokenData
from app.utils.errors import ERRORS
from app.utils.logger import get_logger
from app.utils.responses import error_response, success_response
from app.utils.scoping import ensure_class_assigned_or_admin

router = APIRouter(tags=["tests"])
logger = get_logger("test_router")


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


async def _auto_map_questions(
    test_id: int,
    book_id: int,
    llm: ILlmService,
    images_by_question_number: dict[int, bytes] | None = None,
) -> None:
    """Best-effort — question creation already succeeded regardless of this outcome.
    A teacher can always map (or fix) a question's node manually via the PUT endpoint.
    images_by_question_number carries a question's diagram, if it has one — the stem
    alone can be too vague to classify without seeing it (e.g. "study the given ray
    diagram and select the correct statement" names no topic in words at all)."""
    taxonomy_result = CurriculumNodeRepository.list_flat(book_id)
    if taxonomy_result.is_err() or not taxonomy_result.value:
        return
    questions_result = TestRepository.list_questions(test_id)
    if questions_result.is_err() or not questions_result.value:
        return

    images_by_question_number = images_by_question_number or {}
    questions = [
        QuestionToMap(
            question_id=q.id,
            question_text=q.question_text,
            image=images_by_question_number.get(q.question_number),
        )
        for q in questions_result.value
    ]
    mapping_result = await llm.map_questions_to_nodes(questions, taxonomy_result.value)
    if mapping_result.is_err():
        logger.warning("Auto node-mapping failed for test %s: %s", test_id, mapping_result.error.message)
        return
    for mapping in mapping_result.value:
        TestRepository.set_node_mapping(mapping.question_id, mapping.node_id)


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


@router.get("/api/students/{student_id}/tests")
async def list_tests_for_student(
    student_id: int, current_user: TokenData = Depends(get_current_student)
) -> JSONResponse:
    if current_user.id != student_id:
        return _err(ERRORS["FORBIDDEN"])
    result = TestRepository.list_published_for_student(student_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=200, content=success_response([t.model_dump(mode="json") for t in result.value])
    )


@router.post("/api/tests/{test_id}/questions/bulk")
async def create_questions_bulk(
    test_id: int,
    body: BulkQuestionsRequest,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
    llm: ILlmService = Depends(get_llm_service),
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

    await _auto_map_questions(test_id, test.book_id, llm)

    return JSONResponse(
        status_code=201,
        content=success_response(
            [q.model_dump(mode="json") for q in result.value], "Questions created successfully"
        ),
    )


@router.post("/api/tests/{test_id}/questions/upload")
async def upload_question_paper(
    test_id: int,
    file: UploadFile,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
    llm: ILlmService = Depends(get_llm_service),
    storage: IStorageService = Depends(get_storage_service),
    question_paper: IQuestionPaperService = Depends(get_question_paper_service),
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    test = scoped.value
    if test.setup_path != "uploaded_pdf":
        return _err(ERRORS["TEST_SETUP_PATH_MISMATCH"])
    if test.published_at is not None:
        return _err(ERRORS["TEST_ALREADY_PUBLISHED"])

    if file.content_type != "application/pdf":
        return _err(ERRORS["INVALID_FILE_TYPE"])
    pdf_bytes = await file.read()

    parsed_result = question_paper.parse(pdf_bytes)
    if parsed_result.is_err():
        return _err(parsed_result.error)
    parsed = parsed_result.value

    questions_to_create: list[CreateQuestionData] = []
    images_by_question_number: dict[int, bytes] = {}
    for question in parsed.questions:
        image_url = None
        if question.image is not None:
            images_by_question_number[question.question_number] = question.image
            key = f"questions/test-{test_id}/q{question.question_number}.png"
            upload_result = await storage.upload(question.image, key, "image/png")
            if upload_result.is_ok():
                image_url = upload_result.value
            else:
                logger.warning(
                    "Failed to upload image for test %s question %s: %s",
                    test_id,
                    question.question_number,
                    upload_result.error.message,
                )
        questions_to_create.append(
            CreateQuestionData(
                question_number=question.question_number,
                question_text=question.question_text,
                correct_option=question.correct_option,
                option_a=question.option_a,
                option_b=question.option_b,
                option_c=question.option_c,
                option_d=question.option_d,
                image_url=image_url,
            )
        )

    result = TestRepository.create_questions_bulk(test_id, questions_to_create)
    if result.is_err():
        return _err(result.error)

    await _auto_map_questions(test_id, test.book_id, llm, images_by_question_number)

    return JSONResponse(
        status_code=201,
        content=success_response(
            {
                "questions": [q.model_dump(mode="json") for q in result.value],
                "unparsed_question_numbers": parsed.unparsed_question_numbers,
            },
            "Question paper uploaded"
            + (
                f" — {len(parsed.unparsed_question_numbers)} question(s) need manual entry"
                if parsed.unparsed_question_numbers
                else ""
            ),
        ),
    )


@router.get("/api/tests/{test_id}/questions")
async def list_questions(
    test_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    test = scoped.value

    questions_result = TestRepository.list_questions(test_id)
    if questions_result.is_err():
        return _err(questions_result.error)
    mapping_result = TestRepository.get_node_mapping_for_test(test_id)
    if mapping_result.is_err():
        return _err(mapping_result.error)
    taxonomy_result = CurriculumNodeRepository.list_flat(test.book_id)
    if taxonomy_result.is_err():
        return _err(taxonomy_result.error)
    path_by_node_id = {node.id: node.path for node in taxonomy_result.value}

    data = []
    for question in questions_result.value:
        body = question.model_dump(mode="json")
        node_id = mapping_result.value.get(question.id)
        body["node"] = {"id": node_id, "path": path_by_node_id.get(node_id)} if node_id is not None else None
        data.append(body)
    return JSONResponse(status_code=200, content=success_response(data))


@router.put("/api/tests/{test_id}/questions/{question_id}/node")
async def set_question_node(
    test_id: int,
    question_id: int,
    body: SetQuestionNodeRequest,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    test = scoped.value
    if test.published_at is not None:
        return _err(ERRORS["TEST_ALREADY_PUBLISHED"])

    question_result = TestRepository.find_question(question_id)
    if question_result.is_err():
        return _err(question_result.error)
    if question_result.value.test_id != test_id:
        return _err(ERRORS["QUESTION_NOT_FOUND"])

    node_result = CurriculumNodeRepository.find_by_id(body.node_id)
    if node_result.is_err():
        return _err(node_result.error)
    if node_result.value.book_id != test.book_id:
        return _err(ERRORS["NODE_NOT_IN_BOOK_SCOPE"])

    result = TestRepository.set_node_mapping(question_id, body.node_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(None, "Question node updated"))


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
