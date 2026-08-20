from typing import Protocol

from mysql.connector.errors import IntegrityError

from app.database.pool import execute, fetch_all, fetch_one, transaction
from app.models.question import CreateQuestionData, Question
from app.models.test import Test, TestSetupPath
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("test_repository")


class _DuplicateQuestionNumber(Exception):
    pass


class ITestRepository(Protocol):
    def create(
        self, class_id: int, book_id: int, title: str, setup_path: TestSetupPath
    ) -> Result[Test, AppError]: ...
    def find_by_id(self, test_id: int) -> Result[Test, AppError]: ...
    def list_for_class(self, class_id: int) -> Result[list[Test], AppError]: ...
    def create_questions_bulk(
        self, test_id: int, questions: list[CreateQuestionData]
    ) -> Result[list[Question], AppError]: ...
    def list_questions(self, test_id: int) -> Result[list[Question], AppError]: ...
    def publish(self, test_id: int) -> Result[None, AppError]: ...


class TestRepositoryImpl(ITestRepository):
    def create(
        self, class_id: int, book_id: int, title: str, setup_path: TestSetupPath
    ) -> Result[Test, AppError]:
        try:
            class_row = fetch_one("SELECT id FROM classes WHERE id = %s", (class_id,))
            if class_row is None:
                return err(ERRORS["CLASS_NOT_FOUND"])
            book_row = fetch_one("SELECT id FROM ncert_books WHERE id = %s", (book_id,))
            if book_row is None:
                return err(ERRORS["BOOK_NOT_FOUND"])
            new_id = execute(
                "INSERT INTO tests (class_id, book_id, title, setup_path) VALUES (%s, %s, %s, %s)",
                (class_id, book_id, title, setup_path),
            )
            return self.find_by_id(new_id)
        except Exception:
            logger.exception("Error creating test")
            return err(ERRORS["DATABASE_ERROR"])

    def find_by_id(self, test_id: int) -> Result[Test, AppError]:
        try:
            row = fetch_one("SELECT * FROM tests WHERE id = %s", (test_id,))
            if row is None:
                return err(ERRORS["TEST_NOT_FOUND"])
            return ok(Test(**row))
        except Exception:
            logger.exception("Error finding test by id")
            return err(ERRORS["DATABASE_ERROR"])

    def list_for_class(self, class_id: int) -> Result[list[Test], AppError]:
        try:
            rows = fetch_all(
                "SELECT * FROM tests WHERE class_id = %s ORDER BY id DESC",
                (class_id,),
            )
            return ok([Test(**r) for r in rows])
        except Exception:
            logger.exception("Error listing tests for class")
            return err(ERRORS["DATABASE_ERROR"])

    def create_questions_bulk(
        self, test_id: int, questions: list[CreateQuestionData]
    ) -> Result[list[Question], AppError]:
        try:
            with transaction() as conn:
                cursor = conn.cursor()
                for q in questions:
                    try:
                        cursor.execute(
                            "INSERT INTO questions "
                            "(test_id, question_number, question_text, correct_option, max_marks) "
                            "VALUES (%s, %s, %s, %s, %s)",
                            (test_id, q.question_number, q.question_text, q.correct_option, q.max_marks),
                        )
                    except IntegrityError as exc:
                        raise _DuplicateQuestionNumber from exc
            return self.list_questions(test_id)
        except _DuplicateQuestionNumber:
            return err(ERRORS["DUPLICATE_QUESTION_NUMBER"])
        except Exception:
            logger.exception("Error bulk-creating questions")
            return err(ERRORS["DATABASE_ERROR"])

    def list_questions(self, test_id: int) -> Result[list[Question], AppError]:
        try:
            rows = fetch_all(
                "SELECT * FROM questions WHERE test_id = %s ORDER BY question_number ASC",
                (test_id,),
            )
            return ok([Question(**r) for r in rows])
        except Exception:
            logger.exception("Error listing questions")
            return err(ERRORS["DATABASE_ERROR"])

    def publish(self, test_id: int) -> Result[None, AppError]:
        try:
            execute(
                "UPDATE tests SET published_at = CURRENT_TIMESTAMP WHERE id = %s",
                (test_id,),
            )
            return ok(None)
        except Exception:
            logger.exception("Error publishing test")
            return err(ERRORS["DATABASE_ERROR"])


TestRepository: ITestRepository = TestRepositoryImpl()
