class AppError(Exception):
    def __init__(self, message: str, code: int, status_code: int):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


#
# Error Code Domains
# ──────────────────
# 1xxxx  Common / General
# 2xxxx  Authentication & Authorization
# 3xxxx  Classes / Roster
# 4xxxx  Subjects / Books / Curriculum Taxonomy
# 5xxxx  Tests / Questions
# 6xxxx  Submissions / Grading
# 7xxxx  Reports
# 8xxxx  Files / Storage
# 9xxxx  External Services (CV / OCR / AI)
#
ERRORS: dict[str, AppError] = {
    # ─── Common (1xxxx) ──────────────────────────────────────────────────
    "DATABASE_ERROR": AppError("Database operation failed", 10001, 500),
    "VALIDATION_ERROR": AppError("Validation failed", 10002, 422),
    "RESOURCE_NOT_FOUND": AppError("Resource not found", 10003, 404),
    "UNHANDLED_ERROR": AppError("An unexpected error occurred", 10004, 500),
    "ROUTE_NOT_FOUND": AppError("Route not found", 10005, 404),
    "TOO_MANY_REQUESTS": AppError("Too many requests", 10006, 429),
    # ─── Auth (2xxxx) ────────────────────────────────────────────────────
    "NO_TOKEN_PROVIDED": AppError("No authentication token provided", 20001, 401),
    "INVALID_AUTH_TOKEN": AppError("Invalid authentication token", 20002, 401),
    "TOKEN_EXPIRED": AppError("Authentication token has expired", 20003, 401),
    "INVALID_CREDENTIALS": AppError("Invalid email/phone or password", 20004, 401),
    "FORBIDDEN": AppError("Access forbidden", 20005, 403),
    "INVALID_REFRESH_TOKEN": AppError("Invalid refresh token", 20006, 401),
    "INCORRECT_CURRENT_PASSWORD": AppError("Current password is incorrect", 20007, 401),
    # ─── Classes / Roster (3xxxx) ───────────────────────────────────────
    "CLASS_NOT_FOUND": AppError("Class not found", 30001, 404),
    "STUDENT_NOT_IN_CLASS": AppError("Student is not in this class", 30002, 404),
    "ROLL_NUMBER_TAKEN": AppError("Roll number already in use for this class", 30003, 409),
    "EMAIL_OR_PHONE_TAKEN": AppError("Email or phone is already registered for this role", 30004, 409),
    "TEACHER_NOT_FOUND": AppError("Teacher not found", 30005, 404),
    # ─── Subjects / Books / Curriculum Taxonomy (4xxxx) ─────────────────
    "BOOK_NOT_FOUND": AppError("Book not found", 40001, 404),
    "SUBJECT_NOT_FOUND": AppError("Subject not found", 40005, 404),
    "CURRICULUM_NODE_NOT_FOUND": AppError("Curriculum node not found", 40006, 404),
    # ─── Tests / Questions (5xxxx) ───────────────────────────────────────
    "TEST_NOT_FOUND": AppError("Test not found", 50001, 404),
    "TEST_ALREADY_PUBLISHED": AppError("Test is already published", 50002, 409),
    "QUESTION_PAPER_PARSE_FAILED": AppError("Could not parse the question paper PDF", 50003, 502),
    "NODE_NOT_IN_BOOK_SCOPE": AppError("Curriculum node does not belong to this test's book", 50004, 422),
    "QUESTION_NOT_FOUND": AppError("Question not found", 50005, 404),
    # ─── Submissions / Grading (6xxxx) ──────────────────────────────────
    "SUBMISSION_NOT_FOUND": AppError("Submission not found", 60001, 404),
    "DUPLICATE_SUBMISSION": AppError("A submission already exists for this student and test", 60002, 409),
    "ANSWER_NOT_FOUND": AppError("Answer not found", 60003, 404),
    # ─── Reports (7xxxx) ─────────────────────────────────────────────────
    "NO_RESULTS_YET": AppError("No graded results yet for this scope", 70001, 404),
    # ─── Files / Storage (8xxxx) ────────────────────────────────────────
    "FILE_TOO_LARGE": AppError("File is too large", 80001, 413),
    "INVALID_FILE_TYPE": AppError("Unsupported file type", 80002, 422),
    "STORAGE_UPLOAD_FAILED": AppError("Failed to upload file to storage", 80003, 502),
    # ─── External Services — CV / OCR / AI (9xxxx) ──────────────────────
    "CV_OCR_ERROR": AppError("Bubble detection failed", 90001, 502),
    "LLM_SERVICE_ERROR": AppError("AI service call failed", 90002, 502),
    "LOW_CONFIDENCE_EXTRACTION": AppError("Extraction confidence too low", 90003, 422),
    "IMAGE_TOO_BLURRY": AppError("Image is too blurry to read, please retake the photo", 90004, 422),
}


def is_app_error(error: object) -> bool:
    return isinstance(error, AppError)


def handle_unknown_error(error: Exception) -> AppError:
    if isinstance(error, AppError):
        return error
    return ERRORS["UNHANDLED_ERROR"]
