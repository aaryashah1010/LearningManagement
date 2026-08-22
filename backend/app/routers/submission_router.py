from fastapi import APIRouter, Depends, Query, UploadFile
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_teacher_or_admin, get_current_user
from app.models.question import Question
from app.models.submission import (
    AssignStudentRequest,
    CreateAnswerData,
    SubmissionStatus,
    UpdateAnswerRequest,
)
from app.repositories.class_repository import ClassRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.test_repository import TestRepository
from app.services.bubble.bubble_service import IBubbleService, get_bubble_service
from app.services.ocr.ocr_service import IOcrService, get_ocr_service
from app.services.pdf.pdf_service import split_pdf_to_page_images
from app.services.storage.storage_service import IStorageService, get_storage_service
from app.types.token import TokenData
from app.utils.errors import ERRORS
from app.utils.logger import get_logger
from app.utils.responses import error_response, success_response
from app.utils.scoping import ensure_class_assigned_or_admin

router = APIRouter(tags=["submissions"])
logger = get_logger("submission_router")


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


async def _process_page(
    *,
    test_id: int,
    page_number: int,
    page_image: bytes,
    question_by_number: dict[int, Question],
    student_id_by_name: dict[str, int],
    bubble: IBubbleService,
    ocr: IOcrService,
    storage: IStorageService,
) -> None:
    """Best-effort per page — one bad sheet in the batch shouldn't fail the rest.
    Always lands as a 'pending' draft (regardless of match/confidence outcome) for the
    teacher to review — nothing is final until POST .../submissions/save."""
    bubble_result = await bubble.detect_bubbles(page_image, test_id)
    name_crop_result = await bubble.extract_name_region(page_image)

    raw_name: str | None = None
    student_id: int | None = None
    if name_crop_result.is_ok():
        name_result = await ocr.extract_student_name(name_crop_result.value)
        if name_result.is_ok():
            raw_name = name_result.value
            student_id = student_id_by_name.get(_normalize_name(raw_name))

    upload_result = await storage.upload(
        page_image, f"submissions/test-{test_id}/page-{page_number}.png", "image/png"
    )
    if upload_result.is_err():
        logger.warning("Storage upload failed for test %s page %s", test_id, page_number)
        return
    image_url = upload_result.value

    answers: list[CreateAnswerData] = []
    if bubble_result.is_ok():
        for answer in bubble_result.value.answers:
            question = question_by_number.get(answer.question_number)
            if question is None:
                continue  # sheet has more rows than this test has questions — expected
            is_correct = (
                None if answer.needs_review else answer.selected_option == question.correct_option
            )
            answers.append(
                CreateAnswerData(
                    question_id=question.id,
                    extracted_answer=answer.selected_option,
                    is_correct=is_correct,
                    needs_review=answer.needs_review,
                )
            )

    create_result = SubmissionRepository.create_with_answers(
        test_id, student_id, image_url, raw_name, answers
    )
    if create_result.is_err():
        logger.warning(
            "Failed to store submission for test %s page %s: %s",
            test_id,
            page_number,
            create_result.error.message,
        )


@router.post("/api/tests/{test_id}/submissions/bulk")
async def upload_bulk_submissions(
    test_id: int,
    file: UploadFile,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
    bubble: IBubbleService = Depends(get_bubble_service),
    ocr: IOcrService = Depends(get_ocr_service),
    storage: IStorageService = Depends(get_storage_service),
) -> JSONResponse:
    test_result = TestRepository.find_by_id(test_id)
    if test_result.is_err():
        return _err(test_result.error)
    test = test_result.value
    scoped = ensure_class_assigned_or_admin(test.class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)

    if file.content_type != "application/pdf":
        return _err(ERRORS["INVALID_FILE_TYPE"])
    pdf_bytes = await file.read()

    pages_result = split_pdf_to_page_images(pdf_bytes)
    if pages_result.is_err():
        return _err(pages_result.error)

    questions_result = TestRepository.list_questions(test_id)
    if questions_result.is_err():
        return _err(questions_result.error)
    question_by_number = {q.question_number: q for q in questions_result.value}

    roster_result = ClassRepository.list_all_enrollments(test.class_id)
    if roster_result.is_err():
        return _err(roster_result.error)
    student_id_by_name = {_normalize_name(s.name): s.id for s in roster_result.value}

    for page_number, page_image in enumerate(pages_result.value, start=1):
        await _process_page(
            test_id=test_id,
            page_number=page_number,
            page_image=page_image,
            question_by_number=question_by_number,
            student_id_by_name=student_id_by_name,
            bubble=bubble,
            ocr=ocr,
            storage=storage,
        )

    return JSONResponse(
        status_code=201,
        content=success_response(
            {"pages_processed": len(pages_result.value)}, "Bulk submission uploaded — pending review"
        ),
    )


