# Learning Management Backend — Code Style Guide (Python / FastAPI)

> Companion to `backend-architecture.md` (what we build — modules, endpoints, pipelines).
> This doc defines **how** code is written. Adapted from this team's Node/TS style
> (`refrence/BACKEND_GUIDE.md`) to Python — same underlying discipline (explicit
> `Result` types, no stray exceptions from business logic, interface-first services),
> different syntax.

---

## 1. Stack

FastAPI (async) · `mysql-connector-python` (async pool) or `SQLAlchemy Core` (no ORM —
see `database-design.md`, the schema is hand-written, not ORM-generated) · Pydantic v2
(request/response models + settings) · `python-jose` (JWT) · `bcrypt` (password hashing —
not `passlib[bcrypt]`, which is unmaintained and incompatible with current `bcrypt`
releases) ·
stdlib `logging` (rotating file handlers, gzip on rotate — see `app/utils/logger.py`) · `slowapi` (rate
limiting) · pytest + `pytest-asyncio` + `testcontainers` · Docker Compose (app + MySQL 8
+ any provider stubs for tests).

---

## 2. Project Structure

```
app/
├── main.py                                 # Bootstrap: middleware → routers → exception handlers
├── config/
│   └── settings.py                         # Pydantic Settings — ALL env reads (DB_*, JWT_*, LLM_PROVIDER, S3_*)
├── database/
│   ├── pool.py                             # Single MySQL connection pool (row-level tenancy — no per-tenant split)
│   ├── schema.sql                          # Full DDL — database-design.md §5 is the source of truth
│   └── seed.sql                            # Local dev seed data
├── models/
│   ├── teacher.py                          # Pydantic models: Teacher, TeacherView, CreateTeacherData
│   ├── student.py
│   ├── class_.py                           # Class, ClassEnrollment (trailing underscore — `class` is a keyword)
│   ├── subject.py                          # Subject, NcertBook
│   ├── curriculum_node.py                  # CurriculumNode, NodeLevel enum
│   ├── test_.py                            # Test, Question, QuestionNodeMap
│   ├── submission.py                       # Submission, Answer
│   └── report.py                           # NodeAccuracy, StudentReport, ClassReport — view-only, not tables
├── repositories/
│   ├── teacher_repository.py               #  + test_teacher_repository.py (testcontainers) for every repository
│   ├── student_repository.py
│   ├── class_repository.py                 # class_teachers scoping — admin bypasses it, teacher restricted to assigned classes (§ Auth & Tenancy in backend-architecture.md)
│   ├── subject_repository.py
│   ├── book_repository.py                  # ncert_books
│   ├── curriculum_node_repository.py       # curriculum_nodes read-only (developer-seeded) + the plain-join tree reads
│   ├── test_repository.py
│   ├── question_repository.py
│   ├── submission_repository.py
│   ├── answer_repository.py
│   └── report_repository.py                # read-only rollup queries
├── routers/
│   ├── auth_router.py                      # /api/auth — login, refresh-token, password
│   ├── accounts_router.py                  # /api/accounts — teacher/student account creation, separate endpoints (see accounts-and-roster.md)
│   ├── class_router.py
│   ├── subject_router.py
│   ├── book_router.py                      # curriculum taxonomy — GET only, data is developer-seeded
│   ├── test_router.py
│   ├── submission_router.py
│   └── report_router.py
├── services/
│   ├── bubble/bubble_service.py             # IBubbleService — see § Service Layer & Provider Abstraction below
│   ├── ocr/ocr_service.py                   # IOcrService — handwriting OCR, separate from bubble reading
│   ├── llm/llm_service.py                   # ILlmService
│   ├── pdf/pdf_service.py                   # splits a bulk-uploaded PDF into per-page images
│   └── storage/storage_service.py           # IStorageService
├── middleware/
│   ├── auth.py                             # get_current_admin, get_current_teacher, get_current_teacher_or_admin, get_current_student (FastAPI dependencies)
│   ├── error_handlers.py                   # exception handlers registered on the app
│   └── rate_limit.py
├── types/
│   ├── pagination.py                       # Paginated[T]
│   ├── auth_response.py                    # LoginResponse[T]
│   └── token.py                            # TokenData
└── utils/
    ├── errors.py                           # AppError + ERRORS catalog (§5 of backend-architecture.md)
    ├── responses.py                        # success_response / error_response
    ├── logger.py                           # get_logger(label) — daily-rotated, gzipped file logs + console, one shared handler set for the whole process (ported from this team's Node/Winston logging pattern)
    ├── jwt.py                              # create_auth_token / create_refresh_token / decoders
    └── result.py                           # Result[T, E] — see § The Result Pattern below
```

