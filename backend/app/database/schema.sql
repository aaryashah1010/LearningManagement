-- Full DDL for the Learning Management schema.
-- Source of truth: docs/backend/database-design.md §5 — copy this file's
-- content there any time the schema changes, don't edit them independently.

-- role distinguishes an "admin" (super-teacher: creates teacher/student
-- accounts, creates classes, assigns teachers to classes) from a plain
-- "teacher" (scoped to the classes they're assigned to via class_teachers).
-- One table, not a separate admins table — an admin is a teacher with
-- elevated permissions, not a different kind of account.
CREATE TABLE teachers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('teacher','admin') NOT NULL DEFAULT 'teacher',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE students (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NULL UNIQUE,
    phone VARCHAR(20) NULL UNIQUE,
    date_of_birth DATE NOT NULL COMMENT 'default login password is derived from this (DDMMYYYY) — never stored/returned as plaintext',
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_student_has_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE classes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Many-to-many: a teacher can be assigned to several classes, a class can
-- have more than one teacher (e.g. different subjects). Admin-managed —
-- this is the access boundary a plain "teacher" is scoped by; an admin
-- bypasses it entirely (not assigned to specific classes themselves).
CREATE TABLE class_teachers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_id BIGINT UNSIGNED NOT NULL,
    teacher_id BIGINT UNSIGNED NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    UNIQUE KEY uq_class_teacher (class_id, teacher_id)
) ENGINE=InnoDB;

-- No roll_number in v1 — identification is login-only (see § Design
-- Decisions). Add it back (unique per class) when teacher bulk-upload
-- with sheet-based identification is actually built.
CREATE TABLE class_enrollments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uq_class_student (class_id, student_id)
) ENGINE=InnoDB;

CREATE TABLE subjects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- edition_year disambiguates multiple books for the same subject/grade over
-- time (NCERT syllabus revisions) — new syllabus = a new row, old one stays
-- untouched so tests/reports built against it stay valid. See § Design Decisions.
CREATE TABLE ncert_books (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subject_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    grade VARCHAR(20) NULL,
    edition_year YEAR NULL,
    pdf_url VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    INDEX idx_ncert_books_subject (subject_id)
) ENGINE=InnoDB;

-- Adjacency-list tree (Chapter -> Topic -> Subtopic), manually entered —
-- see curriculum-taxonomy.md. No summary/embedding columns: matching a
-- question to a node uses the node's own name + path directly, not an
-- authored description. Developer-seeded (SQL, not an API write path), so
-- every row is entered whole and verified — no confirmed/pending flag.
CREATE TABLE curriculum_nodes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT UNSIGNED NOT NULL,
    parent_id BIGINT UNSIGNED NULL,
    level ENUM('chapter','topic','subtopic') NOT NULL,
    name VARCHAR(200) NOT NULL,
    page_start INT NULL,
    page_end INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES ncert_books(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES curriculum_nodes(id) ON DELETE CASCADE,
    INDEX idx_curriculum_nodes_book (book_id),
    INDEX idx_curriculum_nodes_parent (parent_id)
) ENGINE=InnoDB;

-- book_id, not subject_id — pins a test to one specific book (grade/edition),
-- since a subject can have several (Class 9 vs Class 10, or old vs revised
-- syllabus). subject is derived via book_id -> ncert_books.subject_id, not
-- stored redundantly. See § Design Decisions.
CREATE TABLE tests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_id BIGINT UNSIGNED NOT NULL,
    book_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    setup_path ENUM('in_app','uploaded_pdf') NOT NULL,
    source_pdf_url VARCHAR(500) NULL,
    published_at DATETIME NULL COMMENT 'once set, question_node_map rows for this test are locked — never re-classified',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES ncert_books(id) ON DELETE RESTRICT,
    INDEX idx_tests_class (class_id),
    INDEX idx_tests_book (book_id)
) ENGINE=InnoDB;

-- No test_layout_templates table in v1 — see § Design Decisions above and
-- omr-extraction-strategy.md § Future Optimization for the deferred
-- cached-template design and the schema it would need if ever revisited.

-- MCQ only — no question_type discriminator, no model_answer/keyword_key.
-- Subjective grading is its own future PR; these come back together then,
-- not as unused columns kept around now. See § Design Decisions.
-- option_a-d and image_url are nullable: the manual-entry path (BulkQuestionsRequest)
-- only ever populated question_text/correct_option; the question-paper PDF upload path
-- populates all of them, giving a self-contained stored copy of the paper.
CREATE TABLE questions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT UNSIGNED NOT NULL,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    max_marks DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    correct_option VARCHAR(5) NOT NULL COMMENT 'A/B/C/D',
    option_a TEXT NULL,
    option_b TEXT NULL,
    option_c TEXT NULL,
    option_d TEXT NULL,
    image_url VARCHAR(500) NULL,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    UNIQUE KEY uq_test_question_number (test_id, question_number),
    INDEX idx_questions_test (test_id)
) ENGINE=InnoDB;

