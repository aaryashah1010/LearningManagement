from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class Student(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    date_of_birth: date
    password_hash: str
    created_at: datetime


class StudentView(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None


class CreateStudentData(BaseModel):
    name: str
    date_of_birth: date
    email: str | None = None
    phone: str | None = None

    @model_validator(mode="after")
    def require_email_or_phone(self) -> "CreateStudentData":
        if not self.email and not self.phone:
            raise ValueError("At least one of email or phone is required")
        return self


class BulkStudentsRequest(BaseModel):
    class_id: int
    students: list[CreateStudentData] = Field(min_length=1)


class StudentLoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str


def to_student_view(student: Student) -> StudentView:
    return StudentView(id=student.id, name=student.name, email=student.email, phone=student.phone)
