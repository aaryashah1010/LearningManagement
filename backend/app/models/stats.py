from pydantic import BaseModel


class EnrollmentTrendPoint(BaseModel):
    label: str
    count: int


class ClassRosterRow(BaseModel):
    class_id: int
    name: str
    teacher_names: list[str]
    enrolled_count: int


class AdminStats(BaseModel):
    teachers_count: int
    students_count: int
    classes_count: int
    unassigned_classes_count: int
    enrollment_trend: list[EnrollmentTrendPoint]
    class_roster: list[ClassRosterRow]


class TeacherStats(BaseModel):
    classes_count: int
    published_tests_count: int
    needs_review_submissions_count: int
    average_accuracy_percent: float | None
