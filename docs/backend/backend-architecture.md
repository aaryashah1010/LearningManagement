# Learning Management Backend — Architecture & Module Inventory

> Companion to `database-design.md` (schema source of truth), `backend-guide.md` (the
> style bible — Result pattern, repositories, the service-layer provider-abstraction
> pattern, testing), and the product docs (`../omr-grading.md`,
> `../curriculum-taxonomy.md`, `../accounts-and-roster.md`). **Scope: MCQ/OMR
> first — `../subjective-grading.md` is out of scope for now** (reviewer feedback), so
> this doc builds only what's needed for objective grading; subjective-specific pieces
> are called out explicitly where they'd otherwise appear, not silently included. This
> doc defines **what** we build: module inventory, every endpoint, error-code domains, external
> services, and the core pipelines.

---

## 0. Stack — decided

**Python + FastAPI**, single backend, no service split. Resolved this way after weighing
it directly (see conversation history / team discussion):

- Nearly every core feature here is CV/AI/ML-shaped — OMR answer extraction (OpenCV
  and/or AI-vision, method left open per `../omr-grading.md`, current version),
  handwriting OCR (deferred), PDF bookmark/TOC parsing, and LLM calls at a couple of
  pipeline stages. That's the majority of the product, not one isolable slice of an
  otherwise generic CRUD app — so keeping it in one language avoids constant
  cross-service network hops for what is core, not peripheral, functionality.
- FastAPI specifically (over Django): this app is async/I/O-heavy on nearly every
  request (waiting on an LLM call, a DB query, often more than one in sequence) —
  FastAPI's async support is native; Django's is bolted on and fights its sync-first
  ORM. We also hand-wrote the full schema (`database-design.md`) rather than wanting an
  ORM to own migrations, and this is a pure JSON API with no use for Django's
  templating/admin/forms.
- **Every AI/CV/storage provider sits behind an interface** (`backend-guide.md`
  § Service Layer & Provider Abstraction) — swapping Claude for GPT, or the in-house
  OpenCV/OCR module for a hosted vendor, is a one-file change with zero changes to any
  router or pipeline code that calls it.

---

## 1. Stack

FastAPI (async) · `mysql-connector-python`/`SQLAlchemy Core` · Pydantic v2 ·
`python-jose` (JWT) · `bcrypt` (password hashing) · stdlib `logging` (rotating file
handlers, gzip on rotate — see `app/utils/logger.py`) · `slowapi` (rate limiting) ·
pytest + `pytest-asyncio` + `testcontainers` · Docker Compose (app + MySQL 8) ·
OpenCV (`opencv-python`) + an OCR library, used directly inside `cv_ocr_service.py` —
no separate microservice (see § 0 above).

---

## 2. Module Inventory & API Endpoints

See `backend-guide.md` § 2 for the full folder structure. All routers mount under
`/api/...`. Auth/role checks are FastAPI dependencies (`Depends(get_current_teacher)`,
etc. — `backend-guide.md` § 10). Every list endpoint uses cursor pagination
(`?cursor=&limit=`).

### 2.1 Auth — `/api/auth`

Two roles, two tables (`teachers`, `students`) — kept structurally separate rather than
one shared table with a role column, since `teachers.email` and `students.email` are
independently unique, not globally unique across both. **No public registration route for
either role** — see § 2.2 for how accounts actually get created (`../accounts-and-roster.md`
§ Student/Teacher Account Creation).

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/teacher/login` | public | Email + password → `LoginResponse[TeacherView]` |
| POST | `/student/login` | public | Email/phone + password → `LoginResponse[StudentView]` |
| POST | `/refresh-token` | public | Body `{role}` disambiguates which secret/table to re-verify against |
| PATCH | `/password` | teacher or student | Body `{current_password, new_password}` — verifies the current hash before changing it |

### 2.2 Accounts & Roster — `/api/accounts`, `/api/classes`

Account creation always requires being authenticated as an existing teacher — no
self-service registration for either role (`../accounts-and-roster.md`). The very first
teacher account is seeded directly (DB fixture), not created through this route.
Teacher and student creation are **separate endpoints**, not one shared route with a
`role` field — a new teacher is a single ad hoc addition (the creating teacher sets their
password directly), while students only ever arrive as a class roster (system-issued
default password, changed via `/api/auth/password` after first login).

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/accounts/teachers` | teacher | Body `{name, email, password}` — creates one teacher account with the password the creating teacher chose for them |
| POST | `/api/accounts/students/bulk` | teacher | Body `{class_id, students: [{name, email?, phone?}]}` — creates (or matches an existing student by email/phone) and enrolls each into `class_id` (any class — no per-teacher ownership check, see § Auth & Tenancy). New accounts get `DEFAULT_STUDENT_PASSWORD` (env-configured, same for every student, changed via `/api/auth/password` after first login) — no per-student password in the request |

