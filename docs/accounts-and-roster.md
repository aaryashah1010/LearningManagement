# Accounts, Roster & Tenancy

## Why

[OMR grading](omr-grading.md) and [subjective grading](subjective-grading.md) both assume "a teacher login" and "a student login" exist, but neither says how those accounts come to exist, who manages the roster, or what stops one teacher from seeing another teacher's students. This doc covers that foundation — it's not specific to either grading module, both depend on it.

## Tenancy Model — Teacher ↔ Class ↔ Student

Data must be scoped, not globally visible. The natural boundary is the **class** (a.k.a. batch) — a group of students belonging to one teacher, for one subject/section:

```
Teacher
  └─ Class (batch)
        └─ Students (enrolled)
```

- A teacher only sees/manages students, tests, and results within **their own classes** — never another teacher's, even within the same tuition center.
- Every roster, test-setup, and results/report query is filtered by "classes this teacher owns." This is the minimum needed to prevent cross-teacher data leakage.
- A student can belong to more than one class (e.g., separate Math and Physics classes, possibly different teachers).

**Not building yet, but worth naming:** a tuition/institute could have multiple teachers who should share visibility (e.g., an owner/admin who sees across all of that tuition's classes). That maps to the "admin/owner login" already flagged as a possible future role in `omr-grading.md`. If/when that's needed, the structure extends to `Tuition/Org → Teachers → Classes → Students` — the Teacher ↔ Class ↔ Student layer below stays the same either way, so building it first doesn't block adding the org layer later.

## Student Account Creation — Locked: Teacher-Issued, No Self-Registration

**Decided:** the teacher uploads their class list (name + contact per student — a bulk
list, not one-by-one manual add), and the system creates each student account and issues
its own credentials. No student self-registration route exists. Fits a tuition where the
teacher already has the full class list, and it's simpler to build first than an
invite/join-code flow. Roster management (add/remove/edit, matching a student to a
`class_enrollments` row) stays with the teacher throughout.

This resolves the "Option 1 vs Option 2" question from the earlier draft of this section
in favor of Option 1 (teacher/admin creates accounts) — Option 2 (student self-registers,
then joins via a code) isn't being built.

## Teacher Account Creation — Locked: Same Mechanism as Students, No Self-Service

**Decided:** there's no separate teacher-registration flow at all — **an existing teacher
creates other teacher accounts the same way they create student accounts**, through one
account-creation mechanism with a `role` field (`teacher` or `student`) distinguishing
the two. No self-service public registration, and no admin/owner role needed — that
dependency from the earlier draft of this section is resolved by not needing an admin
role in the first place. Teachers creating a `teacher`-role account skip the class
context (a teacher isn't enrolled anywhere); teachers creating a `student`-role account
still goes through the bulk class-list upload above.

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
