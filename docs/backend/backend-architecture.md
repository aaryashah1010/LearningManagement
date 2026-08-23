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

- Nearly every core feature here is CV/AI/ML-shaped — OMR answer extraction (pure
  OpenCV against a single fixed sheet template, see `omr-extraction-strategy.md`),
  handwriting OCR (deferred), and LLM calls at a couple of pipeline stages. That's the
  majority of the product, not one isolable slice of an
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
  OpenCV bubble-reading module for a different extraction method entirely, is a one-file
  change with zero changes to any router or pipeline code that calls it.

---

## 1. Stack

FastAPI (async) · `mysql-connector-python`/`SQLAlchemy Core` · Pydantic v2 ·
`python-jose` (JWT) · `bcrypt` (password hashing) · stdlib `logging` (rotating file
handlers, gzip on rotate — see `app/utils/logger.py`) · `slowapi` (rate limiting) ·
pytest + `pytest-asyncio` + `testcontainers` · Docker Compose (app + MySQL 8) ·
OpenCV (`opencv-python`), used directly inside `bubble_service.py` — no separate
microservice (see § 0 above).

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

Account creation always requires being authenticated as an **admin** — no self-service
registration for any role, and plain teachers can't create other accounts either
(`../accounts-and-roster.md` § Tenancy Model). The very first account is seeded directly
as `role = 'admin'` (DB fixture), not created through this route. Teacher and student
creation are **separate endpoints**, not one shared route with a `role` field — a new
teacher is a single ad hoc addition (the admin sets their password directly), while
students only ever arrive as a class roster (password derived from `date_of_birth`,
changed via `/api/auth/password` after first login).

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/accounts/teachers` | admin | Body `{name, email, password}` — creates one plain (`role = 'teacher'`) account with the password the admin chose for them. No way to create another admin through the API |
| POST | `/api/accounts/students/bulk` | admin | Body `{class_id, students: [{name, date_of_birth, email?, phone?}]}` — creates (or matches an existing student by email/phone) and enrolls each into `class_id`. New accounts get a password derived from `date_of_birth` (`utils/password.py::password_from_dob`, `DDMMYYYY`) — never returned in the response, changed via `/api/auth/password` after first login. A matched-existing account's password/DOB are untouched. Each entry is its own atomic create-or-match + enroll (`ClassRepository.enroll_new_or_matched_student`, one `transaction()` per student) — a bad entry doesn't stop the rest of the batch. Response is `{created: [...], failed: [{name, code, message}]}`, not a flat list — always check `failed` even on a 201 |

Class management stays under `/api/classes`. Creation and teacher-assignment are
admin-only; a plain teacher's access is scoped to classes they're assigned to via
`class_teachers` — see § Auth & Tenancy.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | admin | Create a class |
| GET | `/` | teacher, admin | Admin: all classes. Teacher: only classes they're assigned to (`list_assigned_classes`) |
| GET | `/{id}` | teacher (assigned), admin | Detail + enrollment count. Unassigned teacher gets `CLASS_NOT_FOUND` |
| DELETE | `/{id}/enrollments/{student_id}` | teacher (assigned), admin | Remove from roster |
| PATCH | `/{id}/enrollments/{student_id}` | teacher (assigned), admin | Body `{new_class_id}` — move the student from `{id}` to `new_class_id`; atomic, not a remove+re-add from the client's side. Caller must be assigned to (or admin for) both classes |
| GET | `/{id}/enrollments` | teacher (assigned), admin | Roster list |
| POST | `/{id}/teachers` | admin | Body `{teacher_id}` — assign a teacher to this class (idempotent) |
| DELETE | `/{id}/teachers/{teacher_id}` | admin | Unassign a teacher from this class |

**No `DELETE /{id}` (delete a whole class) — deliberately not built yet.** `tests.class_id`
already cascades (`ON DELETE CASCADE`), same as `class_enrollments.class_id` — once tests
exist (Step 3+), deleting a class would silently wipe every test/question/submission/answer
tied to it, not just the roster. Add this endpoint deliberately once tests exist, alongside
a real decision on whether to block deletion when tests/submissions reference the class
(e.g. a `CLASS_HAS_TESTS`-style guard) rather than as a bare cascading delete.

### 2.3 Subjects & Curriculum Taxonomy — `/api/subjects`, `/api/books`

**Read-only via the API.** Implements the flow in `../curriculum-taxonomy.md` §
Building the Taxonomy (revised) — subjects, books, and the full curriculum tree are
authored once by a developer directly in the database (a SQL seed/script, same pattern
as the first teacher account in `seed.sql`), not through app endpoints. No upload, no
PDF parsing, no confirm/review flow, no teacher-facing authoring UI. The app only ever
reads this reference data, for test setup and question mapping.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/subjects` | any authed | List subjects |
| GET | `/api/subjects/{id}/books` | any authed | List books for a subject |
| GET | `/api/books/{id}/curriculum` | any authed | The full Chapter/Topic/Subtopic tree for that book |

