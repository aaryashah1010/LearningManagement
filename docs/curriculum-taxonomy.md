# Curriculum Taxonomy — Subtopic-Level Weak-Area Reports

> Formerly called a "knowledge graph" — renamed because that word overstated what this
> is. A knowledge graph implies multiple relationship types, cross-links, content
> inferred through AI analysis. What's actually here, after review (see § History below),
> is a plain, manually-curated **tree**: Chapter → Topic → Subtopic, one parent per node,
> no AI-generated content, no embeddings. "Curriculum Taxonomy" describes it honestly.

## Why

[OMR grading](omr-grading.md) tags each question with a single **topic** (e.g., "Algebra"), which is enough to tell a student "you're weak in Algebra." That's too coarse to act on — a teacher can't tell if the student is weak in *linear equations* or *quadratic equations* within Algebra, and there's no link from "weak in X" to *what to actually go read*.

This feature replaces the flat topic tag with a **curriculum taxonomy** — Subject → Chapter → Topic → Subtopic — entered once per NCERT textbook, shared across all tests. Every question gets mapped onto a specific node instead of a freeform topic string. Once a student's right/wrong results roll up through the taxonomy, the report can say precisely: *this student is weak in Chapter 10 "Circles" → Topic "Tangents" → Subtopic "Tangent Length"*, and point at the exact NCERT pages that teach it.

## History — why this simplified so much

Earlier drafts of this doc designed an automated ingestion pipeline: upload a PDF, detect
chapter boundaries, run one AI call per chapter to classify Topics/Subtopics and write
summaries, compute embeddings for question-matching. On review, that pipeline turned out
to be solving a problem that doesn't exist at the actual scale involved:

- **The catalog is small and fixed.** One tuition, Classes 8–10, four subjects — 12
  subject-class combinations, 5–10 chapters each. Not hundreds of books, not growing
  week to week.
- **Chapter and Topic names are already printed in the book.** The NCERT table of
  contents lists them directly — there's no failure mode where AI-derived chapter
  boundaries are *more* correct than what's on the page. An automated pipeline was
  mainly re-deriving something already available for free.
- **Subtopic is the only level needing real judgment**, and even there, the total volume
  (~500–1000 entries across all 12 books) is small enough for direct manual entry to be
  more reliable and controllable than an unvalidated AI classification step.

So: the automated ingestion pipeline, per-chapter AI calls, AI-written summaries, and the
embedding-based question-matching shortlist are all **dropped**, not deferred — they were
solving a scale problem this project doesn't have. What's kept is described below.

## Structure

```
Subject
 └─ Chapter
     └─ Topic
         └─ Subtopic
```

- **Subject** — e.g., Mathematics, Physics. Its own table, not a node in the tree below.
- **Chapter** — matches an NCERT chapter directly (name + page range). Entered from the
  book's own table of contents.
- **Topic** — the chapter's own numbered sections (e.g., "6.2 Similar Figures"). Also
  printed in the book, entered the same way.
- **Subtopic** — finer concepts within a topic, not given their own heading in the book
  (e.g., within "Tangents": "Tangent Length," "Number of Tangents from a Point"). The one
  level needing a person to read the section and decide the breakdown.

Each node stores only: its name, its parent, its level (`chapter`/`topic`/`subtopic`),
and a page range pointing at the source book. **No summary field, no embedding.**
Matching (below) uses the node's own name plus its path, not any authored description.

