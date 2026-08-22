from typing import Protocol

from pydantic import BaseModel

from app.database.pool import fetch_all
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("report_repository")


class GradingCounts(BaseModel):
    pending: int
    needs_review: int
    processed: int


class NodeStudentStat(BaseModel):
    student_id: int
    student_name: str
    node_id: int
    correct_count: int
    total_count: int


class StudentScore(BaseModel):
    student_id: int
    student_name: str
    correct_count: int
    total_count: int


class IReportRepository(Protocol):
    def get_grading_counts(self, test_id: int) -> Result[GradingCounts, AppError]: ...
    def get_node_student_stats(self, test_id: int) -> Result[list[NodeStudentStat], AppError]: ...
    def get_student_scores(self, test_id: int) -> Result[list[StudentScore], AppError]: ...


class ReportRepositoryImpl(IReportRepository):
    def get_grading_counts(self, test_id: int) -> Result[GradingCounts, AppError]:
        try:
            rows = fetch_all(
                "SELECT status, COUNT(*) AS count FROM submissions WHERE test_id = %s GROUP BY status",
                (test_id,),
            )
            counts = {row["status"]: row["count"] for row in rows}
            return ok(
                GradingCounts(
                    pending=counts.get("pending", 0),
                    needs_review=counts.get("needs_review", 0),
                    processed=counts.get("processed", 0),
                )
            )
        except Exception:
            logger.exception("Error fetching grading counts for test")
            return err(ERRORS["DATABASE_ERROR"])

    def get_node_student_stats(self, test_id: int) -> Result[list[NodeStudentStat], AppError]:
        try:
            rows = fetch_all(
                "SELECT s.student_id AS student_id, st.name AS student_name, "
                "qnm.node_id AS node_id, "
                "SUM(a.is_correct) AS correct_count, COUNT(*) AS total_count "
                "FROM answers a "
                "JOIN submissions s ON s.id = a.submission_id "
                "JOIN students st ON st.id = s.student_id "
                "JOIN question_node_map qnm ON qnm.question_id = a.question_id "
                "WHERE s.test_id = %s AND s.status = 'processed' "
                "GROUP BY s.student_id, st.name, qnm.node_id",
                (test_id,),
            )
            return ok([NodeStudentStat(**row) for row in rows])
        except Exception:
            logger.exception("Error fetching node/student stats for test")
            return err(ERRORS["DATABASE_ERROR"])

    def get_student_scores(self, test_id: int) -> Result[list[StudentScore], AppError]:
        try:
            # Deliberately not joined through question_node_map — an unmapped question
            # still counts toward a student's overall score, just not toward any node's
            # accuracy breakdown.
            rows = fetch_all(
                "SELECT s.student_id AS student_id, st.name AS student_name, "
                "SUM(a.is_correct) AS correct_count, COUNT(*) AS total_count "
                "FROM answers a "
                "JOIN submissions s ON s.id = a.submission_id "
                "JOIN students st ON st.id = s.student_id "
                "WHERE s.test_id = %s AND s.status = 'processed' "
                "GROUP BY s.student_id, st.name",
                (test_id,),
            )
            return ok([StudentScore(**row) for row in rows])
        except Exception:
            logger.exception("Error fetching student scores for test")
            return err(ERRORS["DATABASE_ERROR"])


ReportRepository: IReportRepository = ReportRepositoryImpl()
