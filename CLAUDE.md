# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 0. Project Structure

- `backend/` — Python + FastAPI, `app/utils/result.py` Result pattern (no stray exceptions
  from business logic), one shared MySQL database (not database-per-tenant). No per-teacher
  access scoping — any authenticated teacher can act on any class/student; `classes` has no
  `teacher_id` column (removed, reversible if this is ever needed — see
  `accounts-and-roster.md` § Tenancy Model). Style guide: `docs/backend/backend-guide.md`.
  Module/endpoint inventory, pipelines, error catalog: `docs/backend/backend-architecture.md`.
  Schema source of truth: `docs/backend/database-design.md`. OMR extraction design:
  `docs/backend/omr-extraction-strategy.md`.
- No frontend yet — web vs. native app is still an open decision, not started.
- `docs/` — all product and architecture docs. Check here before assuming something isn't
  documented: `omr-grading.md` (current OMR/MCQ scope), `subjective-grading.md` (**out of
  scope for now** — its own future PR, nothing subjective-specific should appear in
  `backend/`), `curriculum-taxonomy.md` (the manually-entered Chapter→Topic→Subtopic tree
  — no AI ingestion pipeline, no embeddings, locked at 3 levels), `accounts-and-roster.md`
  (Teacher/Class/Student model, shared teacher visibility, teacher-issued accounts only,
  no self-registration).
- `refrence/` — a different project's docs, kept only as a style reference for the
  Result-pattern/repository conventions this project's own `backend-guide.md` was adapted
  from. Not part of this product — never treat its content as this project's own design.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

This project has already cut several things back down after over-building them once —
QR/roll-number identification, a cached-template OMR pipeline, embeddings for question
matching, an automated curriculum-ingestion pipeline. All now deliberately simple (see
`docs/curriculum-taxonomy.md` § History and `docs/backend/omr-extraction-strategy.md`).
Don't reintroduce that complexity without it being an explicit decision first.

**No unnecessary comments.** Default to none. Only add one when the WHY is genuinely
non-obvious from the code itself — a hidden constraint, a workaround for a specific
bug, something that would surprise a reader. Never explain WHAT the code does (good
names already do that), never narrate how a decision evolved ("an earlier draft did X,
reversed on review") — that belongs in a commit message or a doc, not the file. If
removing a comment wouldn't confuse a future reader, remove it.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
