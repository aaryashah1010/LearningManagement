from app.repositories.class_repository import ClassRepository
from app.types.token import TokenData
from app.utils.errors import ERRORS, AppError
from app.utils.result import Result, err, ok


def ensure_class_assigned_or_admin(class_id: int, current_user: TokenData) -> Result[None, AppError]:
    if current_user.role == "admin":
        return ok(None)
    assigned = ClassRepository.is_teacher_assigned(class_id, current_user.id)
    if assigned.is_err():
        return err(assigned.error)
    if not assigned.value:
        return err(ERRORS["CLASS_NOT_FOUND"])  # don't reveal a class exists to an unassigned teacher
    return ok(None)


def ensure_shares_class_with_student_or_admin(
    student_id: int, current_user: TokenData
) -> Result[None, AppError]:
    # Unlike ensure_class_assigned_or_admin, not scoped to one class_id — for data
    # spanning whatever classes a student has been in (e.g. a cumulative report).
    if current_user.role == "admin":
        return ok(None)
    shares = ClassRepository.teacher_shares_class_with_student(current_user.id, student_id)
    if shares.is_err():
        return err(shares.error)
    if not shares.value:
        return err(ERRORS["FORBIDDEN"])
    return ok(None)