Class management stays under `/api/classes`. Any authenticated teacher can act on any
class — see § Auth & Tenancy for why there's no per-teacher ownership check here.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | teacher | Create a class (no owning teacher recorded — see § Auth & Tenancy) |
| GET | `/` | teacher | List all classes (paginated) |
| GET | `/{id}` | teacher | Detail + enrollment count |
| DELETE | `/{id}/enrollments/{student_id}` | teacher | Remove from roster |
| PATCH | `/{id}/enrollments/{student_id}` | teacher | Body `{new_class_id}` — move the student from `{id}` to `new_class_id`; atomic, not a remove+re-add from the client's side |
| GET | `/{id}/enrollments` | teacher | Roster list |

**No `DELETE /{id}` (delete a whole class) — deliberately not built yet.** `tests.class_id`
already cascades (`ON DELETE CASCADE`), same as `class_enrollments.class_id` — once tests
exist (Step 3+), deleting a class would silently wipe every test/question/submission/answer
tied to it, not just the roster. Add this endpoint deliberately once tests exist, alongside
a real decision on whether to block deletion when tests/submissions reference the class
(e.g. a `CLASS_HAS_TESTS`-style guard) rather than as a bare cascading delete.

### 2.3 Subjects & Curriculum Taxonomy — `/api/subjects`, `/api/books`

Implements the flow in `../curriculum-taxonomy.md` § Building the Taxonomy — a small,
one-time, largely manual process, **not** an automated ingestion pipeline. No AI reads
the book; PDF bookmark/TOC parsing is plain structured-data extraction, not judgment.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/subjects` | teacher | Create a subject (e.g. "Physics") — shared, not class-scoped |
| GET | `/api/subjects` | any authed | List |
| POST | `/api/subjects/{id}/books` | teacher | Upload an NCERT PDF (multipart) to object storage (`storage_service`), then `pdf_toc_service.parse_bookmarks_or_toc()` (plain parsing, not AI) auto-fills Chapter/Topic `curriculum_nodes` rows with `confirmed = false` |
| GET | `/api/books/{id}/curriculum` | any authed | The auto-filled + manually-entered tree so far |
| PUT | `/api/books/{id}/curriculum/{node_id}` | teacher | Edit a node (name/page range) and/or set `confirmed = true` — how the teacher reviews auto-filled Chapter/Topic rows |
| POST | `/api/books/{id}/curriculum/{topic_id}/subtopics` | teacher | Manually add one or more Subtopics under a Topic — array body, same single-vs-bulk pattern as § 2.2; rows are `confirmed = true` from creation |

### 2.4 Tests & Questions — `/api/classes/{class_id}/tests`, `/api/tests`

Implements `../omr-grading.md` § Test Setup. MCQ only — `questions` has no subjective
fields at all in this schema; subjective test setup is its own future PR
(`../subjective-grading.md`), not a deferred piece of this one.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/classes/{class_id}/tests` | teacher | Create a test: `subject_id`, `title`, `setup_path: in_app\|uploaded_pdf` |
| POST | `/api/tests/{id}/questions/upload` | teacher | Path B only — multipart question-paper PDF. Extracts the MCQ answer key via `llm_service`, writes `questions` rows |
| GET | `/api/tests/{id}/questions` | teacher | List with proposed node mapping (§4b) for review |
| PUT | `/api/tests/{id}/questions/{q_id}/node` | teacher | Admin corrects the AI-picked node — body `{node_id}` |
| POST | `/api/tests/{id}/publish` | teacher | Sets `published_at` — locks `question_node_map` for this test permanently |

### 2.5 Submissions — `/api/tests/{test_id}/submissions`, `/api/submissions`

