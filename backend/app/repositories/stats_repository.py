from datetime import date
from typing import Protocol

from app.database.pool import fetch_all, fetch_one
from app.models.stats import AdminStats, ClassRosterRow, EnrollmentTrendPoint, TeacherStats
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("stats_repository")

_TREND_MONTHS = 6
# GROUP_CONCAT separator for teacher names - the ASCII unit separator (0x1f), since a
# real teacher name won't contain it, unlike a comma which legitimately could.
_NAME_SEP = "\x1f"


def _last_n_months(n: int, today: date | None = None) -> list[date]:
    today = today or date.today()
    year, month = today.year, today.month
    months: list[date] = []
    for _ in range(n):
        months.append(date(year, month, 1))
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


def _fill_monthly_trend(rows: list[dict]) -> list[EnrollmentTrendPoint]:
    counts = {r["ym"]: r["count"] for r in rows}
    return [
        EnrollmentTrendPoint(label=d.strftime("%b"), count=counts.get(d.strftime("%Y-%m"), 0))
        for d in _last_n_months(_TREND_MONTHS)
    ]


class IStatsRepository(Protocol):
    def get_admin_stats(self) -> Result[AdminStats, AppError]: ...
    def get_teacher_stats(self, teacher_id: int) -> Result[TeacherStats, AppError]: ...


class StatsRepositoryImpl(IStatsRepository):
    def get_admin_stats(self) -> Result[AdminStats, AppError]:
        try:
            teachers_row = fetch_one("SELECT COUNT(*) AS count FROM teachers WHERE role = 'teacher'")
            students_row = fetch_one("SELECT COUNT(*) AS count FROM students")
            classes_row = fetch_one("SELECT COUNT(*) AS count FROM classes")
            unassigned_row = fetch_one(
                "SELECT COUNT(*) AS count FROM classes c WHERE NOT EXISTS "
                "(SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id)"
            )

            # '%%' (not '%') for the DATE_FORMAT literals — mysql-connector-python's
            # pyformat param substitution runs a plain Python `%` format over the whole
            # query string, so a literal '%Y'/'%m' would otherwise be misread as a
            # (nonexistent) parameter placeholder.
            trend_rows = fetch_all(
                "SELECT DATE_FORMAT(created_at, '%%Y-%%m') AS ym, COUNT(*) AS count FROM students "
                "WHERE created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%%Y-%%m-01'), INTERVAL %s MONTH) "
                "GROUP BY ym ORDER BY ym ASC",
                (_TREND_MONTHS - 1,),
            )

            # DISTINCT on both joined-in columns - enrollments and teacher assignments are
            # separate one-to-many joins off the same class row, so a naive join would
            # multiply enrolled_count by the number of assigned teachers (or vice versa).
            roster_rows = fetch_all(
                "SELECT c.id AS class_id, c.name AS name, "
                "COUNT(DISTINCT e.student_id) AS enrolled_count, "
                f"GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR '{_NAME_SEP}') AS teacher_names "
                "FROM classes c "
                "LEFT JOIN class_enrollments e ON e.class_id = c.id "
                "LEFT JOIN class_teachers ct ON ct.class_id = c.id "
                "LEFT JOIN teachers t ON t.id = ct.teacher_id "
                "GROUP BY c.id, c.name ORDER BY c.id ASC"
            )

            return ok(
                AdminStats(
                    teachers_count=teachers_row["count"],
                    students_count=students_row["count"],
                    classes_count=classes_row["count"],
                    unassigned_classes_count=unassigned_row["count"],
                    enrollment_trend=_fill_monthly_trend(trend_rows),
                    class_roster=[
                        ClassRosterRow(
                            class_id=r["class_id"],
                            name=r["name"],
                            enrolled_count=r["enrolled_count"],
                            teacher_names=r["teacher_names"].split(_NAME_SEP) if r["teacher_names"] else [],
                        )
                        for r in roster_rows
                    ],
                )
            )
        except Exception:
            logger.exception("Error fetching admin stats")
            return err(ERRORS["DATABASE_ERROR"])

    def get_teacher_stats(self, teacher_id: int) -> Result[TeacherStats, AppError]:
        try:
            classes_row = fetch_one(
                "SELECT COUNT(*) AS count FROM class_teachers WHERE teacher_id = %s", (teacher_id,)
            )
            published_row = fetch_one(
                "SELECT COUNT(*) AS count FROM tests t "
                "JOIN class_teachers ct ON ct.class_id = t.class_id "
                "WHERE ct.teacher_id = %s AND t.published_at IS NOT NULL",
                (teacher_id,),
            )
            needs_review_row = fetch_one(
                "SELECT COUNT(*) AS count FROM submissions s "
                "JOIN tests t ON t.id = s.test_id "
                "JOIN class_teachers ct ON ct.class_id = t.class_id "
                "WHERE ct.teacher_id = %s AND s.status = 'needs_review'",
                (teacher_id,),
            )
            accuracy_row = fetch_one(
                "SELECT SUM(a.is_correct) AS correct_count, COUNT(*) AS total_count FROM answers a "
                "JOIN submissions s ON s.id = a.submission_id "
                "JOIN tests t ON t.id = s.test_id "
                "JOIN class_teachers ct ON ct.class_id = t.class_id "
                "WHERE ct.teacher_id = %s AND s.status = 'processed'",
                (teacher_id,),
            )
            total = accuracy_row["total_count"] or 0
            correct = accuracy_row["correct_count"] or 0

            return ok(
                TeacherStats(
                    classes_count=classes_row["count"],
                    published_tests_count=published_row["count"],
                    needs_review_submissions_count=needs_review_row["count"],
                    average_accuracy_percent=(correct / total * 100) if total > 0 else None,
                )
            )
        except Exception:
            logger.exception("Error fetching teacher stats")
            return err(ERRORS["DATABASE_ERROR"])


StatsRepository: IStatsRepository = StatsRepositoryImpl()
