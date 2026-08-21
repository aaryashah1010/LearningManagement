# Accounts, Roster & Tenancy

## Why

[OMR grading](omr-grading.md) and [subjective grading](subjective-grading.md) both assume "a teacher login" and "a student login" exist, but neither says how those accounts come to exist, who manages the roster, or what stops one teacher from seeing another teacher's students. This doc covers that foundation — it's not specific to either grading module, both depend on it.

## Tenancy Model — Admin + Class-Scoped Teachers (Revised again)

**Decided:** a third role, `admin`, sits above `teacher` — stored as `teachers.role`
(`'teacher'` or `'admin'`), not a separate table or account type. An admin is a
"super-teacher": creates teacher accounts, creates student accounts, creates classes, and
assigns teachers to classes. A plain teacher is scoped to only the classes they've been
assigned to via `class_teachers` (many-to-many — a teacher can be assigned to several
classes, a class can have more than one teacher, e.g. different subjects):

```
Admin
  ├─ creates Teacher accounts, Student accounts, Classes
  └─ assigns Teacher ↔ Class  (class_teachers)

Teacher (scoped)
  └─ Class (only ones they're assigned to)
        └─ Students (enrolled) — view roster, remove/transfer within assigned classes
```

**Why this exists at all:** an earlier revision removed per-teacher scoping entirely (any
teacher could act on any class) because a bare ownership boundary alone recreates the
original problem — no one could add a new teacher to a class, or move a student across
teachers, without already having the access to do it. Admin is the piece that was missing:
someone has to be able to grant that access in the first place. Without an admin layer,
scoping is just a wall with no door.

**Who can do what:**
- **Admin-only:** `POST /api/accounts/teachers`, `POST /api/accounts/students/bulk`,
  `POST /api/classes/` (create), `POST/DELETE /api/classes/{id}/teachers/{teacher_id}`
  (assign/unassign). Admin bypasses class-assignment scoping entirely — not assigned to
  specific classes themselves, they act across all of them.
- **Teacher (assigned classes only):** `GET /api/classes/` (their own classes only —
  `ClassRepository.list_assigned_classes`, not `list_all`), `GET /{id}`,
  `GET /{id}/enrollments`, `PATCH/DELETE .../enrollments/{student_id}` (roster
  management — day-to-day, not account creation). Accessing a class they're not assigned
  to returns `CLASS_NOT_FOUND`, not `FORBIDDEN` — same "don't reveal existence" pattern
  used everywhere else in this API.
- **Bootstrap:** the very first account is seeded as `role = 'admin'` directly
  (`seed.sql`), same pattern as before — account creation always requires an
  already-logged-in admin, so the first one can't come through the API.

**This is still not a one-way door.** If the product later needs finer-grained
distinctions (e.g. an admin scoped to one institute among several), the underlying
Teacher/Class/Student shape doesn't change — only the role enum and the assignment
table would need to grow.

## Student Account Creation — Locked: Teacher-Issued, No Self-Registration

**Decided:** the teacher uploads their class list (name, date of birth, and contact per
student — a bulk list, not one-by-one manual add), via `POST /api/accounts/students/bulk`,
and the system creates each student account with a **default password derived from their
own date of birth** (`DDMMYYYY`, e.g. `03052010`), which they're expected to change via
`PATCH /api/auth/password` after their first login. `date_of_birth` is a required field on
every student, alongside the existing "at least one of email/phone" requirement.

This is deliberately *not* a randomly-generated password returned through the API —
returning a plaintext secret in an API response is its own exposure risk (server access
logs, browser dev tools, saved request-history tooling like Postman). A DOB-derived
default needs no secret to ever be generated, stored temporarily, or transmitted through
any system at all — the student already knows their own birthday, so the "credential" is
never in transit anywhere. The tradeoff: a birthdate is guessable by someone who knows
the student personally (a classmate, sibling), not a cryptographically strong secret —
acceptable here specifically because the mandatory post-first-login password change
closes that window quickly, and the data behind it (quiz weak-areas) isn't high-stakes.
No student self-registration route exists. Creating/enrolling a student is admin-only
(§ Tenancy Model); day-to-day roster management (remove/transfer within a class) stays
with a teacher assigned to that class.