Implements `../omr-grading.md` § Scan, Upload & Processing — MCQ/OMR only, subjective
(handwriting OCR) deferred with the rest of `../subjective-grading.md`. **v1 is
login-only identification** — no QR, no roll-number, no teacher bulk-upload; see
`../accounts-and-roster.md` § Future / Phase 2 for what comes back later and why it's
deferred, not dropped.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/tests/{test_id}/submissions` | student | Upload own sheet — a single image (in-app guided capture, or a gallery-picked image); v1 is single-page OMR only. `student_id` = caller's own id — this is the only identification path in v1 |
| GET | `/api/submissions/{id}` | teacher, or the owning student | Detail: status, per-question answers, `needs_review` flags |
| PUT | `/api/submissions/{id}/answers/{q_id}` | teacher | Confirm/correct a flagged (`needs_review`) bubble read |

**Deferred to Phase 2** (not built in v1): `POST .../submissions/bulk` (teacher bulk-upload with QR/roll-number matching) and `PUT /api/submissions/{id}/match` (manual-match-to-roster) — both depend on sheet-based identification that v1 doesn't have.

### 2.6 Reports — `/api/students/{id}/report`, `/api/classes/{id}/report`

Implements `../curriculum-taxonomy.md` § Reports.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/students/{id}/report?subject_id=` | teacher, or the student themself | Rollup query (plain joins at the current fixed 3-level depth) → evidence JSON → `llm_service.phrase_report()` for the readable text. Evidence computed first, LLM only phrases it |
| GET | `/api/classes/{id}/report?subject_id=` | teacher | Same rollup, aggregated across the class's own `answers` rows instead of one student's |

---

## 3. Auth & Tenancy

```python
# app/types/token.py
from pydantic import BaseModel
from typing import Literal

class TokenData(BaseModel):
    id: int
    role: Literal["teacher", "student"]
    email: str
```

**No per-teacher tenancy scoping (revised — see `accounts-and-roster.md` § Tenancy Model,
reversible if ever needed).** Any authenticated teacher can view/manage any class, student,
or (once built) test/submission/report, regardless of who created it. `classes` has no
`teacher_id` column at all — removed, not just unfiltered — so no route or repository call
has anything to scope by. One shared connection pool, no per-teacher `WHERE` isolation. This
replaces the earlier row-level-tenancy model; `database-design.md` § Design Decisions still
describes *why* a shared database was chosen over database-per-tenant, that part is
unchanged — only the per-teacher access boundary (and the column it depended on) was removed.

- `get_current_teacher` / `get_current_student` — FastAPI dependencies, role check on the decoded token. This is still required — the removed boundary is teacher-vs-teacher, not the teacher/student role split itself.
- A student's own-data routes (`GET /api/submissions/{id}`, `GET /api/students/{id}/report`) still check `current_student.id == {id}` (or, for a submission, that `submissions.student_id == current_student.id`) — this boundary is unaffected by the tenancy change above; students still only ever see their own data, never another student's.

---

## 4. Core Pipelines

### 4a. Building the Curriculum Taxonomy (`../curriculum-taxonomy.md` § Building the Taxonomy)

A small, largely manual, one-time-per-book flow — not an automated ingestion pipeline.

```
POST /subjects/{id}/books  (multipart PDF)
        │
        ▼
  storage_service.upload()  →  ncert_books.pdf_url
        │
        ▼
  pdf_toc_service.parse_bookmarks_or_toc()  (plain structured-data parsing, NOT AI —
        │                                     the book's own printed contents is the answer)
        ▼
  curriculum_nodes rows written for Chapter + Topic, confirmed = false
        │
        ▼
  [teacher reviews: GET /books/{id}/curriculum, PUT .../curriculum/{node_id} to
   edit/confirm each Chapter/Topic row]
        │
        ▼
  [teacher manually adds Subtopics: POST /books/{id}/curriculum/{topic_id}/subtopics
   — the one step needing real judgment, based on reading that section of the book]
        │
        ▼
  taxonomy ready for this book — usable by any test in this subject from now on
```

No staging tables, no per-page text extraction, no per-chapter AI call, no embeddings.

### 4b. Question → Node Mapping (test setup)

```
questions extracted (Path A: already in question bank; Path B: parsed from uploaded PDF)
        │
        ▼
  SELECT id, name, parent_id, level FROM curriculum_nodes WHERE book/subject scope
        │  one subject's whole taxonomy — a few hundred short name+path entries,
        │  small enough to send directly, no shortlist step needed
        ▼
  llm_service.map_question_to_node(question_text, full_taxonomy_for_subject)
        │  no embeddings, no cosine similarity — the AI picks the matching path
        │  directly from the full list
        ▼
  { selected_node_id }  →  question_node_map row (pending review)
        │
        ▼
  [admin review: PUT /tests/{id}/questions/{q_id}/node to correct]
        │
        ▼
  POST /tests/{id}/publish  →  question_node_map locked for this test
```

