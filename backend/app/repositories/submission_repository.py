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
        answers: list[CreateAnswerData],
    ) -> Result[Submission, AppError]: ...
    def find_by_id(self, submission_id: int) -> Result[Submission, AppError]: ...
    def list_for_test(
        self, test_id: int, status: SubmissionStatus | None = None
    ) -> Result[list[Submission], AppError]: ...
    def list_answers(self, submission_id: int) -> Result[list[Answer], AppError]: ...
    def assign_student(
        self, submission_id: int, student_id: int, raw_extracted_name: str | None = None
    ) -> Result[Submission, AppError]: ...
    def update_answer(
        self, submission_id: int, question_id: int, extracted_answer: str | None, is_correct: bool
    ) -> Result[Answer, AppError]: ...
    def save_pending_for_test(self, test_id: int) -> Result[dict, AppError]: ...


class SubmissionRepositoryImpl(ISubmissionRepository):
    def _compute_status(
        self, current_status: SubmissionStatus, student_id: int | None, answers: list[Answer]
    ) -> SubmissionStatus:
        # A submission stays 'pending' (a draft awaiting the teacher's explicit Save)
        # until POST .../submissions/save finalizes it — an edit made while reviewing
        # shouldn't silently finalize it early. Once it HAS been saved (status is
        # processed/needs_review), an edit immediately recomputes the final state —
        # no second save step needed for a post-save correction.
        if current_status == "pending":
            return "pending"
        # No answers at all means extraction failed outright for this page (e.g. the
        # bubble read and its AI fallback both failed) — that's not a clean "processed"
        # any more than an unmatched student or a flagged answer is.
        needs_review = student_id is None or not answers or any(a.needs_review for a in answers)
        return "needs_review" if needs_review else "processed"

    def create_with_answers(
        self,
        test_id: int,
        student_id: int | None,
        image_url: str,
        raw_extracted_name: str | None,
        answers: list[CreateAnswerData],
    ) -> Result[Submission, AppError]:
        try:
            with transaction() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute(
                        "INSERT INTO submissions "
                        "(test_id, student_id, image_url, raw_extracted_name, status) "
                        "VALUES (%s, %s, %s, %s, 'pending')",
                        (test_id, student_id, image_url, raw_extracted_name),
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

    def list_for_test(
        self, test_id: int, status: SubmissionStatus | None = None
    ) -> Result[list[Submission], AppError]:
        try:
            if status is None:
                rows = fetch_all(
                    "SELECT * FROM submissions WHERE test_id = %s ORDER BY id ASC",
                    (test_id,),
                )
            else:
                rows = fetch_all(
                    "SELECT * FROM submissions WHERE test_id = %s AND status = %s ORDER BY id ASC",
                    (test_id, status),
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

    def assign_student(
        self, submission_id: int, student_id: int, raw_extracted_name: str | None = None
    ) -> Result[Submission, AppError]:
        current_result = self.find_by_id(submission_id)
        if current_result.is_err():
            return err(current_result.error)
        answers_result = self.list_answers(submission_id)
        if answers_result.is_err():
            return err(answers_result.error)
        # Assigning the student resolves the "who is this" half of needs_review, but a
        # submission with an ambiguous bubble read still needs that half resolved too
        # (unless it's still an unsaved draft — see _compute_status).
        status = self._compute_status(current_result.value.status, student_id, answers_result.value)
        try:
            if raw_extracted_name is not None:
                execute(
                    "UPDATE submissions SET student_id = %s, status = %s, raw_extracted_name = %s "
                    "WHERE id = %s",
                    (student_id, status, raw_extracted_name, submission_id),
                )
            else:
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

    def update_answer(
        self, submission_id: int, question_id: int, extracted_answer: str | None, is_correct: bool
    ) -> Result[Answer, AppError]:
        try:
            row = fetch_one(
                "SELECT id FROM answers WHERE submission_id = %s AND question_id = %s",
                (submission_id, question_id),
            )
            if row is None:
                return err(ERRORS["ANSWER_NOT_FOUND"])
            execute(
                "UPDATE answers SET extracted_answer = %s, is_correct = %s, "
                "needs_review = FALSE, reviewed_by_teacher = TRUE "
                "WHERE submission_id = %s AND question_id = %s",
                (extracted_answer, is_correct, submission_id, question_id),
            )
        except Exception:
            logger.exception("Error updating answer")
            return err(ERRORS["DATABASE_ERROR"])

        submission_result = self.find_by_id(submission_id)
        if submission_result.is_err():
            return err(submission_result.error)
        submission = submission_result.value
        answers_result = self.list_answers(submission_id)
        if answers_result.is_err():
            return err(answers_result.error)
        new_status = self._compute_status(submission.status, submission.student_id, answers_result.value)
        if new_status != submission.status:
            try:
                execute("UPDATE submissions SET status = %s WHERE id = %s", (new_status, submission_id))
            except Exception:
                logger.exception("Error updating submission status after answer edit")
                return err(ERRORS["DATABASE_ERROR"])

        try:
            updated_row = fetch_one(
                "SELECT * FROM answers WHERE submission_id = %s AND question_id = %s",
                (submission_id, question_id),
            )
            return ok(Answer(**updated_row))
        except Exception:
            logger.exception("Error re-fetching updated answer")
            return err(ERRORS["DATABASE_ERROR"])

    def save_pending_for_test(self, test_id: int) -> Result[dict, AppError]:
        try:
            rows = fetch_all(
                "SELECT s.id AS submission_id, s.student_id AS student_id, "
                "COUNT(a.id) AS answer_count, "
                "SUM(CASE WHEN a.needs_review THEN 1 ELSE 0 END) AS flagged_count "
                "FROM submissions s LEFT JOIN answers a ON a.submission_id = s.id "
                "WHERE s.test_id = %s AND s.status = 'pending' "
                "GROUP BY s.id, s.student_id",
                (test_id,),
            )
            processed = 0
            needs_review = 0
            with transaction() as conn:
                cursor = conn.cursor()
                for row in rows:
                    # No answers at all means extraction failed outright for this page
                    # — not a clean "processed" any more than an unmatched student or a
                    # flagged answer is (mirrors _compute_status's same rule).
                    final_status: SubmissionStatus = (
                        "needs_review"
                        if (row["student_id"] is None or row["answer_count"] == 0 or row["flagged_count"] > 0)
                        else "processed"
                    )
                    cursor.execute(
                        "UPDATE submissions SET status = %s WHERE id = %s",
                        (final_status, row["submission_id"]),
                    )
                    if final_status == "processed":
                        processed += 1
                    else:
                        needs_review += 1
            return ok({"saved": len(rows), "processed": processed, "needs_review": needs_review})
        except Exception:
            logger.exception("Error saving pending submissions for test")
            return err(ERRORS["DATABASE_ERROR"])


SubmissionRepository: ISubmissionRepository = SubmissionRepositoryImpl()
