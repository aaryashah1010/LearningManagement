# Accounts, Roster & Tenancy

## Why

[OMR grading](omr-grading.md) and [subjective grading](subjective-grading.md) both assume "a teacher login" and "a student login" exist, but neither says how those accounts come to exist, who manages the roster, or what stops one teacher from seeing another teacher's students. This doc covers that foundation — it's not specific to either grading module, both depend on it.

## Tenancy Model — Shared Visibility, No Per-Teacher Scoping (Revised)

**Decided:** for now, all teachers share visibility over all classes and students — there is
no per-teacher ownership boundary. Any authenticated teacher can view/manage any class,
enroll/transfer/remove any student, and (once built) any test/submission/report, regardless
of who created it. `classes` has **no `teacher_id` column at all** — it was removed
entirely, not just left unused, since nothing read it (no access check, no "created by"
display — there's no frontend yet).

```
Teacher (any)
  └─ Class (batch)
        └─ Students (enrolled)
```

This fits a small tuition where the teaching staff already trust each other and effectively
work as one team — a per-teacher access boundary was solving a problem that doesn't exist yet
at that scale, and was adding real complexity (every list/detail query needed an ownership
check, plus a column nothing else used) for no current benefit.

**This is explicitly reversible — not a one-way door.** If the product ever actually needs
per-teacher or per-institute separation (e.g. a tuition wants teachers walled off from each
other, or an admin/owner role needs to see across teachers), add it back:
1. Re-add `classes.teacher_id` (FK to `teachers`, `NOT NULL`) — or, for real co-teaching
   support, a `class_teachers` join table instead of a single owner column.
2. Re-add the ownership check each route lost (`_ensure_own_class`-style: fetch, compare,
   return `CLASS_NOT_FOUND` on mismatch rather than `FORBIDDEN`, so existence isn't leaked)
   and scope `list_all`/roster/test/result queries by it again.

The underlying Teacher/Class/Student shape is unchanged either way — this was a deliberate,
scoped simplification (same pattern as dropping `roll_number` in `database-design.md` §
Design Decisions), not a design dead end.

## Student Account Creation — Locked: Teacher-Issued, No Self-Registration

**Decided:** the teacher uploads their class list (name + contact per student — a bulk
list, not one-by-one manual add), via `POST /api/accounts/students/bulk`, and the system
creates each student account and issues its own credentials — every new student gets the
same system-wide default password (`DEFAULT_STUDENT_PASSWORD`, env-configured, not
per-student), which they're expected to change via `PATCH /api/auth/password` after their
first login. No student self-registration route exists. Fits a tuition where the teacher
already has the full class list, and a shared default is simpler to build and hand out
than generating/tracking a unique password per student. Roster management (add/remove/edit,
matching a student to a `class_enrollments` row) stays with the teacher throughout.

This resolves the "Option 1 vs Option 2" question from the earlier draft of this section
in favor of Option 1 (teacher/admin creates accounts) — Option 2 (student self-registers,
then joins via a code) isn't being built.

## Teacher Account Creation — Locked: Separate Endpoint, No Self-Service

**Decided:** there's no self-registration route for teachers either — **an existing
teacher creates other teacher accounts**, but through its own endpoint
(`POST /api/accounts/teachers`), separate from student creation rather than one shared
mechanism with a `role` field. A new teacher account is a rare, one-at-a-time addition
(unlike a 30-row class roster), so the creating teacher supplies that new teacher's
password directly in the request — no default-password mechanism needed there. No
admin/owner role needed — that dependency from the earlier draft of this section is
resolved by not needing an admin role in the first place.

**Bootstrap:** since account creation always requires an already-existing, already-logged-in
teacher, the very first teacher account can't come through this mechanism — it has to be
seeded directly (a one-time DB seed/fixture at setup, not an API route), same pattern as
seeded admin accounts in other systems. Every teacher after that first one is created by
an existing teacher.

## Student Identification on Upload

**MVP: login is the only identification.** A student logs into their own account, selects the test, and uploads their sheet — the submission is automatically theirs. No QR code, no roll number, no name-matching, no manual roster-matching screen. This works for *any* sheet layout, which is also why the current [omr-grading.md](omr-grading.md) MVP doesn't require a standardized template: since the student's login already identifies them, the sheet itself never needs to carry identifying information at all.

One accepted limitation of this: a student could upload a photo of a classmate's filled sheet under their own account, by mistake or otherwise, and MVP has no way to catch that — there's nothing on the sheet to cross-check against. Not solved for now, consistent with keeping MVP scope to what's actually needed.

## Future / Phase 2 — Teacher Bulk-Upload & Sheet-Based Identification

`omr-grading.md` §29 names standardized templates, QR codes, custom-template calibration, and bulk upload as planned future improvements, not abandoned ideas — deferred because MVP's login-based identification doesn't need any of them. Recorded here so the design isn't lost, not because it's being built now:

- **Teacher bulk-uploads on behalf of students without app access, using the app's own generated sheet:** an app-generated QR code would encode the student's actual account ID directly (not a "roll number" — no need to invent one when the app controls both sheet generation and the student table). Scan → read QR → look up that ID directly. On mismatch (QR belongs to a different student than expected), reject before grading runs.
- **Teacher bulk-uploads using the tuition's own pre-existing OMR sheet stock (custom template), which has a physical roll-number bubble grid printed on it:** would need an optional `roll_number` field, populated by the teacher per student, scoped unique **within a class** (not globally) since roster/results are already class-scoped. Weaker than a QR check since a roll number is hand-filled, not printed — worth flagging a mismatch rather than treating it as a hard reject.
- **No identifying mark on the sheet at all:** falls back to a manual thumbnail-to-roster matching screen, teacher-driven, not automatically enforceable.

None of this is in the current schema (`database-design.md`) — add `roll_number`, `qr_decoded_student_id`, and the mismatch-rejection fields back when this phase is actually built, rather than carrying unused columns now.