### 4c. Submission Processing

```
POST /tests/{test_id}/submissions  (student, own login — the only path in v1)
        │
        │  student_id = current_student.id — login is the identification,
        │  no QR/roll-number/matching needed (../accounts-and-roster.md)
        ▼
  cv_ocr_service.detect_bubbles()  (§5 — in-process, behind ICvOcrService;
        │                            v1 = one AI-vision read per sheet, no
        │                            caching — omr-extraction-strategy.md)
        ▼
  compare to questions.correct_option (plain comparison, no AI)
        │
        ▼
  low-confidence bubble read?  →  answers.needs_review = true  →  PUT /submissions/{id}/answers/{q_id} (teacher confirms)
        │
        ▼
  answers rows written — reference question_id only, never write to curriculum_nodes
  (database-design.md § Design Decisions — "Results never touch the taxonomy")
```

**Deferred to Phase 2** (`../accounts-and-roster.md` § Future / Phase 2): teacher bulk-upload,
QR decode + mismatch rejection, roll-number lookup, manual-match-to-roster. None of this
is built in v1 — identification is login-only.

**Not part of this system at all — its own future PR:** handwriting OCR, subjective
partial-credit grading, `model_answer`/`keyword_key` on questions, `marks_awarded`/
`ai_summary` on answers. Per current review feedback, subjective grading isn't a deferred
piece of this build, it's a separate PR later — nothing subjective-specific exists in the
schema or the service interfaces right now (`database-design.md` § Design Decisions).

### 4d. Report Generation

```
GET /students/{id}/report?subject_id=
        │
        ▼
  report_repository: plain 3-way self-join, curriculum_nodes scoped to subject_id
        JOIN answers → question_node_map → curriculum_nodes  (student_id filtered)
        │
        ▼
  weighted rollup in application code: Subtopic → Topic → Chapter → Subject accuracy
        │
        ▼
  filter to weak nodes only (below threshold) — small evidence set, not the whole tree
        │
        ▼
  llm_service.phrase_report(evidence)  →  readable text
  (evidence computed first; the LLM only phrases it, never independently judges weakness)
```

---

## 5. External Services (`app/services/`) — Interface + Impl + Provider-Selected Singleton

Full pattern and code shape in `backend-guide.md` § Service Layer & Provider Abstraction.
**No embedding service** — dropped entirely; see `database-design.md` § Design Decisions
and `../curriculum-taxonomy.md` § Mapping Questions onto the Taxonomy for why it's
unnecessary once the taxonomy is small and unsummarized.

| Service | Interface | Swappable providers | Notes |
|---|---|---|---|
| `cv_ocr_service.py` | `ICvOcrService` | **v1:** one AI-vision call reads every sheet directly, no caching, no registration — chosen over a cached-template/CV-first design specifically to avoid unvalidated registration risk before real usage justifies the added complexity; see `omr-extraction-strategy.md` for the reasoning and the deferred cached-template design | `detect_bubbles()` only — stateless, image in, structured result (answers + per-question confidence flags) out. No handwriting/OCR method on the interface at all; added when subjective grading is actually built, as its own PR. **Cost note:** a real per-submission AI cost, not free-CV — small and bounded at typical class sizes, but not zero; see `omr-extraction-strategy.md` § What still needs deciding for the open cost-at-scale question |
| `pdf_toc_service.py` | `IPdfTocService` | Any PDF-parsing library that can read bookmarks/outline metadata, or fall back to parsing a printed contents page | Used only at book-setup time — one-time per book (12 books total), not a recurring pipeline |
| `llm_service.py` | `ILlmService` | Anthropic (Claude), OpenAI (GPT), etc. | Three calls across the pipelines (§4b, §4c fallback, §4d) — question-mapping is given one subject's whole taxonomy directly (small enough, no shortlisting needed), never a whole book's raw text |
| `storage_service.py` | `IStorageService` | S3-compatible object storage | DB stores keys/pointers, never file bytes — `ncert_books.pdf_url`, `submissions.image_url` (`database-design.md` §4) |

Config keys: `LLM_PROVIDER`/`LLM_API_KEY`, `S3_*`, `DB_*`, `JWT_*`. Changing a provider
is a config value + one new implementation class — zero changes to any router,
repository, or pipeline orchestration code.

---

## 6. Error Catalog

`1xxxx` common and `2xxxx` auth follow `backend-guide.md` §4's conventions. Domain ranges:

| Range | Domain | Examples |
|---|---|---|
| 2xxxx | Auth | `NO_TOKEN_PROVIDED` 20001·401, `INVALID_AUTH_TOKEN` 20002·401, `TOKEN_EXPIRED` 20003·401, `INVALID_CREDENTIALS` 20004·401, `FORBIDDEN` 20005·403, `INVALID_REFRESH_TOKEN` 20006·401, `INCORRECT_CURRENT_PASSWORD` 20007·401 (`PATCH /api/auth/password`) |
| 3xxxx | Classes / Roster | `CLASS_NOT_FOUND` 30001·404, `STUDENT_NOT_IN_CLASS` 30002·404, `ROLL_NUMBER_TAKEN` 30003·409, `EMAIL_OR_PHONE_TAKEN` 30004·409 (per-role uniqueness, checked by both `POST /api/accounts/teachers` and `POST /api/accounts/students/bulk`) |
| 4xxxx | Subjects / Books / Curriculum Taxonomy | `BOOK_NOT_FOUND` 40001·404, `NODE_BOUNDARY_INVALID` 40002·422 (`page_start > page_end`), `NODE_NOT_CONFIRMED` 40003·409 (test setup referencing an unconfirmed Chapter/Topic), `PDF_TOC_PARSE_FAILED` 40004·502 (falls back to a blank manual-entry screen rather than failing outright), `SUBJECT_NOT_FOUND` 40005·404, `CURRICULUM_NODE_NOT_FOUND` 40006·404 |
| 5xxxx | Tests / Questions | `TEST_NOT_FOUND` 50001·404, `TEST_ALREADY_PUBLISHED` 50002·409, `QUESTION_PAPER_PARSE_FAILED` 50003·502, `NODE_NOT_IN_SUBJECT_SCOPE` 50004·422, `QUESTION_NOT_FOUND` 50005·404 |
| 6xxxx | Submissions / Grading | `SUBMISSION_NOT_FOUND` 60001·404, `DUPLICATE_SUBMISSION` 60002·409 (`UNIQUE (test_id, student_id)`), `ANSWER_NOT_FOUND` 60003·404 — `QR_STUDENT_MISMATCH`/`ROLL_NUMBER_MISMATCH`/`MATCH_ALREADY_RESOLVED` deferred to Phase 2 with the identification features they belong to |
| 7xxxx | Reports | `NO_RESULTS_YET` 70001·404 |
| 8xxxx | Files / Storage | `FILE_TOO_LARGE` 80001·413, `INVALID_FILE_TYPE` 80002·422, `STORAGE_UPLOAD_FAILED` 80003·502 |
| 9xxxx | External Services (CV/OCR/AI) | `CV_OCR_ERROR` 90001·502, `LLM_SERVICE_ERROR` 90002·502, `LOW_CONFIDENCE_EXTRACTION` 90003·422 (routes to `needs_review` rather than failing) |

---

## 7. Testing Strategy

See `backend-guide.md` §11 for the mechanics. Priority scenarios per layer:

| Layer | Priority scenarios |
|---|---|
| Routers | Test publish locking `question_node_map`, submission upload always scoped to the caller's own `student_id`, report evidence-filtering (weak nodes only), curriculum-node `confirmed` gating |
| Repositories | `UNIQUE (test_id, student_id)` on submissions, tree rollup query at fixed depth, cursor pagination |
| Services | `Result` mapping for every failure mode per provider, bubble fill-percentage thresholds against fixture images |

---

## 8. Build Order

1. **Skeleton** — settings, utils (`errors`/`responses`/`logger`/`jwt`/`result`), middleware, DB pool, `main.py`, Docker
2. **Auth + Classes/Roster** — teacher/student login, class CRUD, enrollments (unlocks everything scoped to a class)
3. **Subjects + Curriculum Taxonomy** — upload → PDF bookmark/TOC parse → teacher confirms Chapter/Topic → teacher adds Subtopics (needed before any test can be set up in a subject)
4. **cv_ocr_service** — AI-vision bubble reading (§5, `omr-extraction-strategy.md`); handwriting OCR deferred
5. **Tests + Questions** — Path A/B setup, whole-taxonomy question mapping + AI pick, publish lock
6. **Submissions** — upload (login-only identification, v1), MCQ grading (mechanical), confidence flagging/review. Subjective grading deferred.
7. **Reports** — rollup query, evidence filtering, LLM phrasing — both per-student and class-wide

Each step = model → repository (+ integration tests) → service (if it calls a provider, behind its interface) → router (+ unit tests), per `backend-guide.md` §12's checklist.
