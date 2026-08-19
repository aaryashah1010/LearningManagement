# Learning Management Backend — Architecture & Module Inventory

> Companion to `database-design.md` (schema source of truth), `backend-guide.md` (the
> style bible — Result pattern, repositories, the service-layer provider-abstraction
> pattern, testing), and the product docs (`../omr-grading.md`, `../subjective-grading.md`,
> `../knowledge-graph-analytics.md`, `../accounts-and-roster.md`). This doc defines
> **what** we build: module inventory, every endpoint, error-code domains, external
> services, and the core pipelines.

---

## 0. Stack — decided

**Python + FastAPI**, single backend, no service split. Resolved this way after weighing
it directly (see conversation history / team discussion):

- Nearly every core feature here is CV/AI/ML-shaped — OMR answer extraction (OpenCV
  and/or AI-vision, method left open per `../omr-grading.md`, current version),
  handwriting OCR, PDF text extraction, embedding calls + cosine similarity, and LLM
  calls at four separate pipeline stages. That's the majority of the product, not one
  isolable slice of an otherwise generic CRUD app — so keeping it in one language avoids
  constant cross-service network hops for what is core, not peripheral, functionality.
- FastAPI specifically (over Django): this app is async/I/O-heavy on nearly every
  request (waiting on an LLM call, an embedding call, a DB query, often more than one
  in sequence) — FastAPI's async support is native; Django's is bolted on and fights
  its sync-first ORM. We also hand-wrote the full schema (`database-design.md`) rather
  than wanting an ORM to own migrations, and this is a pure JSON API with no use for
  Django's templating/admin/forms.
- **Every AI/CV/embedding/storage provider sits behind an interface** (`backend-guide.md`
  § Service Layer & Provider Abstraction) — swapping Claude for GPT, or Voyage for
  OpenAI embeddings, or the in-house OpenCV/OCR module for a hosted vendor, is a
  one-file change with zero changes to any router or pipeline code that calls it.

---

## 1. Stack

FastAPI (async) · `mysql-connector-python`/`SQLAlchemy Core` · Pydantic v2 ·
`python-jose` (JWT) · `passlib[bcrypt]` · `structlog` · `slowapi` (rate limiting) ·
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
independently unique, not globally unique across both.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/teacher/register` | public | Create a teacher account (see `../accounts-and-roster.md` § Account Creation — **still an open decision** whether registration is self-service or admin-invited; this route assumes self-service for now) |
| POST | `/teacher/login` | public | Email + password → `LoginResponse[TeacherView]` |
| POST | `/student/login` | public | Email/phone + password → `LoginResponse[StudentView]` — no self-registration route; students are added to a roster by their teacher (§2.2) |
| POST | `/refresh-token` | public | Body `{role}` disambiguates which secret/table to re-verify against |

### 2.2 Classes & Roster — `/api/classes`

Every route scoped to `current_teacher.id` as `teacher_id` — see § Auth & Tenancy.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | teacher | Create a class |
| GET | `/` | teacher | List own classes (paginated) |
| GET | `/{id}` | teacher | Detail + enrollment count |
| POST | `/{id}/enrollments` | teacher | Add a student — body `{student_id}` or `{name, email}` to create-and-add in one step |
| DELETE | `/{id}/enrollments/{student_id}` | teacher | Remove from roster |
| GET | `/{id}/enrollments` | teacher | Roster list |

### 2.3 Subjects & Knowledge-Graph Ingestion — `/api/subjects`, `/api/books`

Implements the pipeline in `../knowledge-graph-analytics.md` § Building the Graph.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/subjects` | teacher | Create a subject (e.g. "Physics") — shared, not class-scoped |
| GET | `/api/subjects` | any authed | List |
| POST | `/api/subjects/{id}/books` | teacher | Upload an NCERT PDF (multipart). Triggers: upload to object storage (`storage_service`) → `pdf_text_service.extract_paged_text()` (writes `book_ingestion_pages`) → bookmark/TOC chapter detection (writes `book_ingestion_chapters`, `source: bookmark\|toc`) |
| GET | `/api/books/{id}/ingestion/chapters` | teacher | Staged chapter boundaries for review |
| PUT | `/api/books/{id}/ingestion/chapters/{chapter_id}` | teacher | Admin edits a proposed boundary (page range, title) — or creates one manually if detection found nothing (`source: manual`) |
| POST | `/api/books/{id}/ingestion/generate` | teacher | One `llm_service.classify_chapter()` call per staged chapter (slice-and-join over `book_ingestion_pages`) → writes unconfirmed `graph_nodes` rows (`summary_embedding` still `NULL`) |
| GET | `/api/books/{id}/graph` | any authed | The generated tree, for review — rename/merge/split |
| POST | `/api/books/{id}/graph/confirm` | teacher | Locks the tree, then **one batched** `embedding_service.embed()` call across every node (`database-design.md` § Design Decisions), deletes staging rows for this book |

