from typing import Protocol

from app.database.pool import fetch_all, fetch_one
from app.models.subject import NcertBook
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("book_repository")


class IBookRepository(Protocol):
    def find_by_id(self, book_id: int) -> Result[NcertBook, AppError]: ...
    def list_by_subject(self, subject_id: int) -> Result[list[NcertBook], AppError]: ...


class BookRepositoryImpl(IBookRepository):
    def find_by_id(self, book_id: int) -> Result[NcertBook, AppError]:
        try:
            row = fetch_one("SELECT * FROM ncert_books WHERE id = %s", (book_id,))
            if row is None:
                return err(ERRORS["BOOK_NOT_FOUND"])
            return ok(NcertBook(**row))
        except Exception:
            logger.exception("Error finding book by id")
            return err(ERRORS["DATABASE_ERROR"])

    def list_by_subject(self, subject_id: int) -> Result[list[NcertBook], AppError]:
        try:
            rows = fetch_all(
                "SELECT * FROM ncert_books WHERE subject_id = %s ORDER BY grade ASC, title ASC",
                (subject_id,),
            )
            return ok([NcertBook(**r) for r in rows])
        except Exception:
            logger.exception("Error listing books by subject")
            return err(ERRORS["DATABASE_ERROR"])


BookRepository: IBookRepository = BookRepositoryImpl()
