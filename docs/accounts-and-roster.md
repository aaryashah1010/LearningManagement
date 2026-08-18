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

Three different situations, each already touched on in the grading docs, tied together here:

- **Student uploads their own sheet, logged in:** identity is already known from the login — no roll number, QR, or matching needed. This is the default and simplest case.
- **Teacher bulk-uploads on behalf of students without app access, using the app's own generated sheet:** the app-generated QR code encodes the student's actual account ID directly (not a "roll number" — there's no need to invent one when the app controls both sheet generation and the student table). Scan → read QR → look up that ID directly.
- **Teacher bulk-uploads using the tuition's own pre-existing OMR sheet stock (custom template, Phase 2), which already has a physical roll-number bubble grid printed on it:** this is the *one* case that needs an actual `roll_number` field — an **optional** column on the student record, populated by the teacher per student (since only the teacher knows what roll number their tuition already assigned on paper). Scanned roll number is read via CV, matched against this field. Because roster/results are already scoped by class, this roll number only needs to be unique **within a class**, not globally — two different classes can each have their own "Roll No. 5" with no collision. If no roll-number grid exists on their sheet either, it falls back further to the manual thumbnail-to-roster matching screen already described in `omr-grading.md`.

Every other student never has this field populated — it's not a general account requirement, only a fallback for one specific legacy-sheet scenario.

## Rejecting a Mismatched Sheet (Wrong Student's Sheet Uploaded)

A student could upload a photo of a classmate's filled sheet under their own account instead of their own — by mistake or otherwise. Whether this is catchable depends on the same identification path used above:

- **App-generated sheet (has a QR code):** the QR was encoded with a specific student's ID at print time, before the test was even taken — it's not self-reported, so it's a reliable check. On upload, decode the QR and compare it to the ID of the account doing the upload. **On mismatch, reject the upload immediately** with a clear message (e.g., "This sheet was printed for [Other Student] — it can't be submitted under your account") — before any grading/image processing even runs. This is essentially free, since the QR is already being decoded for identification anyway; it should be standard behavior, not an edge case handled later.
- **Custom sheet with a roll-number grid:** weaker, since a roll number is hand-filled, not printed — someone could still copy a different roll number onto a sheet. Still worth checking: if the scanned roll number doesn't match the uploading student's registered `roll_number`, flag it as a mismatch rather than silently accepting.
- **Custom sheet with no identifying mark at all (manual match-to-roster path):** nothing on the physical sheet ties it to one student, so this can't be enforced automatically — it's an inherent limitation of that fallback, same as already noted above, and relies on the teacher noticing during manual matching rather than a system check.