### 2.4 Tests & Questions — `/api/classes/{class_id}/tests`, `/api/tests`

Implements `../omr-grading.md` § Test Setup and `../subjective-grading.md` § Test Setup.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/classes/{class_id}/tests` | teacher | Create a test: `subject_id`, `title`, `setup_path: in_app\|uploaded_pdf` |
| POST | `/api/tests/{id}/questions/upload` | teacher | Path B only — multipart question-paper PDF. Extracts answer key (MCQ) / model answer & keyword key (subjective) via `llm_service`, writes `questions` rows |
| GET | `/api/tests/{id}/questions` | teacher | List with proposed node mapping (§4b) for review |
| PUT | `/api/tests/{id}/questions/{q_id}/node` | teacher | Admin corrects the AI-picked node — body `{node_id}` |
| POST | `/api/tests/{id}/publish` | teacher | Sets `published_at` — locks `question_node_map` for this test permanently |

### 2.5 Submissions — `/api/tests/{test_id}/submissions`, `/api/submissions`

Implements `../omr-grading.md` § Scan, Upload & Processing and `../subjective-grading.md`
§ Scan & Processing. **v1 is login-only identification** — no QR, no roll-number, no
teacher bulk-upload; see `../accounts-and-roster.md` § Future / Phase 2 for what comes
back later and why it's deferred, not dropped.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/tests/{test_id}/submissions` | student | Upload own sheet — a single image (in-app guided capture, or a gallery-picked image); v1 is single-page OMR only. `student_id` = caller's own id — this is the only identification path in v1 |
| GET | `/api/submissions/{id}` | teacher, or the owning student | Detail: status, per-question answers, `needs_review` flags |
| PUT | `/api/submissions/{id}/answers/{q_id}` | teacher | Confirm/correct a flagged (`needs_review`) bubble read or OCR extraction |

**Deferred to Phase 2** (not built in v1): `POST .../submissions/bulk` (teacher bulk-upload with QR/roll-number matching) and `PUT /api/submissions/{id}/match` (manual-match-to-roster) — both depend on sheet-based identification that v1 doesn't have.

### 2.6 Reports — `/api/students/{id}/report`, `/api/classes/{id}/report`

Implements `../knowledge-graph-analytics.md` § Reports.

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

**Row-level tenancy, not database-per-tenant** (`database-design.md` § Design Decisions)
— every teacher-scoped repository call filters by `teacher_id` (via `classes.teacher_id`),
resolved from the current `TokenData.id` when `role == "teacher"`. One shared connection
pool; `WHERE` clauses do the isolation.

- `get_current_teacher` / `get_current_student` — FastAPI dependencies, role check on the decoded token.
- `require_own_class` — for routes nested under `{class_id}`, additionally verifies `classes.teacher_id == current_teacher.id` before any repository call runs, returning `CLASS_NOT_FOUND` rather than `FORBIDDEN` for another teacher's class (don't reveal it exists).
- A student's own-data routes (`GET /api/submissions/{id}`, `GET /api/students/{id}/report`) check `current_student.id == {id}` (or, for a submission, that `submissions.student_id == current_student.id`) — students never get a broader "own class" style scope, since they don't own a class.

---

## 4. Core Pipelines

### 4a. Book Ingestion (`../knowledge-graph-analytics.md` § Building the Graph)

