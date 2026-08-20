from datetime import datetime

from pydantic import BaseModel, Field


class Student(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    password_hash: str
    created_at: datetime


class StudentView(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None


class CreateStudentData(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None


class BulkStudentsRequest(BaseModel):
    class_id: int
    students: list[CreateStudentData] = Field(min_length=1)


class StudentLoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str


def to_student_view(student: Student) -> StudentView:
    return StudentView(id=student.id, name=student.name, email=student.email, phone=student.phone)