**Not building yet, but worth naming:** a teacher-facing edit route (e.g.
`PUT /api/books/{id}/curriculum/{node_id}`) isn't built now — content is static once
entered, so a rare correction is a one-off developer `UPDATE`, not worth an edit
API/UI yet. Add it later if corrections turn out to be frequent in practice; see
`../curriculum-taxonomy.md` § Building the Taxonomy.

### 2.4 Tests & Questions — `/api/classes/{class_id}/tests`, `/api/tests`

Implements `../omr-grading.md` § Test Setup. MCQ only — `questions` has no subjective
fields at all in this schema; subjective test setup is its own future PR
(`../subjective-grading.md`), not a deferred piece of this one.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/classes/{class_id}/tests` | teacher (assigned), admin | Create a test: `book_id` (not `subject_id` — pins one specific grade/edition, see `database-design.md` § Design Decisions), `title`, `setup_path: in_app\|uploaded_pdf` |
| POST | `/api/tests/{id}/questions/upload` | teacher (assigned), admin | Path B only — multipart question-paper PDF. Extracts the MCQ answer key via `llm_service`, writes `questions` rows |
| GET | `/api/tests/{id}/questions` | teacher (assigned), admin | List with proposed node mapping (§4b) for review |
| PUT | `/api/tests/{id}/questions/{q_id}/node` | teacher (assigned), admin | Corrects the AI-picked node — body `{node_id}` |
| POST | `/api/tests/{id}/publish` | teacher (assigned), admin | Sets `published_at` — locks `question_node_map` for this test permanently |

### 2.5 Submissions — `/api/tests/{test_id}/submissions`, `/api/submissions`

Implements `../omr-grading.md` § Scan, Upload & Processing — MCQ/OMR only, subjective
(handwriting OCR) deferred with the rest of `../subjective-grading.md`. Superseded from
the original login-only v1 design by teacher bulk-upload with OCR name-matching (see
`../accounts-and-roster.md` § Student Identification on Upload). Extraction results are
never final the instant they're written — every submission from a bulk upload lands as
`status = 'pending'` (a draft, invisible to reports), and the teacher reviews/edits
before an explicit Save finalizes the batch. See § 4c below for the full pipeline.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/tests/{test_id}/submissions/bulk` | teacher (assigned), admin | One PDF, every student's sheet, one page each. Runs CV+AI extraction (§4c) and OCR name-matching per page; every created submission is `status = 'pending'` regardless of match/confidence outcome — nothing is final yet |
| GET | `/api/tests/{test_id}/submissions?status=` | teacher (assigned), admin | List submissions for a test, optionally filtered by status (e.g. `?status=pending` for the review queue) |
| GET | `/api/submissions/{id}` | teacher (assigned), admin, or the owning student | Detail: status, per-question answers (with `question_number`/`correct_option` joined in), `needs_review` flags |
| PUT | `/api/submissions/{id}/answers/{q_id}` | teacher (assigned), admin | Correct one answer's selected option — recomputes `is_correct` server-side, clears `needs_review`. Works both pre- and post-save |
| PATCH | `/api/submissions/{id}/student` | teacher (assigned), admin | Body `{student_id, raw_extracted_name?}` — reassign the matched student (when OCR matched wrong or not at all) and optionally correct the displayed OCR text itself, since handwriting OCR can't be fully trusted |
| POST | `/api/tests/{test_id}/submissions/save` | teacher (assigned), admin | The one "Save" action — finalizes every still-`pending` submission for the test to `processed`/`needs_review` (same unmatched-or-flagged rule as before). Report generation (§2.6) already blocks on `pending`/`needs_review`, so it naturally can't run until this has been called and everything's clean |

**Deferred** (not built): QR/roll-number-based identification — see
`../accounts-and-roster.md` § Future / Phase 2.

### 2.6 Reports — `/api/students/{id}/report`, `/api/classes/{id}/report`