Root: `Dockerfile`, `docker-compose.yml` (services `mysql`, `backend`), `.env.example`, `pyproject.toml`, `pytest.ini`.

---

## 3. The Result Pattern

Same discipline as the Node projects' `neverthrow` usage — explicit success/failure values, never a stray exception surfacing from business logic. Python doesn't have `neverthrow`, so a small local wrapper does the same job:

```python
# app/utils/result.py
from dataclasses import dataclass
from typing import Generic, TypeVar, Union

T = TypeVar("T")
E = TypeVar("E")

@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T
    def is_ok(self) -> bool: return True
    def is_err(self) -> bool: return False

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E
    def is_ok(self) -> bool: return False
    def is_err(self) -> bool: return True

Result = Union[Ok[T], Err[E]]

def ok(value: T) -> Ok[T]: return Ok(value)
def err(error: E) -> Err[E]: return Err(error)
```

### Rules
1. **Repositories** always return `Result[T, AppError]`.
2. **Services** (LLM/CV/storage) always return `Result[T, AppError]`.
3. **Routers** are the only place that unwraps a `Result` into an HTTP response — match on `is_ok()`/`is_err()` and return `error_response()`/`success_response()` directly. **Never raise** for a Result-derived error — the one exception is the auth `Depends()` boundary, which structurally can't return past its own failure (see §10).
4. **Never `raise`** inside a repository or service, except a `try/except` that immediately converts to `err(...)`.
5. Propagate errors up unchanged: `result = SomeRepository.find_by_id(id); if result.is_err(): return err(result.error)`.

```python
# In a router:
from fastapi.responses import JSONResponse
from app.utils.responses import error_response, success_response

result = TestRepository.find_by_id(test_id)
if result.is_err():
    error = result.error
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))
return success_response(result.value)
```

---

## 4. Error System

**File:** `app/utils/errors.py`

```python
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
    # ─── Common (1xxxx) ──────────────────────────────────────────────
    "DATABASE_ERROR":     AppError("Database operation failed", 10001, 500),
    "VALIDATION_ERROR":   AppError("Validation failed",         10002, 422),
    "RESOURCE_NOT_FOUND": AppError("Resource not found",        10003, 404),

    # ─── Auth (2xxxx) ────────────────────────────────────────────────
    "NO_TOKEN_PROVIDED":  AppError("No authentication token provided", 20001, 401),
    "INVALID_AUTH_TOKEN": AppError("Invalid authentication token",     20002, 401),
    "TOKEN_EXPIRED":      AppError("Authentication token has expired", 20003, 401),

    # Domain-specific ranges (3xxxx–9xxxx) — see backend-architecture.md §6
    # for the full catalog (Classes/Roster, Books/Curriculum Taxonomy,
    # Tests/Questions, Submissions/Grading, Reports, Storage, External Services).
}


def handle_unknown_error(error: Exception) -> AppError:
    if isinstance(error, AppError):
        return error
    return ERRORS["UNHANDLED_ERROR"]
```

**Rules:**
- Every error is pre-defined in `ERRORS`, referenced by key — never construct `AppError(...)` inline in a router/repository/service, and never write a bare integer error code at a call site.
- `backend-architecture.md` §6 is the single source of truth for the full catalog; this file just holds the mechanism.

---

## 5. Response Helpers

**File:** `app/utils/responses.py` — always use these, never hand-build a response dict.

```python
from datetime import datetime, timezone

def success_response(data, message: str | None = None) -> dict:
    return {
        "success": True,
        "message": message or "Operation successful",
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

def error_response(message: str, code: int = 10000) -> dict:
    return {
        "success": False,
        "error": {"code": code, "message": message},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

def error_response_from(error: AppError) -> dict:
    """Convenience — the code always comes from the AppError, never typed by hand."""
    return error_response(error.message, error.code)
```