```
POST /subjects/{id}/books  (multipart PDF)
        │
        ▼
  storage_service.upload()  →  ncert_books.pdf_url
        │
        ▼
  pdf_text_service.extract_paged_text()  (text layer, or OCR fallback if none)
        │                                      → book_ingestion_pages (one row per page)
        ▼
  chapter boundary detection (bookmarks → TOC parse → nothing found)
        │                                      → book_ingestion_chapters (source: bookmark/toc)
        ▼
  [admin review: GET/PUT /books/{id}/ingestion/chapters — edit or add manually]
        │
        ▼
  POST /books/{id}/ingestion/generate
        │  one llm_service.classify_chapter() call per staged chapter
        │  (slice book_ingestion_pages by page_start/page_end, no cross-chapter reconciliation
        │   needed — boundaries are exact, ../knowledge-graph-analytics.md § Building the Graph)
        ▼
  unconfirmed graph_nodes rows (summary_embedding still NULL)
        │
        ▼
  [admin review: GET /books/{id}/graph — rename/merge/split nodes]
        │
        ▼
  POST /books/{id}/graph/confirm
        │  one batched embedding_service.embed() call across every node
        │  delete book_ingestion_pages / book_ingestion_chapters rows for this book_id
        ▼
  graph ready — usable by any test in this subject from now on
```

### 4b. Question → Node Mapping (test setup)

```
questions extracted (Path A: already in question bank; Path B: parsed from uploaded PDF)
        │
        ▼
  scope: this test's subject_id (+ chapters, if the teacher narrowed it)
        │
        ▼
  SELECT id, name, summary, summary_embedding FROM graph_nodes WHERE <scope>
        │  small result set (tens–hundreds of rows) pulled into app memory
        ▼
  embedding_service.embed([question_text])  →  one small vector
        │
        ▼
  utils/cosine.py — brute-force cosine similarity, in-memory loop over the scoped rows
        │  (no vector DB needed at this scale — database-design.md § Design Decisions;
        │   escape hatch: a DB-native ANN index, only if a subject's graph ever grows
        │   into the thousands of nodes)
        ▼
  top 5–8 candidates  →  llm_service.map_question_to_node(question_text, candidates)
        │  candidates sent as {id, path, summary} — id is what's used to record the
        │  result, path/summary only help the model (and the review screen) judge
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
  cv_ocr_service.detect_bubbles() / .extract_handwriting()  (§5 — in-process, behind ICvOcrService;
        │                                                     v1 = one AI-vision read per sheet, no
        │                                                     caching — omr-extraction-strategy.md)
        ▼
  MCQ: compare to questions.correct_option (plain comparison, no AI)
  Subjective: llm_service.grade_subjective(extracted_text, model_answer/keyword_key) → partial marks + ai_summary
        │
        ▼
  low-confidence bubble/OCR read?  →  answers.needs_review = true  →  PUT /submissions/{id}/answers/{q_id} (teacher confirms)
        │
        ▼
  answers rows written — reference question_id only, never write to graph_nodes
  (database-design.md § Design Decisions — "Results never touch the graph")
```

**Deferred to Phase 2** (`../accounts-and-roster.md` § Future / Phase 2): teacher bulk-upload,
QR decode + mismatch rejection, roll-number lookup, manual-match-to-roster. None of this
is built in v1 — identification is login-only.

### 4d. Report Generation

