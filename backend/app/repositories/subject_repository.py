from typing import Protocol

from app.database.pool import fetch_all, fetch_one
from app.models.subject import Subject
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("subject_repository")


class ISubjectRepository(Protocol):
    def find_by_id(self, subject_id: int) -> Result[Subject, AppError]: ...
    def list_all(self) -> Result[list[Subject], AppError]: ...


class SubjectRepositoryImpl(ISubjectRepository):
    def find_by_id(self, subject_id: int) -> Result[Subject, AppError]:
        try:
            row = fetch_one("SELECT * FROM subjects WHERE id = %s", (subject_id,))
            if row is None:
                return err(ERRORS["SUBJECT_NOT_FOUND"])
            return ok(Subject(**row))
        except Exception:
            logger.exception("Error finding subject by id")
            return err(ERRORS["DATABASE_ERROR"])

    def list_all(self) -> Result[list[Subject], AppError]:
        try:
            rows = fetch_all("SELECT * FROM subjects ORDER BY name ASC")
            return ok([Subject(**r) for r in rows])
        except Exception:
            logger.exception("Error listing subjects")
            return err(ERRORS["DATABASE_ERROR"])


SubjectRepository: ISubjectRepository = SubjectRepositoryImpl()
