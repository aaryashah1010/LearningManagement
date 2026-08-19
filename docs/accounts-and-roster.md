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

## Account Creation — Open Question

Not yet decided. Two standard patterns, need to pick one:

1. **Teacher/admin creates accounts** — teacher adds students to their class roster (name + contact), system generates credentials or an invite; student sets a password on first login. Roster management (add/remove/edit) lives with the teacher.
2. **Student self-registers, then joins a class** — student signs up independently, then joins a specific teacher's class via a class code or invite link. Teacher still manages who's in their roster, but doesn't create the account itself.

Option 1 is generally simpler for tuition-style setups where the teacher already has the class list (especially for younger students). Neither is implemented yet — flagging here so it isn't silently assumed later.

## Student Identification on Upload

**MVP: login is the only identification.** A student logs into their own account, selects the test, and uploads their sheet — the submission is automatically theirs. No QR code, no roll number, no name-matching, no manual roster-matching screen. This works for *any* sheet layout, which is also why the current [omr-grading.md](omr-grading.md) MVP doesn't require a standardized template: since the student's login already identifies them, the sheet itself never needs to carry identifying information at all.

One accepted limitation of this: a student could upload a photo of a classmate's filled sheet under their own account, by mistake or otherwise, and MVP has no way to catch that — there's nothing on the sheet to cross-check against. Not solved for now, consistent with keeping MVP scope to what's actually needed.

## Future / Phase 2 — Teacher Bulk-Upload & Sheet-Based Identification

`omr-grading.md` §29 names standardized templates, QR codes, custom-template calibration, and bulk upload as planned future improvements, not abandoned ideas — deferred because MVP's login-based identification doesn't need any of them. Recorded here so the design isn't lost, not because it's being built now:

- **Teacher bulk-uploads on behalf of students without app access, using the app's own generated sheet:** an app-generated QR code would encode the student's actual account ID directly (not a "roll number" — no need to invent one when the app controls both sheet generation and the student table). Scan → read QR → look up that ID directly. On mismatch (QR belongs to a different student than expected), reject before grading runs.
- **Teacher bulk-uploads using the tuition's own pre-existing OMR sheet stock (custom template), which has a physical roll-number bubble grid printed on it:** would need an optional `roll_number` field, populated by the teacher per student, scoped unique **within a class** (not globally) since roster/results are already class-scoped. Weaker than a QR check since a roll number is hand-filled, not printed — worth flagging a mismatch rather than treating it as a hard reject.
- **No identifying mark on the sheet at all:** falls back to a manual thumbnail-to-roster matching screen, teacher-driven, not automatically enforceable.

None of this is in the current schema (`database-design.md`) — add `roll_number`, `qr_decoded_student_id`, and the mismatch-rejection fields back when this phase is actually built, rather than carrying unused columns now.