```
GET /students/{id}/report?subject_id=
        │
        ▼
  report_repository: plain 3-way self-join, graph_nodes scoped to subject_id
        JOIN answers → question_node_map → graph_nodes  (student_id filtered)
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
Summary of what's swappable and why it matters for each:

| Service | Interface | Swappable providers | Notes |
|---|---|---|---|
| `cv_ocr_service.py` | `ICvOcrService` | **v1:** one AI-vision call reads every sheet directly, no caching, no registration — chosen over a cached-template/CV-first design specifically to avoid unvalidated registration risk before real usage justifies the added complexity; see `omr-extraction-strategy.md` for the reasoning and the deferred cached-template design | `detect_bubbles()` for MCQ, `extract_handwriting()` for subjective — stateless, image in, structured result (answers + per-question confidence flags) out. **Cost note:** a real per-submission AI cost, not free-CV — small and bounded at typical class sizes, but not zero; see `omr-extraction-strategy.md` § What still needs deciding for the open cost-at-scale question |
| `pdf_text_service.py` | `IPdfTextService` | Any PDF-parsing library | Used only at book-ingestion time |
| `embedding_service.py` | `IEmbeddingService` | Voyage AI, OpenAI embeddings, etc. | Two call shapes: one short text at question-mapping time, one batched call per book at confirm time |
| `llm_service.py` | `ILlmService` | Anthropic (Claude), OpenAI (GPT), etc. | Four distinct calls across the pipelines (§4a, §4b, §4c, §4d) — never given the whole graph or whole book, only the scoped/shortlisted input each stage actually needs |
| `storage_service.py` | `IStorageService` | S3-compatible object storage | DB stores keys/pointers, never file bytes — `ncert_books.pdf_url`, `submissions.image_url` (`database-design.md` §4) |

Config keys: `LLM_PROVIDER`/`LLM_API_KEY`, `EMBEDDING_PROVIDER`/`EMBEDDING_API_KEY`,
`S3_*`, `DB_*`, `JWT_*`. Changing a provider is a config value + one new implementation
class — zero changes to any router, repository, or pipeline orchestration code.

---

## 6. Error Catalog

`1xxxx` common and `2xxxx` auth follow `backend-guide.md` §4's conventions. Domain ranges:

| Range | Domain | Examples |
|---|---|---|
| 3xxxx | Classes / Roster | `CLASS_NOT_FOUND` 30001·404, `STUDENT_NOT_IN_CLASS` 30002·404, `ROLL_NUMBER_TAKEN` 30003·409 |
| 4xxxx | Subjects / Books / Ingestion | `BOOK_NOT_FOUND` 40001·404, `CHAPTER_BOUNDARY_INVALID` 40002·422, `GRAPH_NOT_CONFIRMED` 40003·409, `PDF_TEXT_EXTRACTION_FAILED` 40004·502, `PDF_HAS_NO_TEXT_LAYER` 40005·422 (routed to OCR fallback instead of failing outright) |
| 5xxxx | Tests / Questions | `TEST_NOT_FOUND` 50001·404, `TEST_ALREADY_PUBLISHED` 50002·409, `QUESTION_PAPER_PARSE_FAILED` 50003·502, `NODE_NOT_IN_SUBJECT_SCOPE` 50004·422 |
| 6xxxx | Submissions / Grading | `SUBMISSION_NOT_FOUND` 60001·404, `DUPLICATE_SUBMISSION` 60002·409 (`UNIQUE (test_id, student_id)`) — `QR_STUDENT_MISMATCH`/`ROLL_NUMBER_MISMATCH`/`MATCH_ALREADY_RESOLVED` deferred to Phase 2 with the identification features they belong to |
| 7xxxx | Reports | `NO_RESULTS_YET` 70001·404 |
| 8xxxx | Files / Storage | `FILE_TOO_LARGE` 80001·413, `INVALID_FILE_TYPE` 80002·422, `STORAGE_UPLOAD_FAILED` 80003·502 |
| 9xxxx | External Services (CV/OCR/AI) | `CV_OCR_ERROR` 90001·502, `LLM_SERVICE_ERROR` 90002·502, `EMBEDDING_SERVICE_ERROR` 90003·502, `LOW_CONFIDENCE_EXTRACTION` 90004·422 (routes to `needs_review` rather than failing) |

---

## 7. Testing Strategy

See `backend-guide.md` §11 for the mechanics. Priority scenarios per layer:

| Layer | Priority scenarios |
|---|---|
| Routers | Test publish locking `question_node_map`, submission upload always scoped to the caller's own `student_id`, report evidence-filtering (weak nodes only) |
| Repositories | `UNIQUE (test_id, student_id)` on submissions, tree rollup query at fixed depth, staging-table cleanup after graph confirm, cursor pagination |
| Services | `Result` mapping for every failure mode per provider, cosine similarity correctness on known vectors, bubble fill-percentage thresholds against fixture images |

---

## 8. Build Order

1. **Skeleton** — settings, utils (`errors`/`responses`/`logger`/`jwt`/`result`), middleware, DB pool, `main.py`, Docker
2. **Auth + Classes/Roster** — teacher/student login, class CRUD, enrollments (unlocks everything scoped to a class)
3. **Subjects + Book ingestion** — upload → extract → chapter detection → review → AI generation → confirm → embeddings (needed before any test can be set up in a subject)
4. **cv_ocr_service** — AI-vision bubble reading first (§5, `omr-extraction-strategy.md`), handwriting OCR second
5. **Tests + Questions** — Path A/B setup, node-mapping shortlist + AI pick, publish lock
6. **Submissions** — upload (login-only identification, v1), grading (mechanical MCQ + AI subjective), confidence flagging/review
7. **Reports** — rollup query, evidence filtering, LLM phrasing — both per-student and class-wide

Each step = model → repository (+ integration tests) → service (if it calls a provider, behind its interface) → router (+ unit tests), per `backend-guide.md` §12's checklist.