**The taxonomy never stores any student's marks.** It's shared, read-only reference data — the same "Tangent Length" node is used by every student, every class, every test that touches it. Results live separately (see [Data Model](#data-model--results-live-separately-from-the-taxonomy)).

## Building the Taxonomy

**Revised — developer-authored, not a teacher-facing app feature.** One-time, per book
(12 books total, not a recurring pipeline), done by a developer directly against the
database, the same way the first teacher account is seeded rather than created through
an API route:

1. **Open the book's table-of-contents page(s)** for Chapter/Topic names and page
   ranges — already printed, nothing to infer.
2. **Upload those TOC pages (and, for Subtopics, the relevant chapter's full text) to
   Claude or ChatGPT** — the web app, not an API call — and ask it to draft a
   structured Chapter → Topic → Subtopic breakdown. This is a drafting aid, not a
   pipeline: one-off, human-supervised, never repeated or trusted unverified.
3. **Verify the draft against the actual book** before entering anything — Chapter/Topic
   against the printed page (a transcription check), Subtopic against the bar in
   [Open Questions](#open-questions): each one should be *"a single atomic, testable
   idea."* Correct anything the AI got wrong, too vague, or split oddly.
4. **Enter the final, verified structure directly into `curriculum_nodes`** — a SQL
   seed/script, not an app endpoint. There is no `POST /api/subjects/{id}/books`
   upload, no in-app PDF parsing, no `confirmed`/review flow — every row is entered
   whole and correct, not proposed-then-confirmed.

No staging tables, no PDF-parsing service, no per-chapter AI call at request time, no
embedding step, and — unlike the earlier design — no teacher-facing upload/confirm UI
at all. The app only ever *reads* this data (test setup, question mapping, reports);
it's never written to through the API.

**Not building yet, but worth naming:** teacher-facing editing (fixing a typo, adding a
missed subtopic) isn't built now — content is static once entered, so a rare correction
is a one-off `UPDATE` a developer runs directly, not worth a whole edit API/UI for. If
corrections turn out to be frequent in practice, add a scoped write path then (e.g. a
`PUT /api/books/{id}/curriculum/{node_id}` for teachers) — this doesn't block that, since
the underlying `curriculum_nodes` table doesn't change shape either way.

## Mapping Questions onto the Taxonomy

Happens once per test, at setup — never touched again afterward (`tests.published_at`
locks it, same as before).

- **No embedding shortlist step.** One subject's whole taxonomy (all its chapters' names,
  topics, and subtopics — realistically a few hundred short entries) is small enough to
  send **directly** in one prompt, alongside the question text. No embeddings, no cosine
  similarity, no candidate narrowing — the AI just picks the matching path directly from
  the full list.
- **The AI picks the most specific match** — ideally a Subtopic, falling back to Topic or
  Chapter if the question is broader. Same principle as before: it looks only at the
  question text, not the answer or any student's response.
- **Teacher review** — the review screen shows `{question → node path}` for confirmation,
  same as the rest of test setup.

This also means **no `IEmbeddingService`/`embedding_service.py` anywhere in the
architecture** — it existed specifically for this shortlist step, and isn't needed once
the whole taxonomy fits in a prompt directly. See `backend/backend-architecture.md` § 5.

## Data Model — Results Live Separately From the Taxonomy

Same principle as before, table name updated: `curriculum_nodes` is shared, static
reference data. A student's results are separate rows that each *reference* a node —
they never modify it:

```
Result record:
  student_id
  question_id
  node_id        ← reference only, does not touch the node
  correct: true/false
```

A report is generated by querying one student's own result rows, grouping by the node
each references, and rolling the aggregate up the tree (Subtopic → Topic → Chapter →
Subject), weighted by number of questions per node. Computed per student, on demand,
nothing precomputed onto the taxonomy.

## Reports

**Per-student report** — a drill-down tree with accuracy at every level, weakest nodes
surfaced first. For each weak node: the linked NCERT page range to (re-)read.

**Class-wide report (teacher view)** — same tree and rollup logic, aggregated across the
class's result rows instead of one student's.

**Minimum data requirement.** A node isn't declared weak off a single question — below a
configurable minimum question count, the report shows **"Insufficient Data"** instead of
a confident verdict. Above that minimum, configurable thresholds classify it (e.g.
80–100% Strong, 60–79% Needs Practice, below 60% Weak).

**Historical performance.** Because results persist across every test a student takes in
a subject, a report can show a node's accuracy **per test over time** (Test 1: 35%, Test
2: 48%, ...) — the same rollup query, grouped by test instead of collapsed across all of
them.

In all cases, the LLM's job is limited to **phrasing already-computed evidence** into
readable text — it does not independently judge that a student is weak at something; the
numbers already establish that before the LLM ever sees the data.

## Relationship to Existing Modules

- No change to scanning, OCR, or grading logic — this only replaces "AI predicts a topic
  label" with "question mapped onto a taxonomy node," and "topic-wise chart" with
  "taxonomy roll-up report."
- Depends on the subject's taxonomy already existing (entered once from its NCERT book)
  before a test in that subject can be set up.

## Open Questions

- **Multi-board support.** NCERT is one syllabus; other boards would need their own
  taxonomy entered, or a mapping layer between board syllabi and a shared structure.
- **Cross-chapter/cross-subject prerequisite links** (e.g., weak in a Physics topic
  because of a shaky Math prerequisite) — the current design is a strict tree per
  subject; modeling prerequisites would need real cross-links, which is exactly the kind
  of thing that would make "graph" an accurate word again — not needed now.
- ~~Fixed 3-level cap (Chapter/Topic/Subtopic) vs. deeper nesting~~ — **locked at 3
  levels, no `sub_subtopic`.** Checked against a real NCERT chapter (Class 10 Maths,
  "Circles": Chapter → Topics 10.1–10.3 → Subtopics like "Tangent Length Theorem") — a
  Subtopic is already a single atomic, testable idea at this level (one theorem, one
  mechanism, one grammar rule), with nothing meaningful to split further. A 4th level
  would only chop an already-atomic concept in half, not describe a real sub-concept.
  Also matters given manual entry: another level would multiply the teacher's workload
  directly, and would dilute the "Insufficient Data" threshold by spreading a test's
  questions across even finer nodes. If `level` ever needs to go deeper anyway, bumping
  the fixed `ENUM` by one value keeps lookups/rollups as plain joins — open-ended depth
  (dropping the `ENUM`, `WITH RECURSIVE`, cycle-safety checks) is the fallback if that's
  not enough, but neither is needed now.
- **Domain grouping above Chapter** (e.g. "Geometry" spanning Circles, Triangles,
  Coordinate Geometry) — raised by a teammate's curriculum hierarchy, not yet resolved
  whether it's a real structural need or just a descriptive label. If real, the
  recommended approach is a lightweight `domain` tag on Chapter nodes, not a new tree
  level — no new ingestion step, no re-parenting, since chapters are already manually
  entered. Depends on what it's actually needed for.