-- Question -> curriculum node, many-to-many (usually one node, occasionally
-- two for a question spanning subtopics). Set once at test setup, immutable
-- once the test is published.
CREATE TABLE question_node_map (
    question_id BIGINT UNSIGNED NOT NULL,
    node_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (question_id, node_id),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (node_id) REFERENCES curriculum_nodes(id) ON DELETE RESTRICT,
    INDEX idx_question_node_map_node (node_id)
) ENGINE=InnoDB;

-- One row per page of a teacher-uploaded bulk OMR PDF per test. student_id is
-- nullable — teacher bulk-upload (§ Design Decisions) identifies the student by
-- OCR-reading the sheet's handwritten NAME field and exact-matching it against
-- the class roster; when that match fails, the row is still kept (status =
-- 'needs_review', raw_extracted_name populated) for a teacher to resolve
-- manually, rather than being dropped. MySQL's unique index treats each NULL
-- student_id as distinct, so multiple unresolved rows per test are fine.
-- image_url is a single column, not a one-to-many page relation — v1 is
-- single-page OMR only. Revisit as a submission_pages table if/when
-- multi-page subjective booklets are actually being built (still per-page
-- images then too, not a bundled PDF — see § Design Decisions above).
CREATE TABLE submissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NULL,
    image_url VARCHAR(500) NOT NULL,
    raw_extracted_name VARCHAR(255) NULL,
    status ENUM('pending','processed','needs_review') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_test_student (test_id, student_id),
    INDEX idx_submissions_test (test_id)
) ENGINE=InnoDB;

-- The "Result record" the curriculum-taxonomy rollup reads: one row per
-- question per submission. Which node(s) it counts toward is derived via
-- question_node_map, never stored redundantly here — the taxonomy itself
-- is never written to (see § Design Decisions above).
-- No marks_awarded/ai_summary — MCQ scoring is fully derived from is_correct
-- (score = is_correct ? questions.max_marks : 0). Both come back when
-- subjective grading (variable partial credit, written-answer summaries)
-- is actually built, as their own PR.
CREATE TABLE answers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    submission_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    extracted_answer TEXT NULL,
    is_correct BOOLEAN NULL,
    needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by_teacher BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY uq_submission_question (submission_id, question_id),
    INDEX idx_answers_question (question_id)
) ENGINE=InnoDB;

-- Generated reports, persisted so GET only ever reads — it never recomputes
-- evidence or calls the LLM. POST /api/tests/{id}/report/generate is the only
-- writer: it always recomputes from answers/question_node_map and overwrites
-- the existing row for that test (ON DUPLICATE KEY UPDATE), no report history
-- kept. node_accuracies/node_student_buckets/weak_nodes are stored as JSON,
-- mirroring the ClassReport/StudentReport response models directly — nothing
-- else in the app queries into individual node rows, so normalizing them out
-- into their own tables would add joins with no current use.
CREATE TABLE class_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT UNSIGNED NOT NULL,
    students_evaluated INT NOT NULL,
    average_score_percent FLOAT NULL,
    node_accuracies JSON NOT NULL,
    node_student_buckets JSON NOT NULL,
    summary TEXT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    UNIQUE KEY uq_class_report_test (test_id)
) ENGINE=InnoDB;

CREATE TABLE student_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    score_correct INT NOT NULL,
    score_total INT NOT NULL,
    score_percent FLOAT NULL,
    node_accuracies JSON NOT NULL,
    weak_nodes JSON NOT NULL,
    summary TEXT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uq_student_report (test_id, student_id)
) ENGINE=InnoDB;

-- A student's rollup across every test on one book within one calendar month,
-- keyed by tests.created_at (not published_at, which is nullable and would
-- silently exclude a test from its own bucket). Scoped per book, not subject:
-- curriculum_nodes is a fresh tree per book, so summing node accuracies
-- across two books would mix unrelated node ids together.
-- Recomputed, not incremented, on every generate for this book/month — sums
-- whatever student_reports rows currently exist, so a regenerated test just
-- re-sums the updated set instead of risking double-counting.
CREATE TABLE student_cumulative_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    book_id BIGINT UNSIGNED NOT NULL,
    report_year SMALLINT UNSIGNED NOT NULL,
    report_month TINYINT UNSIGNED NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    tests_included INT NOT NULL,
    score_correct INT NOT NULL,
    score_total INT NOT NULL,
    score_percent FLOAT NULL,
    node_accuracies JSON NOT NULL,
    weak_nodes JSON NOT NULL,
    summary TEXT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES ncert_books(id) ON DELETE CASCADE,
    UNIQUE KEY uq_student_cumulative (student_id, book_id, report_year, report_month)
) ENGINE=InnoDB;
