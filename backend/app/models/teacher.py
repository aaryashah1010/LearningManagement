from datetime import datetime
from typing import Literal

from pydantic import BaseModel

TeacherRole = Literal["teacher", "admin"]


class Teacher(BaseModel):
    id: int
    name: str
    email: str
    password_hash: str
    role: TeacherRole
    created_at: datetime


class TeacherView(BaseModel):
    id: int
    name: str
    email: str
    role: TeacherRole


class CreateTeacherData(BaseModel):
    name: str
    email: str
    password: str


class TeacherLoginRequest(BaseModel):
    email: str
    password: str


def to_teacher_view(teacher: Teacher) -> TeacherView:
    return TeacherView(id=teacher.id, name=teacher.name, email=teacher.email, role=teacher.role)
