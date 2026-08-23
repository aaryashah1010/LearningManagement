import json
from typing import TYPE_CHECKING, Protocol

from pydantic import BaseModel

from app.database.pool import fetch_all, fetch_one, transaction
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

if TYPE_CHECKING:
    from app.models.report import ClassReport, CumulativeReport, StudentReport

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
    def save_test_reports(
        self, class_report: "ClassReport", student_reports: list["StudentReport"]
    ) -> Result[None, AppError]: ...
    def get_class_report(self, test_id: int, class_id: int) -> Result["ClassReport", AppError]: ...
    def get_student_report(self, test_id: int, student_id: int) -> Result["StudentReport", AppError]: ...
    def get_student_reports_for_period(
        self, student_id: int, book_id: int, year: int, month: int
    ) -> Result[list["StudentReport"], AppError]: ...
    def save_cumulative_reports(self, reports: list["CumulativeReport"]) -> Result[None, AppError]: ...
    def get_cumulative_report(
        self, student_id: int, book_id: int, year: int, month: int
    ) -> Result["CumulativeReport", AppError]: ...


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

    def save_test_reports(
        self, class_report: "ClassReport", student_reports: list["StudentReport"]
    ) -> Result[None, AppError]:
        # Single transaction — a test's class report and every student's report for it
        # are regenerated together, so either all rows land or none do. Without this, a
        # failure partway through would leave some reports freshly overwritten and others
        # stale from a previous generation.
        try:
            with transaction() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO class_reports "
                    "(test_id, students_evaluated, average_score_percent, node_accuracies, "
                    "node_student_buckets, summary) VALUES (%s, %s, %s, %s, %s, %s) "
                    "ON DUPLICATE KEY UPDATE students_evaluated = VALUES(students_evaluated), "
                    "average_score_percent = VALUES(average_score_percent), "
                    "node_accuracies = VALUES(node_accuracies), "
                    "node_student_buckets = VALUES(node_student_buckets), "
                    "summary = VALUES(summary), generated_at = CURRENT_TIMESTAMP",
                    (
                        class_report.test_id,
                        class_report.students_evaluated,
                        class_report.average_score_percent,
                        json.dumps([n.model_dump(mode="json") for n in class_report.node_accuracies]),
                        json.dumps([b.model_dump(mode="json") for b in class_report.node_student_buckets]),
                        class_report.summary,
                    ),
                )
                for report in student_reports:
                    cursor.execute(
                        "INSERT INTO student_reports "
                        "(test_id, student_id, student_name, score_correct, score_total, "
                        "score_percent, node_accuracies, weak_nodes, summary) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) "
                        "ON DUPLICATE KEY UPDATE student_name = VALUES(student_name), "
                        "score_correct = VALUES(score_correct), score_total = VALUES(score_total), "
                        "score_percent = VALUES(score_percent), "
                        "node_accuracies = VALUES(node_accuracies), "
                        "weak_nodes = VALUES(weak_nodes), summary = VALUES(summary), "
                        "generated_at = CURRENT_TIMESTAMP",
                        (
                            report.test_id,
                            report.student_id,
                            report.student_name,
                            report.score_correct,
                            report.score_total,
                            report.score_percent,
                            json.dumps([n.model_dump(mode="json") for n in report.node_accuracies]),
                            json.dumps([n.model_dump(mode="json") for n in report.weak_nodes]),
                            report.summary,
                        ),
                    )
            return ok(None)
        except Exception:
            logger.exception("Error saving reports for test")
            return err(ERRORS["DATABASE_ERROR"])

    def get_class_report(self, test_id: int, class_id: int) -> Result["ClassReport", AppError]:
        from app.models.report import ClassReport, NodeAccuracy, StudentNodeBucket

        try:
            row = fetch_one("SELECT * FROM class_reports WHERE test_id = %s", (test_id,))
        except Exception:
            logger.exception("Error fetching class report for test")
            return err(ERRORS["DATABASE_ERROR"])
        if row is None:
            return err(ERRORS["REPORT_NOT_GENERATED"])
        return ok(
            ClassReport(
                class_id=class_id,
                test_id=row["test_id"],
                students_evaluated=row["students_evaluated"],
                average_score_percent=row["average_score_percent"],
                node_accuracies=[NodeAccuracy(**n) for n in json.loads(row["node_accuracies"])],
                node_student_buckets=[
                    StudentNodeBucket(**b) for b in json.loads(row["node_student_buckets"])
                ],
                summary=row["summary"],
            )
        )

    def get_student_report(self, test_id: int, student_id: int) -> Result["StudentReport", AppError]:
        from app.models.report import NodeAccuracy, StudentReport

        try:
            row = fetch_one(
                "SELECT * FROM student_reports WHERE test_id = %s AND student_id = %s",
                (test_id, student_id),
            )
        except Exception:
            logger.exception("Error fetching student report for test")
            return err(ERRORS["DATABASE_ERROR"])
        if row is None:
            return err(ERRORS["REPORT_NOT_GENERATED"])
        return ok(
            StudentReport(
                student_id=row["student_id"],
                student_name=row["student_name"],
                test_id=row["test_id"],
                score_correct=row["score_correct"],
                score_total=row["score_total"],
                score_percent=row["score_percent"],
                node_accuracies=[NodeAccuracy(**n) for n in json.loads(row["node_accuracies"])],
                weak_nodes=[NodeAccuracy(**n) for n in json.loads(row["weak_nodes"])],
                summary=row["summary"],
            )
        )

    def get_student_reports_for_period(
        self, student_id: int, book_id: int, year: int, month: int
    ) -> Result[list["StudentReport"], AppError]:
        from app.models.report import NodeAccuracy, StudentReport

        try:
            # year/month here must match report_router._cumulative_period's definition
            # of a period (currently: calendar month of tests.created_at) — that
            # function is the single place to change if the boundary ever does.
            rows = fetch_all(
                "SELECT sr.* FROM student_reports sr "
                "JOIN tests t ON t.id = sr.test_id "
                "WHERE sr.student_id = %s AND t.book_id = %s "
                "AND YEAR(t.created_at) = %s AND MONTH(t.created_at) = %s",
                (student_id, book_id, year, month),
            )
        except Exception:
            logger.exception("Error fetching student reports for period")
            return err(ERRORS["DATABASE_ERROR"])
        return ok(
            [
                StudentReport(
                    student_id=row["student_id"],
                    student_name=row["student_name"],
                    test_id=row["test_id"],
                    score_correct=row["score_correct"],
                    score_total=row["score_total"],
                    score_percent=row["score_percent"],
                    node_accuracies=[NodeAccuracy(**n) for n in json.loads(row["node_accuracies"])],
                    weak_nodes=[NodeAccuracy(**n) for n in json.loads(row["weak_nodes"])],
                    summary=row["summary"],
                )
                for row in rows
            ]
        )

    def save_cumulative_reports(self, reports: list["CumulativeReport"]) -> Result[None, AppError]:
        try:
            with transaction() as conn:
                cursor = conn.cursor()
                for report in reports:
                    cursor.execute(
                        "INSERT INTO student_cumulative_reports "
                        "(student_id, book_id, report_year, report_month, student_name, "
                        "tests_included, score_correct, score_total, score_percent, "
                        "node_accuracies, weak_nodes, summary) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) "
                        "ON DUPLICATE KEY UPDATE student_name = VALUES(student_name), "
                        "tests_included = VALUES(tests_included), "
                        "score_correct = VALUES(score_correct), score_total = VALUES(score_total), "
                        "score_percent = VALUES(score_percent), "
                        "node_accuracies = VALUES(node_accuracies), "
                        "weak_nodes = VALUES(weak_nodes), summary = VALUES(summary), "
                        "generated_at = CURRENT_TIMESTAMP",
                        (
                            report.student_id,
                            report.book_id,
                            report.report_year,
                            report.report_month,
                            report.student_name,
                            report.tests_included,
                            report.score_correct,
                            report.score_total,
                            report.score_percent,
                            json.dumps([n.model_dump(mode="json") for n in report.node_accuracies]),
                            json.dumps([n.model_dump(mode="json") for n in report.weak_nodes]),
                            report.summary,
                        ),
                    )
            return ok(None)
        except Exception:
            logger.exception("Error saving cumulative reports")
            return err(ERRORS["DATABASE_ERROR"])

    def get_cumulative_report(
        self, student_id: int, book_id: int, year: int, month: int
    ) -> Result["CumulativeReport", AppError]:
        from app.models.report import CumulativeReport, NodeAccuracy

        try:
            row = fetch_one(
                "SELECT * FROM student_cumulative_reports "
                "WHERE student_id = %s AND book_id = %s AND report_year = %s AND report_month = %s",
                (student_id, book_id, year, month),
            )
        except Exception:
            logger.exception("Error fetching cumulative report")
            return err(ERRORS["DATABASE_ERROR"])
        if row is None:
            return err(ERRORS["REPORT_NOT_GENERATED"])
        return ok(
            CumulativeReport(
                student_id=row["student_id"],
                student_name=row["student_name"],
                book_id=row["book_id"],
                report_year=row["report_year"],
                report_month=row["report_month"],
                tests_included=row["tests_included"],
                score_correct=row["score_correct"],
                score_total=row["score_total"],
                score_percent=row["score_percent"],
                node_accuracies=[NodeAccuracy(**n) for n in json.loads(row["node_accuracies"])],
                weak_nodes=[NodeAccuracy(**n) for n in json.loads(row["weak_nodes"])],
                summary=row["summary"],
            )
        )


ReportRepository: IReportRepository = ReportRepositoryImpl()