Implements `../curriculum-taxonomy.md` § Reports.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/students/{id}/report?subject_id=` | teacher, or the student themself | Rollup query (plain joins at the current fixed 3-level depth) → evidence JSON → `llm_service.phrase_report()` for the readable text. Evidence computed first, LLM only phrases it |
| GET | `/api/classes/{id}/report?subject_id=` | teacher | Same rollup, aggregated across the class's own `answers` rows instead of one student's |

### 2.7 Stats — `/api/stats`

Dashboard summary numbers only — plain `COUNT`/`SUM` aggregates read directly off existing
tables, computed on every request (small trusted-staff scale, per `database-design.md` §
Design Decisions — no snapshot/rollup table). Not a general analytics module: no
date-range params, no per-test breakdowns (that's `/api/tests/{id}/report/*`, §2.6).

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/stats/admin` | admin | `AdminStats` — `teachers_count` (role = `teacher`, excludes the admin account itself), `students_count`, `classes_count`, `unassigned_classes_count` (no `class_teachers` row), a 6-month `enrollment_trend` (student `created_at`, zero-filled for empty months), and `class_roster` (every class's enrolled count + assigned teacher name(s)) |
| GET | `/api/stats/teacher` | teacher | `TeacherStats`, scoped to the caller via `class_teachers` — `classes_count`, `published_tests_count`, `needs_review_submissions_count`, and `average_accuracy_percent` (from `processed` submissions' `answers.is_correct`, `null` until any exist) |

---

## 3. Auth & Tenancy

```python
# app/types/token.py
from pydantic import BaseModel
from typing import Literal

class TokenData(BaseModel):
    id: int
    role: Literal["admin", "teacher", "student"]
    email: str
```

**Admin + class-scoped teacher tenancy (revised again — see `accounts-and-roster.md` §
Tenancy Model for the full reasoning).** `role` lives on `teachers` (`teachers.role`, not
a separate table) — an admin is a teacher with elevated permissions. Class access for a
plain teacher is scoped by `class_teachers` (many-to-many: `class_id`, `teacher_id`); an
admin bypasses that scoping entirely and can act on any class. This replaces the
brief no-scoping-at-all revision — that version recreated the original problem (no one
could grant class access without already having it); admin is the missing piece that
lets access actually be granted. `database-design.md` § Design Decisions still describes
*why* a shared database was chosen over database-per-tenant, that part is unchanged.

- `get_current_teacher` — role must be exactly `"teacher"` (excludes admin). `get_current_admin` — role must be exactly `"admin"`. `get_current_teacher_or_admin` — either role; the handler branches (`if current_user.role == "admin"`) to bypass scoping for admins and apply it for teachers. All three are FastAPI dependencies on the decoded token, same mechanism as `get_current_student`.
- `_ensure_assigned_or_admin(class_id, current_user)` (`class_router.py`) — the actual scoping check: admin always passes; a teacher must have a `class_teachers` row for that class, else `CLASS_NOT_FOUND` (not `FORBIDDEN` — don't reveal the class exists to an unassigned teacher). Same "fetch, compare, don't leak existence" pattern used everywhere else in this API.
- A student's own-data routes (`GET /api/submissions/{id}`, `GET /api/students/{id}/report`) still check `current_student.id == {id}` (or, for a submission, that `submissions.student_id == current_student.id`) — unaffected by any of the above; students still only ever see their own data, never another student's.

---

## 4. Core Pipelines

### 4a. Building the Curriculum Taxonomy (`../curriculum-taxonomy.md` § Building the Taxonomy)

Developer-authored, offline, not an app flow — no request/response cycle at all:

```
Developer reads the book's TOC page(s) (Chapter/Topic) and relevant chapter text (Subtopic)
        │
        ▼
  Uploads to Claude/ChatGPT (web app, not API) to draft a Chapter → Topic → Subtopic breakdown
        │
        ▼
  Developer verifies the draft against the actual book, corrects anything wrong/vague
        │
        ▼
  Final structure entered directly into subjects/ncert_books/curriculum_nodes via SQL
  seed/script — no POST endpoint, no confirm flow, no teacher-facing UI
        │
        ▼
  taxonomy ready for this book — usable by any test set up against this book from
  now on; the app only ever reads it (GET /api/subjects, GET /api/books/{id}/curriculum)
```

No staging tables, no PDF-parsing service, no per-chapter AI call at request time, no embeddings.

### 4b. Question → Node Mapping (test setup)

```
questions extracted (Path A: already in question bank; Path B: parsed from uploaded PDF)
        │
        ▼
  SELECT id, name, parent_id, level FROM curriculum_nodes WHERE book_id = tests.book_id
        │  one book's whole taxonomy — a few hundred short name+path entries,
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
POST /tests/{test_id}/submissions/bulk  (teacher, one PDF — every student's sheet, one page each)
        │
        ▼
  pdf_service.split_pdf_to_page_images()  (§5 — one PNG per page)
        │
        ▼
  per page, independently:
    bubble_service.detect_bubbles()          (IBubbleService — pure OpenCV, no AI)
    bubble_service.extract_name_region()  →  ocr_service.extract_student_name()
        │                                     (IOcrService — Cloud Vision reads the
        │                                      handwritten NAME field)
        ▼
  normalize + exact-match name against class roster (../accounts-and-roster.md
  § Student Identification on Upload)
        │
        │  matched → student_id set        no match → student_id = NULL,
        │                                    raw_extracted_name kept for review
        ▼
  compare bubble answers to questions.correct_option (plain comparison, no AI) →
  per-answer needs_review flags
        │
        ▼
  submissions + answers rows written with status = 'pending' — ALWAYS, regardless of
  match/confidence outcome; nothing is final yet. Answers reference question_id only,
  never write to curriculum_nodes
  (database-design.md § Design Decisions — "Results never touch the taxonomy")
        │
        ▼
  Teacher review (§2.5): GET .../submissions?status=pending → GET .../submissions/{id}
  for detail → PUT .../answers/{q_id} and/or PATCH .../student to correct anything
        │
        ▼
  POST /tests/{test_id}/submissions/save  ← the one Save action
        │
        ▼
  every still-'pending' submission for the test flips to its final status:
  needs_review if student_id is still null or any answer is still flagged, else
  processed — same rule the review-time edits already used to decide when to
  auto-finalize a submission that had already been saved once
```

**Deferred** (`../accounts-and-roster.md` § Future — Roll Number / QR as a Stronger
Identifier): QR decode + mismatch rejection, physical roll-number lookup. Teacher
bulk-upload itself and NAME-field OCR matching are both built — see above; these two
remain future strengthenings of match *accuracy*, not the bulk-upload mechanism itself.

**Not part of this system at all — its own future PR:** handwriting OCR of *answer
content* (subjective/written answers, as opposed to the NAME field, which is read),
subjective partial-credit grading, `model_answer`/`keyword_key` on questions,
`marks_awarded`/`ai_summary` on answers. Per current review feedback, subjective grading
isn't a deferred piece of this build, it's a separate PR later — nothing subjective-specific exists in the
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
| `bubble_service.py` | `IBubbleService` | **v2:** pure OpenCV against one fixed, third-party sheet template (outer table border → deskew → fixed bubble positions → fill-ratio read), no AI, no per-sheet cost — viable specifically because the sheet layout is fixed and known in advance, not arbitrary; see `omr-extraction-strategy.md` for the full reasoning | `detect_bubbles()` — stateless, image in, structured result (answers + per-question `needs_review` flags) out. `extract_name_region()` crops the header for `IOcrService` to read; no OCR/reading logic of its own |
| `ocr_service.py` | `IOcrService` | Cloud Vision today; another OCR product or an LLM vision call later | Reads the submission header's handwritten NAME field for bulk-upload identification (`accounts-and-roster.md` § Student Identification on Upload) — a separate concern from bubble reading, kept off `IBubbleService` deliberately |
| `llm_service.py` | `ILlmService` | Anthropic (Claude), OpenAI (GPT), etc. | Three calls across the pipelines (§4b, §4c fallback, §4d) — question-mapping is given one subject's whole taxonomy directly (small enough, no shortlisting needed), never a whole book's raw text. No PDF-parsing service — taxonomy authoring is offline/developer-driven, not an app-level AI call (§4a) |
| `storage_service.py` | `IStorageService` | **Implemented:** local disk (`STORAGE_PROVIDER=local`, dev/test default, no cloud credentials needed) — S3 is the documented production target but not implemented yet, so selecting it raises clearly rather than silently doing nothing | DB stores keys/pointers, never file bytes — `ncert_books.pdf_url`, `submissions.image_url` (`database-design.md` §4) |

Config keys: `LLM_PROVIDER`/`LLM_API_KEY`, `STORAGE_PROVIDER`/`LOCAL_STORAGE_PATH`/`S3_*`, `DB_*`, `JWT_*`. Changing a provider
is a config value + one new implementation class — zero changes to any router,
repository, or pipeline orchestration code.

---

## 6. Error Catalog

`1xxxx` common and `2xxxx` auth follow `backend-guide.md` §4's conventions. Domain ranges:

| Range | Domain | Examples |
|---|---|---|
| 2xxxx | Auth | `NO_TOKEN_PROVIDED` 20001·401, `INVALID_AUTH_TOKEN` 20002·401, `TOKEN_EXPIRED` 20003·401, `INVALID_CREDENTIALS` 20004·401, `FORBIDDEN` 20005·403, `INVALID_REFRESH_TOKEN` 20006·401, `INCORRECT_CURRENT_PASSWORD` 20007·401 (`PATCH /api/auth/password`) |
| 3xxxx | Classes / Roster | `CLASS_NOT_FOUND` 30001·404 (also returned to a teacher not assigned to the class — don't reveal existence), `STUDENT_NOT_IN_CLASS` 30002·404, `ROLL_NUMBER_TAKEN` 30003·409, `EMAIL_OR_PHONE_TAKEN` 30004·409 (per-role uniqueness, checked by both `POST /api/accounts/teachers` and `POST /api/accounts/students/bulk`), `TEACHER_NOT_FOUND` 30005·404 (`POST /api/classes/{id}/teachers`) |
| 4xxxx | Subjects / Books / Curriculum Taxonomy | `BOOK_NOT_FOUND` 40001·404, `SUBJECT_NOT_FOUND` 40005·404, `CURRICULUM_NODE_NOT_FOUND` 40006·404 — all read-only lookups, since this data is developer-seeded, not written through the API (`../curriculum-taxonomy.md` § Building the Taxonomy) |
| 5xxxx | Tests / Questions | `TEST_NOT_FOUND` 50001·404, `TEST_ALREADY_PUBLISHED` 50002·409, `QUESTION_PAPER_PARSE_FAILED` 50003·502, `NODE_NOT_IN_BOOK_SCOPE` 50004·422 (a curriculum node from a different book than the test's `book_id`), `QUESTION_NOT_FOUND` 50005·404 |
| 6xxxx | Submissions / Grading | `SUBMISSION_NOT_FOUND` 60001·404, `DUPLICATE_SUBMISSION` 60002·409 (`UNIQUE (test_id, student_id)`), `ANSWER_NOT_FOUND` 60003·404 — `QR_STUDENT_MISMATCH`/`ROLL_NUMBER_MISMATCH`/`MATCH_ALREADY_RESOLVED` deferred to Phase 2 with the identification features they belong to |
| 7xxxx | Reports | `NO_RESULTS_YET` 70001·404 |
| 8xxxx | Files / Storage | `FILE_TOO_LARGE` 80001·413, `INVALID_FILE_TYPE` 80002·422, `STORAGE_UPLOAD_FAILED` 80003·502 |
| 9xxxx | External Services (CV/OCR/AI) | `BUBBLE_DETECTION_ERROR` 90001·502, `LLM_SERVICE_ERROR` 90002·502, `LOW_CONFIDENCE_EXTRACTION` 90003·422 (routes to `needs_review` rather than failing), `IMAGE_TOO_BLURRY` 90004·422, `OCR_SERVICE_ERROR` 90005·502 |

---

## 7. Testing Strategy

See `backend-guide.md` §11 for the mechanics. Priority scenarios per layer:

| Layer | Priority scenarios |
|---|---|
| Routers | Test publish locking `question_node_map`, submission upload always scoped to the caller's own `student_id`, report evidence-filtering (weak nodes only) |
| Repositories | `UNIQUE (test_id, student_id)` on submissions, tree rollup query at fixed depth, cursor pagination |
| Services | `Result` mapping for every failure mode per provider, bubble fill-percentage thresholds against fixture images |

---

## 8. Build Order

1. **Skeleton** — settings, utils (`errors`/`responses`/`logger`/`jwt`/`result`), middleware, DB pool, `main.py`, Docker
2. **Auth + Classes/Roster** — teacher/student login, class CRUD, enrollments (unlocks everything scoped to a class)
3. **Subjects + Curriculum Taxonomy** — developer-seeded directly in the DB (read-only via the API); needed before any test can be set up in a subject
4. **bubble_service** — pure OpenCV bubble reading against the fixed sheet template (§5, `omr-extraction-strategy.md`)
5. **Tests + Questions** — Path A/B setup, whole-taxonomy question mapping + AI pick, publish lock
6. **Submissions** — teacher bulk PDF upload, per-page bubble reading + handwriting NAME-field OCR (`ocr_service`) for roster matching (`accounts-and-roster.md` § Student Identification on Upload), MCQ grading (mechanical), confidence flagging/review. Subjective grading deferred.
7. **Reports** — rollup query, evidence filtering, LLM phrasing — both per-student and class-wide

Each step = model → repository (+ integration tests) → service (if it calls a provider, behind its interface) → router (+ unit tests), per `backend-guide.md` §12's checklist.