**Matching an existing student never resets their password or date of birth.** If an
entry in the bulk list matches an already-existing account (by email/phone — e.g. the
same student being added to a second class), that account's real password and stored
`date_of_birth` are both left untouched.

This resolves the "Option 1 vs Option 2" question from the earlier draft of this section
in favor of Option 1 (admin creates accounts) — Option 2 (student self-registers, then
joins via a code) isn't being built.

## Teacher Account Creation — Locked: Admin-Only, Separate Endpoint

**Decided:** there's no self-registration route for teachers either — **an admin creates
teacher accounts**, through its own endpoint (`POST /api/accounts/teachers`), separate
from student creation rather than one shared mechanism with a `role` field in the
request. A new teacher account is a rare, one-at-a-time addition (unlike a 30-row class
roster), so the admin supplies that new teacher's password directly in the request — no
default-password mechanism needed there. New accounts created this way are always plain
`role = 'teacher'` — there's no way to create another admin through the API at all,
matching the bootstrap-only pattern below.

**Bootstrap:** since account creation always requires an already-existing, already-logged-in
admin, the very first account can't come through this mechanism — it has to be seeded
directly as `role = 'admin'` (a one-time DB seed/fixture at setup, not an API route).
Every teacher after that is created by an admin; every admin after that first one would
need its own deliberate mechanism, not built now since there's no stated need for more
than one.

## Student Identification on Upload

**v1 was login-only identification; superseded by teacher bulk-upload once that requirement actually landed.** The original MVP had a student log into their own account, select the test, and upload their own sheet — the submission was automatically theirs, no QR/roll-number/name-matching needed, and it worked for *any* sheet layout since the login already carried identity. That's no longer how submissions arrive — see below.

**Current: teacher bulk-upload with OCR name-matching.** A teacher uploads one PDF containing every student's filled sheet for a test (one page per student — see [omr-extraction-strategy.md](backend/omr-extraction-strategy.md) for the sheet template). There's no login per sheet to derive identity from, so each page's handwritten NAME field is OCR'd (via the existing `ILlmService` vision call — no new provider) and exact-matched, case/whitespace-normalized, against the class roster. A page whose name doesn't exactly match anyone still becomes a `submissions` row — `student_id` stays `NULL`, `status = 'needs_review'`, `raw_extracted_name` holds what OCR read — rather than being silently dropped, so a teacher can resolve it manually. This is the "no identifying mark" fallback below, just arrived at via an OCR mismatch instead of a sheet with genuinely nothing on it.

**Accepted limitations of exact-name matching:** two students with the same or very similarly-spelled name, or messy handwriting OCR misreads, can produce a wrong or missed match with no fuzzy correction — deliberately simple for now (see below), not yet solved by a confidence-scored/fuzzy match.

## Future — Roll Number / QR as a Stronger Identifier

`omr-grading.md` §29 names standardized templates, QR codes, custom-template calibration, and bulk upload as planned future improvements. Bulk upload itself has now shipped (above, via name-OCR); QR and roll-number remain future strengthenings of *matching accuracy*, not abandoned ideas:

- **App-generated QR code:** would encode the student's actual account ID directly (not a "roll number" — no need to invent one when the app controls both sheet generation and the student table). Scan → read QR → look up that ID directly. On mismatch (QR belongs to a different student than expected), reject before grading runs. Strongest option, but requires the app to generate and distribute the sheet, not the tuition's own pre-printed stock.
- **Physical roll-number bubble grid** on the tuition's own pre-existing OMR sheet stock: would need an optional `roll_number` field, populated by the teacher per student, scoped unique **within a class** (not globally) since roster/results are already class-scoped. Weaker than a QR check since it's hand-filled, not printed — worth flagging a mismatch rather than treating it as a hard reject.

Neither is in the current schema (`database-design.md`) — add `roll_number`/`qr_decoded_student_id` and any mismatch-rejection fields back when one of these is actually built, rather than carrying unused columns now.
