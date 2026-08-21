from typing import Protocol

from mysql.connector.errors import IntegrityError

from app.database.pool import execute, fetch_one
from app.models.teacher import Teacher
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("teacher_repository")


class ITeacherRepository(Protocol):
    def find_by_email(self, email: str) -> Result[Teacher, AppError]: ...
    def find_by_id(self, teacher_id: int) -> Result[Teacher, AppError]: ...
    def create(self, name: str, email: str, password_hash: str) -> Result[Teacher, AppError]: ...
    def update_password_hash(self, teacher_id: int, password_hash: str) -> Result[None, AppError]: ...


class TeacherRepositoryImpl(ITeacherRepository):
    def find_by_email(self, email: str) -> Result[Teacher, AppError]:
        try:
            row = fetch_one("SELECT * FROM teachers WHERE email = %s", (email,))
            if row is None:
                return err(ERRORS["RESOURCE_NOT_FOUND"])
            return ok(Teacher(**row))
        except Exception:
            logger.exception("Error finding teacher by email")
            return err(ERRORS["DATABASE_ERROR"])

    def find_by_id(self, teacher_id: int) -> Result[Teacher, AppError]:
        try:
            row = fetch_one("SELECT * FROM teachers WHERE id = %s", (teacher_id,))
            if row is None:
                return err(ERRORS["RESOURCE_NOT_FOUND"])
            return ok(Teacher(**row))
        except Exception:
            logger.exception("Error finding teacher by id")
            return err(ERRORS["DATABASE_ERROR"])

    def create(self, name: str, email: str, password_hash: str) -> Result[Teacher, AppError]:
        try:
            new_id = execute(
                "INSERT INTO teachers (name, email, password_hash) VALUES (%s, %s, %s)",
                (name, email, password_hash),
            )
            return self.find_by_id(new_id)
        except IntegrityError:
            return err(ERRORS["EMAIL_OR_PHONE_TAKEN"])
        except Exception:
            logger.exception("Error creating teacher")
            return err(ERRORS["DATABASE_ERROR"])

    def update_password_hash(self, teacher_id: int, password_hash: str) -> Result[None, AppError]:
        try:
            execute("UPDATE teachers SET password_hash = %s WHERE id = %s", (password_hash, teacher_id))
            return ok(None)
        except Exception:
            logger.exception("Error updating teacher password")
            return err(ERRORS["DATABASE_ERROR"])


TeacherRepository: ITeacherRepository = TeacherRepositoryImpl()