If `data` is a `Paginated[T]`, `success_response` unwraps it into top-level `data`/`pagination` keys rather than nesting the whole `Paginated` object — see `utils/responses.py`'s pagination handling for the exact check.

**Routers call these directly and return the result — they never raise for a
Result-derived error** (§10 has the full pattern and the one exception: the auth
`Depends()` boundary, which raises via `app_error_to_http_exception` — itself built from
`error_response_from`, so the JSON shape is identical whether an error came from a raise
or an explicit return).

---

## 6. Cursor Pagination

**File:** `app/types/pagination.py`

```python
from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar("T")

class PageInfo(BaseModel):
    has_next: bool
    next_cursor: int

class Paginated(BaseModel, Generic[T]):
    data: List[T]
    pagination: PageInfo
```

Same "fetch `limit + 1` rows to detect `has_next`" convention as the Node guide — every repository's `list_paginated()` method follows this, no exceptions.

---

## 7. Models

**File:** `app/models/[entity].py` — Pydantic models, one file per entity, mirroring `database-design.md`'s tables:

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Teacher(BaseModel):
    id: int
    name: str
    email: str
    password_hash: str
    created_at: datetime

class TeacherView(BaseModel):
    """What actually goes over the wire — never leak password_hash."""
    id: int
    name: str
    email: str

class CreateTeacherData(BaseModel):
    name: str
    email: str
    password: str  # plaintext in, hashed before it ever reaches a repository
```

Same split as the Node models: a full internal model, a `*View` for API responses (strips sensitive fields), and a `Create*Data`/`Update*Data` input model per write operation.

---

## 8. Repositories

**File:** `app/repositories/[entity]_repository.py` — the only place that touches the database, zero business logic, same shape as the Node guide's interface + class + singleton:

```python
from typing import Protocol, List
from app.models.teacher import Teacher, TeacherView
from app.utils.result import Result, ok, err
from app.utils.errors import ERRORS
from app.utils.logger import get_logger
from app.database.pool import execute, fetch_all, fetch_one

logger = get_logger("teacher_repository")

# 1. Define the interface — plain sync methods, not async: mysql-connector-python (our
# driver) has no async support, so fetch_all/fetch_one/execute in pool.py are sync too.
class ITeacherRepository(Protocol):
    def find_by_email(self, email: str) -> Result[List[Teacher], "AppError"]: ...
    def find_by_id(self, teacher_id: int) -> Result[Teacher, "AppError"]: ...
    def create(self, name: str, email: str, password_hash: str) -> Result[Teacher, "AppError"]: ...

# 2. Implement the class
class TeacherRepositoryImpl:
    def find_by_email(self, email: str) -> Result[List[Teacher], "AppError"]:
        try:
            rows = fetch_all(
                "SELECT id, name, email, password_hash, created_at FROM teachers WHERE email = %s",
                (email,),
            )
            return ok([Teacher(**row) for row in rows])
        except Exception:
            logger.exception("Error finding teacher by email")
            return err(ERRORS["DATABASE_ERROR"])

    def find_by_id(self, teacher_id: int) -> Result[Teacher, "AppError"]:
        try:
            row = fetch_one("SELECT * FROM teachers WHERE id = %s", (teacher_id,))
            if row is None:
                return err(ERRORS["RESOURCE_NOT_FOUND"])
            return ok(Teacher(**row))
        except Exception:
            logger.exception("Error fetching teacher by id")
            return err(ERRORS["DATABASE_ERROR"])

    def create(self, name: str, email: str, password_hash: str) -> Result[Teacher, "AppError"]:
        try:
            new_id = execute(
                "INSERT INTO teachers (name, email, password_hash) VALUES (%s, %s, %s)",
                (name, email, password_hash),
            )
            return self.find_by_id(new_id)
        except Exception:
            logger.exception("Error creating teacher")
            return err(ERRORS["DATABASE_ERROR"])

