from typing import Protocol

from app.database.pool import execute, fetch_all, fetch_one, transaction
from app.models.class_ import Class, ClassDetail
from app.models.student import StudentView
from app.types.pagination import PageInfo, Paginated
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("class_repository")


class _NotEnrolled(Exception):
    pass


class IClassRepository(Protocol):
    def create(self, name: str) -> Result[Class, AppError]: ...
    def find_by_id(self, class_id: int) -> Result[Class, AppError]: ...
    def detail(self, class_id: int) -> Result[ClassDetail, AppError]: ...
    def list_all(self, cursor: int | None, limit: int) -> Result[Paginated[Class], AppError]: ...
    def enroll(self, class_id: int, student_id: int) -> Result[None, AppError]: ...
    def is_enrolled(self, class_id: int, student_id: int) -> Result[bool, AppError]: ...
    def remove_enrollment(self, class_id: int, student_id: int) -> Result[None, AppError]: ...
    def transfer_enrollment(
        self, from_class_id: int, to_class_id: int, student_id: int
    ) -> Result[None, AppError]: ...
    def list_enrollments(
        self, class_id: int, cursor: int | None, limit: int
    ) -> Result[Paginated[StudentView], AppError]: ...


class ClassRepositoryImpl(IClassRepository):
    def create(self, name: str) -> Result[Class, AppError]:
        try:
            new_id = execute("INSERT INTO classes (name) VALUES (%s)", (name,))
            return self.find_by_id(new_id)
        except Exception:
            logger.exception("Error creating class")
            return err(ERRORS["DATABASE_ERROR"])

    def find_by_id(self, class_id: int) -> Result[Class, AppError]:
        try:
            row = fetch_one("SELECT * FROM classes WHERE id = %s", (class_id,))
            if row is None:
                return err(ERRORS["CLASS_NOT_FOUND"])
            return ok(Class(**row))
        except Exception:
            logger.exception("Error finding class by id")
            return err(ERRORS["DATABASE_ERROR"])

    def detail(self, class_id: int) -> Result[ClassDetail, AppError]:
        try:
            row = fetch_one(
                "SELECT c.*, COUNT(e.id) AS enrollment_count FROM classes c "
                "LEFT JOIN class_enrollments e ON e.class_id = c.id "
                "WHERE c.id = %s GROUP BY c.id",
                (class_id,),
            )
            if row is None:
                return err(ERRORS["CLASS_NOT_FOUND"])
            return ok(ClassDetail(**row))
        except Exception:
            logger.exception("Error fetching class detail")
            return err(ERRORS["DATABASE_ERROR"])

    def list_all(self, cursor: int | None, limit: int) -> Result[Paginated[Class], AppError]:
        try:
            rows = fetch_all(
                "SELECT * FROM classes WHERE id > %s ORDER BY id ASC LIMIT %s",
                (cursor or 0, limit + 1),
            )
            has_next = len(rows) > limit
            page_rows = rows[:limit]
            return ok(
                Paginated(
                    data=[Class(**r) for r in page_rows],
                    pagination=PageInfo(
                        has_next=has_next,
                        next_cursor=page_rows[-1]["id"] if has_next else None,
                    ),
                )
            )
        except Exception:
            logger.exception("Error listing classes")
            return err(ERRORS["DATABASE_ERROR"])

    def enroll(self, class_id: int, student_id: int) -> Result[None, AppError]:
        try:
            already = self.is_enrolled(class_id, student_id)
            if already.is_err():
                return err(already.error)
            if already.value:
                return ok(None)
            execute(
                "INSERT INTO class_enrollments (class_id, student_id) VALUES (%s, %s)",
                (class_id, student_id),
            )
            return ok(None)
        except Exception:
            logger.exception("Error enrolling student")
            return err(ERRORS["DATABASE_ERROR"])

    def is_enrolled(self, class_id: int, student_id: int) -> Result[bool, AppError]:
        try:
            row = fetch_one(
                "SELECT id FROM class_enrollments WHERE class_id = %s AND student_id = %s",
                (class_id, student_id),
            )
            return ok(row is not None)
        except Exception:
            logger.exception("Error checking enrollment")
            return err(ERRORS["DATABASE_ERROR"])

    def remove_enrollment(self, class_id: int, student_id: int) -> Result[None, AppError]:
        try:
            row = fetch_one(
                "SELECT id FROM class_enrollments WHERE class_id = %s AND student_id = %s",
                (class_id, student_id),
            )
            if row is None:
                return err(ERRORS["STUDENT_NOT_IN_CLASS"])
            execute(
                "DELETE FROM class_enrollments WHERE class_id = %s AND student_id = %s",
                (class_id, student_id),
            )
            return ok(None)
        except Exception:
            logger.exception("Error removing enrollment")
            return err(ERRORS["DATABASE_ERROR"])

    def transfer_enrollment(
        self, from_class_id: int, to_class_id: int, student_id: int
    ) -> Result[None, AppError]:
        try:
            with transaction() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT id FROM class_enrollments WHERE class_id = %s AND student_id = %s",
                    (from_class_id, student_id),
                )
                if cursor.fetchone() is None:
                    raise _NotEnrolled
                cursor.execute(
                    "DELETE FROM class_enrollments WHERE class_id = %s AND student_id = %s",
                    (from_class_id, student_id),
                )
                cursor.execute(
                    "INSERT INTO class_enrollments (class_id, student_id) VALUES (%s, %s) "
                    "ON DUPLICATE KEY UPDATE class_id = VALUES(class_id)",
                    (to_class_id, student_id),
                )
            return ok(None)
        except _NotEnrolled:
            return err(ERRORS["STUDENT_NOT_IN_CLASS"])
        except Exception:
            logger.exception("Error transferring enrollment")
            return err(ERRORS["DATABASE_ERROR"])

    def list_enrollments(
        self, class_id: int, cursor: int | None, limit: int
    ) -> Result[Paginated[StudentView], AppError]:
        try:
            rows = fetch_all(
                "SELECT s.id, s.name, s.email, s.phone FROM students s "
                "JOIN class_enrollments e ON e.student_id = s.id "
                "WHERE e.class_id = %s AND s.id > %s ORDER BY s.id ASC LIMIT %s",
                (class_id, cursor or 0, limit + 1),
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
            logger.exception("Error listing enrollments")
            return err(ERRORS["DATABASE_ERROR"])


ClassRepository: IClassRepository = ClassRepositoryImpl()
