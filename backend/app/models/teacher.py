from datetime import datetime

from pydantic import BaseModel


class Teacher(BaseModel):
    id: int
    name: str
    email: str
    password_hash: str
    created_at: datetime


class TeacherView(BaseModel):
    id: int
    name: str
    email: str


class CreateTeacherData(BaseModel):
    name: str
    email: str
    password: str


class TeacherLoginRequest(BaseModel):
    email: str
    password: str


def to_teacher_view(teacher: Teacher) -> TeacherView:
    return TeacherView(id=teacher.id, name=teacher.name, email=teacher.email)