# 3. Export singleton — always a module-level instance, never instantiated ad hoc
TeacherRepository = TeacherRepositoryImpl()
```

### Repository rules
- Every method is `async` and returns `Result[T, AppError]`.
- Every method wraps its body in `try/except` — the `except` always logs and returns `err(ERRORS["DATABASE_ERROR"])`.
- No business logic — just SQL + mapping to a Pydantic model. No password hashing, no JWT, no AI calls.
- `INSERT` re-queries via `find_by_id(new_id)` rather than trusting a driver-returned row — same as the Node guide.
- `find_by_id`-style single lookups return `err(ERRORS["X_NOT_FOUND"])` when missing — **never `None`**.
- `find_by_email`-style multi lookups return `ok([])` when nothing matches — empty list is a valid success.
- Always parameterized queries (`%s` placeholders) — never string-format SQL.

---

## 9. Service Layer & Provider Abstraction

**This is the section that matters most for swappability.** Every external AI/CV/OCR/storage provider sits behind an interface — routers and other application code only ever depend on the interface, never on a concrete provider class. Swapping Claude for GPT, or the in-house `cv-ocr-service` for a hosted vendor, is then a **one-file, zero-caller-change** operation.

**File:** `app/services/llm_service.py`

```python
from typing import Protocol, List
from app.utils.result import Result
from app.models.report import ReportEvidence
from app.config.settings import settings

# 1. The interface — everything else in the app depends on THIS, never on a concrete class
class ILlmService(Protocol):
    async def map_question_to_node(self, question_text: str, full_taxonomy: List[TaxonomyNode]) -> Result[NodeSelection, "AppError"]: ...
    async def phrase_report(self, evidence: ReportEvidence) -> Result[str, "AppError"]: ...
    # No grade_subjective() — subjective grading is its own future PR, not a
    # deferred method on this interface; added alongside the schema it needs.

# 2a. One concrete implementation
class AnthropicLlmService:
    """Calls Claude via the Anthropic SDK. Implements ILlmService."""
    async def map_question_to_node(self, question_text: str, full_taxonomy: List[TaxonomyNode]) -> Result[NodeSelection, "AppError"]:
        ...  # Anthropic-specific call, mapped to the shared return shape

    # ... the other methods, same pattern

# 2b. An alternate implementation — same interface, swap-in replacement
class OpenAiLlmService:
    """Calls GPT via the OpenAI SDK. Implements ILlmService — identical method signatures."""
    ...

# 3. Resolved once, from config — nothing else in the app imports a provider class directly
def get_llm_service() -> ILlmService:
    if settings.LLM_PROVIDER == "anthropic":
        return AnthropicLlmService()
    if settings.LLM_PROVIDER == "openai":
        return OpenAiLlmService()
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")
```

**Used via FastAPI dependency injection**, never imported directly:

```python
# app/routers/test_router.py
from fastapi import Depends
from app.services.llm_service import ILlmService, get_llm_service

@router.post("/{test_id}/questions/{q_id}/map")
async def map_question(test_id: int, q_id: int, llm: ILlmService = Depends(get_llm_service)):
    result = await llm.map_question_to_node(question_text, candidates)
    ...
```

The router's code never changes if `LLM_PROVIDER` flips from `"anthropic"` to `"openai"` in config — only `get_llm_service()`'s branch and a new class need to exist. The same pattern applies to every other provider-backed service:

| Service | Interface | Swappable providers |
|---|---|---|
| `llm_service.py` | `ILlmService` | Anthropic (Claude), OpenAI (GPT), etc. |
| `bubble_service.py` | `IBubbleService` | AI-vision or a future OpenCV/hosted-vendor swap — `detect_bubbles()` reads the answer grid, `extract_name_region()` crops the header for `IOcrService` to read |
| `ocr_service.py` | `IOcrService` | Cloud Vision today; an LLM vision call or another OCR product later — reads the submission header's handwritten NAME field, a separate concern from bubble reading |
| `storage_service.py` | `IStorageService` | S3, GCS, any S3-compatible provider |

No `pdf_toc_service.py`/`IPdfTocService` — curriculum taxonomy is developer-seeded
offline (an AI chat tool as a drafting aid, verified against the book, entered via SQL),
not parsed by the app at all. See `../curriculum-taxonomy.md` § Building the Taxonomy.

No `embedding_service.py` — dropped entirely, not just deferred. It existed to shortlist
candidates before a question-mapping AI call; unnecessary once one subject's whole
curriculum taxonomy is small enough (a few hundred short name+path entries, manually
entered, no AI-written summaries) to send directly in one prompt. See
`../curriculum-taxonomy.md` § Mapping Questions onto the Taxonomy.

### Service rules
- Every service method returns `Result[T, AppError]` — same discipline as repositories; a provider's SDK exception is caught and converted, never left to propagate.
- **No repository ever imports a service, and no service ever imports a repository** — services are pure "call an external thing, map the result," repositories are pure "call the database." A router (or a thin per-flow orchestration function, if a pipeline step needs to call both) is what wires them together, per the pipeline diagrams in `backend-architecture.md` §6.
- Tests mock the **interface**, exactly like repositories — a test for `test_router.py`'s question-mapping endpoint never talks to a real LLM provider.

---

## 10. Routers

**File:** `app/routers/[entity]_router.py` — FastAPI's equivalent of the Node guide's controller + route combined (FastAPI doesn't need a separate routing file; the decorator *is* the route registration).

```python
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.middleware.auth import get_current_teacher
from app.repositories.class_repository import ClassRepository
from app.types.token import TokenData
from app.utils.responses import error_response, success_response

