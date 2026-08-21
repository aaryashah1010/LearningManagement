from typing import Protocol

from mysql.connector.errors import IntegrityError

from app.database.pool import execute, fetch_all, fetch_one, transaction
from app.models.submission import Answer, CreateAnswerData, Submission, SubmissionStatus
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("submission_repository")


class _DuplicateSubmission(Exception):
    pass


class ISubmissionRepository(Protocol):
    def create_with_answers(
        self,
        test_id: int,
        student_id: int | None,
        image_url: str,
        raw_extracted_name: str | None,
        status: SubmissionStatus,
        answers: list[CreateAnswerData],
    ) -> Result[Submission, AppError]: ...
    def find_by_id(self, submission_id: int) -> Result[Submission, AppError]: ...
    def list_for_test(self, test_id: int) -> Result[list[Submission], AppError]: ...
    def list_answers(self, submission_id: int) -> Result[list[Answer], AppError]: ...
    def assign_student(self, submission_id: int, student_id: int) -> Result[Submission, AppError]: ...


class SubmissionRepositoryImpl(ISubmissionRepository):
    def create_with_answers(
        self,
        test_id: int,
        student_id: int | None,
        image_url: str,
        raw_extracted_name: str | None,
        status: SubmissionStatus,
        answers: list[CreateAnswerData],
    ) -> Result[Submission, AppError]:
        try:
            with transaction() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO submissions "
                        "(test_id, student_id, image_url, raw_extracted_name, status) "
                        "VALUES (%s, %s, %s, %s, %s)",
                        (test_id, student_id, image_url, raw_extracted_name, status),
                    )
                except IntegrityError as exc:
                    raise _DuplicateSubmission from exc
                submission_id = cursor.lastrowid
                for answer in answers:
                    cursor.execute(
                        "INSERT INTO answers "
                        "(submission_id, question_id, extracted_answer, is_correct, needs_review) "
                        "VALUES (%s, %s, %s, %s, %s)",
                        (
                            submission_id,
                            answer.question_id,
                            answer.extracted_answer,
                            answer.is_correct,
                            answer.needs_review,
                        ),
                    )
            return self.find_by_id(submission_id)
        except _DuplicateSubmission:
            return err(ERRORS["DUPLICATE_SUBMISSION"])
        except Exception:
            logger.exception("Error creating submission with answers")
            return err(ERRORS["DATABASE_ERROR"])

    def find_by_id(self, submission_id: int) -> Result[Submission, AppError]:
        try:
            row = fetch_one("SELECT * FROM submissions WHERE id = %s", (submission_id,))
            if row is None:
                return err(ERRORS["SUBMISSION_NOT_FOUND"])
            return ok(Submission(**row))
        except Exception:
            logger.exception("Error finding submission by id")
            return err(ERRORS["DATABASE_ERROR"])

    def list_for_test(self, test_id: int) -> Result[list[Submission], AppError]:
        try:
            rows = fetch_all(
                "SELECT * FROM submissions WHERE test_id = %s ORDER BY id ASC",
                (test_id,),
            )
            return ok([Submission(**r) for r in rows])
        except Exception:
            logger.exception("Error listing submissions for test")
            return err(ERRORS["DATABASE_ERROR"])

    def list_answers(self, submission_id: int) -> Result[list[Answer], AppError]:
        try:
            rows = fetch_all(
                "SELECT * FROM answers WHERE submission_id = %s ORDER BY question_id ASC",
                (submission_id,),
            )
            return ok([Answer(**r) for r in rows])
        except Exception:
            logger.exception("Error listing answers for submission")
            return err(ERRORS["DATABASE_ERROR"])

    def assign_student(self, submission_id: int, student_id: int) -> Result[Submission, AppError]:
        answers_result = self.list_answers(submission_id)
        if answers_result.is_err():
            return err(answers_result.error)
        # Assigning the student resolves the "who is this" half of needs_review, but a
        # submission with an ambiguous bubble read still needs that half resolved too.
        status: SubmissionStatus = (
            "needs_review" if any(a.needs_review for a in answers_result.value) else "processed"
        )
        try:
            execute(
                "UPDATE submissions SET student_id = %s, status = %s WHERE id = %s",
                (student_id, status, submission_id),
            )
        except IntegrityError:
            return err(ERRORS["DUPLICATE_SUBMISSION"])
        except Exception:
            logger.exception("Error assigning student to submission")
            return err(ERRORS["DATABASE_ERROR"])
        return self.find_by_id(submission_id)


SubmissionRepository: ISubmissionRepository = SubmissionRepositoryImpl()
