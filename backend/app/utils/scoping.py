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