router = APIRouter(prefix="/api/classes", tags=["classes"])

@router.get("/{class_id}")
async def get_class(class_id: int, teacher: TokenData = Depends(get_current_teacher)):
    result = ClassRepository.find_by_id(class_id)
    if result.is_err():
        error = result.error
        return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))
    return success_response(result.value)
```

### Router rules
- Auth/role checks are FastAPI **dependencies** (`Depends(get_current_teacher)`), not manual `if` checks scattered per-route — same intent as the Node guide's middleware chain (`authenticate → requireX → validateRequest → handler`), expressed as FastAPI's own dependency system. This is the *one* place the app is allowed to raise (`Depends()` can only short-circuit by raising — there's no way for a dependency to "return" an error the way a route body can), and even there it raises via `app_error_to_http_exception` (`utils/responses.py`), which builds its body from the same `error_response()` helper, so the JSON shape is identical either way. Class-scoping isn't a `Depends()` — it's a plain function (`_ensure_assigned_or_admin`, `class_router.py`) called inside each route, since which class is being accessed only becomes known from the path parameter, after the dependency has already resolved; see `accounts-and-roster.md` § Tenancy Model.
- **Routers never raise for a Result-derived error.** Match on `is_err()` and return a `JSONResponse` built from `error_response()`/`success_response()` directly — never `raise HTTPException(...)`, and never hand-build the response dict inline. The error `code` always comes from an `ERRORS[...]` entry, never typed by hand at the call site.
- Request/response bodies are Pydantic models — FastAPI validates them automatically; no separate manual validation step is needed (this replaces the Node guide's Zod `validate-request` middleware). A validation failure still surfaces through `error_response()` — see the `RequestValidationError` handler in `middleware/error_handlers.py`, which exists as a safety net, not something routers call into directly.

---

## 11. Testing

| Layer | Type | Mocks | Notes |
|---|---|---|---|
| Routers | Unit (`pytest`, `TestClient`) | repos + services mocked via dependency overrides (`app.dependency_overrides[...]`) | Mirrors the Node guide's "controllers: unit, repos mocked" |
| Repositories | Integration (`pytest` + `testcontainers` MySQL) | none — real SQL against a throwaway container | Cursor pagination, `NOT_FOUND` vs. empty-list behavior, `UNIQUE (test_id, student_id)` on submissions, tree rollup query |
| Services | Unit | provider SDKs mocked | Verify the `Result` mapping (success shape + each failure mode converts to the right `AppError`), never call a real provider in CI |

---

## 12. Quick Reference Checklist

Before opening a PR for a new module:
- [ ] Model(s) added — full model + `*View` + `Create*Data`/`Update*Data` as needed
- [ ] Repository — interface (`Protocol`) + impl class + singleton export, every method `Result`-wrapped, `try/except` → `DATABASE_ERROR`
- [ ] New errors added to `ERRORS` in `utils/errors.py` (and to the catalog in `backend-architecture.md` §5) — never inline `AppError(...)`
- [ ] Router — auth via `Depends`, unwraps `Result` via `app_error_to_http_exception`, no manual status codes
- [ ] If the module calls an external provider (AI/CV/storage) — goes through the service's **interface**, never a concrete provider class imported directly
- [ ] Repository integration tests (testcontainers) + router unit tests (mocked deps) both added