@router.get("/api/tests/{test_id}/submissions")
async def list_submissions(
    test_id: int,
    status: SubmissionStatus | None = Query(default=None),
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    test_result = TestRepository.find_by_id(test_id)
    if test_result.is_err():
        return _err(test_result.error)
    scoped = ensure_class_assigned_or_admin(test_result.value.class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)

    result = SubmissionRepository.list_for_test(test_id, status)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=200, content=success_response([s.model_dump(mode="json") for s in result.value])
    )


def _ensure_submission_test(submission_id: int):
    """Fetches the submission and its parent test together — most submission routes
    need both (the submission itself, and the test's class_id for scoping)."""
    submission_result = SubmissionRepository.find_by_id(submission_id)
    if submission_result.is_err():
        return submission_result, None
    test_result = TestRepository.find_by_id(submission_result.value.test_id)
    if test_result.is_err():
        return test_result, None
    return submission_result, test_result.value


@router.get("/api/submissions/{submission_id}")
async def get_submission(
    submission_id: int, current_user: TokenData = Depends(get_current_user)
) -> JSONResponse:
    submission_result, test = _ensure_submission_test(submission_id)
    if submission_result.is_err():
        return _err(submission_result.error)
    submission = submission_result.value

    if current_user.role == "student":
        if submission.student_id != current_user.id:
            return _err(ERRORS["FORBIDDEN"])
    else:
        scoped = ensure_class_assigned_or_admin(test.class_id, current_user)
        if scoped.is_err():
            return _err(scoped.error)

    answers_result = SubmissionRepository.list_answers(submission_id)
    if answers_result.is_err():
        return _err(answers_result.error)
    questions_result = TestRepository.list_questions(test.id)
    if questions_result.is_err():
        return _err(questions_result.error)
    question_by_id = {q.id: q for q in questions_result.value}

    answers = []
    for answer in answers_result.value:
        question = question_by_id.get(answer.question_id)
        answers.append(
            {
                **answer.model_dump(mode="json"),
                "question_number": question.question_number if question else None,
                "correct_option": question.correct_option if question else None,
            }
        )

    body = submission.model_dump(mode="json")
    body["answers"] = answers
    return JSONResponse(status_code=200, content=success_response(body))


@router.put("/api/submissions/{submission_id}/answers/{question_id}")
async def update_submission_answer(
    submission_id: int,
    question_id: int,
    body: UpdateAnswerRequest,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    submission_result, test = _ensure_submission_test(submission_id)
    if submission_result.is_err():
        return _err(submission_result.error)
    scoped = ensure_class_assigned_or_admin(test.class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)

    question_result = TestRepository.find_question(question_id)
    if question_result.is_err():
        return _err(question_result.error)
    if question_result.value.test_id != test.id:
        return _err(ERRORS["ANSWER_NOT_FOUND"])

    is_correct = (
        body.selected_option == question_result.value.correct_option
        if body.selected_option is not None
        else False
    )
    result = SubmissionRepository.update_answer(submission_id, question_id, body.selected_option, is_correct)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=200,
        content=success_response(result.value.model_dump(mode="json"), "Answer updated"),
    )


@router.patch("/api/submissions/{submission_id}/student")
async def assign_submission_student(
    submission_id: int,
    body: AssignStudentRequest,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    submission_result, test = _ensure_submission_test(submission_id)
    if submission_result.is_err():
        return _err(submission_result.error)
    scoped = ensure_class_assigned_or_admin(test.class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)

    enrolled_result = ClassRepository.is_enrolled(test.class_id, body.student_id)
    if enrolled_result.is_err():
        return _err(enrolled_result.error)
    if not enrolled_result.value:
        return _err(ERRORS["STUDENT_NOT_IN_CLASS"])

    result = SubmissionRepository.assign_student(submission_id, body.student_id, body.raw_extracted_name)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(
        status_code=200,
        content=success_response(result.value.model_dump(mode="json"), "Student assigned"),
    )


@router.post("/api/tests/{test_id}/submissions/save")
async def save_submissions(
    test_id: int, current_user: TokenData = Depends(get_current_teacher_or_admin)
) -> JSONResponse:
    test_result = TestRepository.find_by_id(test_id)
    if test_result.is_err():
        return _err(test_result.error)
    scoped = ensure_class_assigned_or_admin(test_result.value.class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)

    result = SubmissionRepository.save_pending_for_test(test_id)
    if result.is_err():
        return _err(result.error)
    return JSONResponse(status_code=200, content=success_response(result.value, "Submissions saved"))
