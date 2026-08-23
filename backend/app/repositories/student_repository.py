from typing import Protocol

from mysql.connector.errors import IntegrityError

from app.database.pool import execute, fetch_all, fetch_one
from app.models.student import Student, StudentView
from app.types.pagination import PageInfo, Paginated
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("student_repository")


class IStudentRepository(Protocol):
    def find_by_email_or_phone(self, email: str | None, phone: str | None) -> Result[Student, AppError]: ...
    def find_by_id(self, student_id: int) -> Result[Student, AppError]: ...
    def list_all(
        self, cursor: int | None, limit: int, search: str | None = None
    ) -> Result[Paginated[StudentView], AppError]: ...
    def create(
        self, name: str, email: str | None, phone: str | None, password_hash: str
    ) -> Result[Student, AppError]: ...
    def update_password_hash(self, student_id: int, password_hash: str) -> Result[None, AppError]: ...


class StudentRepositoryImpl(IStudentRepository):
    def find_by_email_or_phone(self, email: str | None, phone: str | None) -> Result[Student, AppError]:
        try:
            row = fetch_one(
                "SELECT * FROM students WHERE (email = %s AND email IS NOT NULL) "
                "OR (phone = %s AND phone IS NOT NULL)",
                (email, phone),
            )
            if row is None:
                return err(ERRORS["RESOURCE_NOT_FOUND"])
            return ok(Student(**row))
        except Exception:
            logger.exception("Error finding student by email/phone")
            return err(ERRORS["DATABASE_ERROR"])

    def find_by_id(self, student_id: int) -> Result[Student, AppError]:
        try:
            row = fetch_one("SELECT * FROM students WHERE id = %s", (student_id,))
            if row is None:
                return err(ERRORS["RESOURCE_NOT_FOUND"])
            return ok(Student(**row))
        except Exception:
            logger.exception("Error finding student by id")
            return err(ERRORS["DATABASE_ERROR"])

    def list_all(
        self, cursor: int | None, limit: int, search: str | None = None
    ) -> Result[Paginated[StudentView], AppError]:
        try:
            where = ["id > %s"]
            params: list = [cursor or 0]
            if search:
                where.append("name LIKE %s")
                params.append(f"%{search}%")
            params.append(limit + 1)
            rows = fetch_all(
                f"SELECT id, name, email, phone FROM students WHERE {' AND '.join(where)} "
                "ORDER BY id ASC LIMIT %s",
                tuple(params),
            )
            has_next = len(rows) > limit
            page_rows = rows[:limit]
            return ok(
                Paginated(
                    data=[StudentView(**r) for r in page_rows],
                    pagination=PageInfo(
                        has_next=has_next,
                        next_cursor=page_rows[-1]["id"] if has_next else None,
                    ),
                )
            )
        except Exception:
            logger.exception("Error listing students")
            return err(ERRORS["DATABASE_ERROR"])

    def create(
        self, name: str, email: str | None, phone: str | None, password_hash: str
    ) -> Result[Student, AppError]:
        try:
            new_id = execute(
                "INSERT INTO students (name, email, phone, password_hash) VALUES (%s, %s, %s, %s)",
                (name, email, phone, password_hash),
            )
            return self.find_by_id(new_id)
        except IntegrityError:
            return err(ERRORS["EMAIL_OR_PHONE_TAKEN"])
        except Exception:
            logger.exception("Error creating student")
            return err(ERRORS["DATABASE_ERROR"])

    def update_password_hash(self, student_id: int, password_hash: str) -> Result[None, AppError]:
        try:
            execute("UPDATE students SET password_hash = %s WHERE id = %s", (password_hash, student_id))
            return ok(None)
        except Exception:
            logger.exception("Error updating student password")
            return err(ERRORS["DATABASE_ERROR"])


StudentRepository: IStudentRepository = StudentRepositoryImpl()
