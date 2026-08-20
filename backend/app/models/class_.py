from datetime import datetime

from pydantic import BaseModel


class Class(BaseModel):
    id: int
    name: str
    created_at: datetime


class CreateClassData(BaseModel):
    name: str


class ClassDetail(BaseModel):
    id: int
    name: str
    created_at: datetime
    enrollment_count: int


class TransferEnrollmentRequest(BaseModel):
    new_class_id: int


class AssignTeacherRequest(BaseModel):
    teacher_id: int
