# Curriculum Knowledge Graph — Subtopic-Level Weak-Area Reports

## Why

[OMR grading](omr-grading.md) and [subjective grading](subjective-grading.md) both tag each question with a single AI-predicted **topic** (e.g., "Algebra"), which is enough to tell a student "you're weak in Algebra." That's too coarse to act on — a teacher can't tell if the student is weak in *linear equations* or *quadratic equations* within Algebra, and there's no link from "weak in X" to *what to actually go read*.

This feature replaces the flat topic tag with a **curriculum knowledge graph** — Subject → Chapter → Topic → Subtopic — built once from NCERT PDFs, shared across all tests. Every question, from either grading module, gets mapped onto a node in this graph instead of a freeform topic string. Once a student's right/wrong (or partial-credit) results roll up through the graph, the report can say precisely: *this student is weak in Chapter 4 → Topic "Quadratic Equations" → Subtopic "Nature of Roots"*, and point straight at the NCERT page that teaches it.

The graph is infrastructure shared by both grading modules — it doesn't replace either pipeline, it replaces the single "topic" field each of them already produces with a richer, structured node reference.

## Graph Structure

```
Subject
 └─ Chapter
     └─ Topic
         └─ Subtopic
```

- **Subject** — e.g., Mathematics, Physics. Top-level, matches the class/board syllabus.
- **Chapter** — matches NCERT chapter boundaries directly, so the graph structure mirrors the textbook's own table of contents rather than an invented taxonomy.
- **Topic** — a named section within a chapter (NCERT chapters already split into numbered sections, e.g., "4.1 Introduction", "4.2 Nature of Roots").
- **Subtopic** — finer-grained concepts within a topic, where the chapter's own sections aren't granular enough (e.g., within "Nature of Roots": discriminant sign cases, sum/product of roots). Extracted by AI reading the section content, not always 1:1 with NCERT's own numbering.

**Still undecided: whether Subtopic is always the deepest level.** Capping it at exactly these 3 levels below Subject (Chapter/Topic/Subtopic) is the current design, but it hasn't been stress-tested against real chapter content yet, and it's not something you asked for specifically — it was proposed as part of the original design and hasn't been revisited since. See [Open Questions](#open-questions) for what changes if it turns out some chapters genuinely need to go deeper.

Each node stores only:
- Its name and position in the hierarchy (parent link).
- A short AI-generated **summary** of what it covers — a couple of sentences, used only to help match questions to the right node (see below).
- A **pointer** to where it lives in the source material — not the content itself, just a reference: `{ncert_book_id, chapter_id, page_start, page_end}`. The student-facing report uses this to say "go read pages 120–125" — the actual textbook content is never copied into the graph.

This is a tree, not a general graph, with one small exception: a question can occasionally map to more than one subtopic (e.g., a word problem combining two concepts) — so question → node is many-to-many, everything else is strict parent/child.

**The graph itself never stores any student's marks.** It is shared, read-only reference data — the same "Work-Energy Theorem" node is used by every student, every class, every test that touches it. See [Data Model](#data-model--results-live-separately-from-the-graph) below for where results actually live.

## Building the Graph (One-Time Ingestion per Subject/Chapter)

1. Admin/teacher uploads the NCERT PDF for a subject's textbook (once per book, reused across every class and every test that draws on that subject). The raw file is never sent to the AI directly — a textbook PDF can be 60–200MB, almost entirely images, fonts, and formatting rather than text, and no LLM call takes a file like that as input. It's processed in stages instead:
2. **Extract plain text, per page.** If the PDF has a real text layer (true for most official NCERT PDFs), this is a standard, non-AI PDF-parsing step — near-instant, no cost. If it's scanned/image-only with no text layer, OCR runs first to get text out (same OCR idea as handwritten answer sheets, but more reliable on clean printed text). Either way, the actual text content of a book is typically only a few hundred KB — the 200MB was mostly non-text weight. The output is kept indexed **page by page** (page 1's text, page 2's text, ...), not flattened into one blob — that's what makes step 3 below possible.
3. **Find real chapter boundaries, structurally — not arbitrary fixed-size chunks.** In priority order, all non-AI:
   - **PDF bookmarks/outline metadata** — most publisher PDFs (NCERT included) embed a real outline (chapter name + starting page), the same data that shows up as a clickable contents sidebar in a PDF viewer. Read directly, no guessing.
   - **The book's own printed Table of Contents page**, as a fallback — its "Chapter N — Title ... Page X" lines are parsed the same way.
   - **Manual input, always available as an override** — not only when neither of the above exists. Same "automation proposes, human confirms or corrects" pattern as everywhere else in this system: whatever boundaries were found (or not found) are editable by the admin/teacher in the review step below before ingestion runs on them — e.g. fixing an off-by-one page from a bookmark, or entering ranges from scratch if detection found nothing. For a 12–15 chapter book this is a couple of minutes either way, and it's paid once per book, not per test.

   Deliberately not done via fixed-size page chunks (e.g. "every 20 pages"): a chapter boundary found this way is exact, so no chapter or subtopic ever gets cut mid-explanation, and no later step is needed to detect or merge duplicate/split nodes across an arbitrary cut point.

   Once each chapter's `page_start`/`page_end` is known (from whichever of the three sources above), getting that chapter's actual text is just a **slice-and-join** over the page-indexed output from step 2 — concatenate the text of every page from `page_start` to `page_end` into one block. No re-parsing of the PDF, no AI, just an array slice — this is why keeping step 2's extraction page-indexed mattered.

4. **AI runs once per chapter, not once per book.** Each chapter's text (typically a few thousand words — well within any LLM's context window) gets one AI call that:
   - Creates the Chapter node.
   - Splits it into Topic nodes along its own numbered sections.
   - Reads each section and proposes Subtopic nodes for distinct sub-concepts within it, writing a short summary and page-range pointer for each node.

   Because chapter boundaries are already exact, this step needs no cross-call reconciliation or dedup — one chapter in, one clean tree out. (An unusually long chapter that's still too large for one call can be split further and merged — but that's now a same-chapter problem only, not a whole-book one, since chapter identity is never in question.)

   For a typical textbook (10–15 chapters), that's 10–15 small AI calls total — one-time, bounded, and independent of how large the original PDF file was.
5. Quick review screen (same pattern as the answer-key review in the OMR module) — admin skims the generated tree, adjusts chapter page ranges if step 3 got one wrong (or enters them if none were detected), renames/merges/splits nodes as needed, confirms.
6. Graph is stored once and reused by every test, every class, every teacher working from that same textbook — this ingestion cost is paid once per book, not per test.

**Embeddings are computed after confirmation, not right after step 4.** The reasoning model that generates the tree (step 4) and the embedding model that produces `summary_embedding` are different models entirely, called separately — generating a node's text and embedding it are never the same API call. Embedding immediately after step 4 would waste work: the admin's review in step 5 can rename a node, edit its summary, or merge/split nodes, which would invalidate an embedding computed on the pre-review text. So `summary_embedding` stays `NULL` through steps 4–5, and only once the admin confirms does one **batched** embedding call run — covering every finalized node in the book at once (most embedding providers accept many texts in a single request), rather than one call per node scattered across chapter generation.

**Where steps 2–5 hold their data in the meantime.** Extraction, boundary detection, and review span multiple separate requests (upload now, review later, edit, confirm) — this can't rely on server memory, since nothing guarantees those requests hit the same process. Two temporary staging tables carry it instead: `book_ingestion_pages` (per-page extracted text) and `book_ingestion_chapters` (proposed chapter boundaries, editable by the admin in step 5). Both are deleted once a book's `graph_nodes` are confirmed — they're ingestion scratch data, not part of the graph itself. See [database-design.md § Design Decisions](backend/database-design.md#3-design-decisions) for the schema.

## Mapping Questions onto the Graph

This replaces the single "topic prediction" step described in the OMR and subjective grading docs, and happens once per test, at setup — never touched again afterward.

- **Scope first, structurally:** the teacher already picks the subject (and usually chapters) a test covers at setup, which narrows the search to a small part of the graph before AI looks at anything — most of the graph is irrelevant to any given test.
- **Shortlist by meaning:** within that scope, the question's text is compared against each candidate node's short summary using semantic similarity (an embedding-based lookup) to shortlist a handful of the closest-matching nodes. This is the *only* embedding this feature needs — a small one, computed once per node when the graph is built, used purely to narrow candidates before the AI picks. It is not the same as embedding the full textbook content — no such content-level embedding or retrieval system is needed here (see [Non-Goals](#non-goals-for-now) below).
- **AI picks the best match:** the AI is given the question text plus that short shortlist (name, path, summary) and picks the single most specific node — ideally a Subtopic, falling back to Topic or Chapter if the question is broader. Same principle as before: AI looks only at the question text, not the answer or any student's response.
- **Teacher review:** the review screen shows `{question → node path}` (e.g., "Q7 → Algebra → Quadratic Equations → Nature of Roots") instead of a flat topic string, same optional-but-recommended confirmation step as today. Once confirmed, this mapping is locked for the test and never re-classified later.

## Data Model — Results Live Separately From the Graph

The graph is shared, static reference data. A student's results are separate rows that each *reference* a node — they never modify it:

```
Result record:
  student_id
  question_id
  node_id        ← reference only, does not touch the node
  correct: true/false        (OMR)
  partial_marks: 2/5         (subjective)
```

A report is generated by querying **one student's own result rows**, grouping them by the node each references, and rolling the aggregate up the tree (Subtopic → Topic → Chapter → Subject), weighted by number of questions/marks per node rather than a flat average. This computation happens per student, on demand — nothing is precomputed or stored on the graph itself.

Because results persist and reference the same shared graph across every test a student takes, the rollup isn't limited to one test — it reflects accumulated performance in that subject over time.

## Reports

**Per-student report** — built only from that student's own result rows: a drill-down tree (Subject → Chapter → Topic → Subtopic) with an accuracy score at every level, weakest nodes surfaced first. For each weak node: the linked NCERT page range to (re-)read. The report states *what to improve and where to read* — it does not attempt to re-explain the concept itself; that's the textbook's job, not the AI's (see [Non-Goals](#non-goals-for-now)).

**Class-wide report (teacher view)** — same tree and rollup logic, but aggregated across every student's result rows in the batch instead of one student's — shows which subtopics the whole class is weak in, to decide what to re-teach. Same shape as the class-wide views already in both grading modules.

In both cases, the LLM's job is limited to **phrasing already-computed evidence** (accuracy per node, rolled up from real result rows) into readable text — it does not independently judge that a student is weak at something; the numbers already establish that before the LLM ever sees the data.

## Relationship to Existing Modules

- No change to scanning, OCR, or grading logic in either module — this only replaces the "AI predicts a topic label" step with "AI picks a graph node," and replaces "topic-wise chart" with "graph roll-up report."
- Both modules' Path A (in-app question bank) and Path B (uploaded PDF) setup flows feed into this the same way: whatever produces a topic tag today produces a node reference instead.
- Depends on the subject's graph already existing (ingested from its NCERT PDF) before a test in that subject can be set up — first test in a new subject requires that one-time ingestion step first.

## Non-Goals (For Now)

Deliberately out of scope, to keep this buildable:

- **Full-textbook RAG.** Chunking and embedding the entire NCERT text for the AI to quote/paraphrase inside a generated explanation is not needed — a page-range pointer is enough for the report to tell the student where to read. This could be revisited later if the report is ever expected to explain concepts in its own words, not just point at the source.
- **Question difficulty tagging.** An AI guess at difficulty (easy/medium/hard) is an unreliable, subjective signal on its own — not worth adding to question metadata for now. If ever wanted later, the better version isn't an AI guess but an *empirical* one: once enough students take a test, "% of students who got this question right" gives real difficulty for free, computed from actual results rather than guessed at setup time — a simple later enhancement, not a metadata re-classification step.

## Build Order

Roughly the order this gets built in, since later phases depend on earlier ones existing and working:

1. OMR/subjective grading pipelines already working (existing docs).
2. Question → node mapping at test setup (AI classification + teacher review).
3. Knowledge graph ingestion from NCERT PDFs (can be built in parallel with #2, since #2 depends on a graph existing to map into).
4. Result rows referencing nodes, captured as students are graded.
5. Rollup query (per student, per class) that aggregates result rows up the tree.
6. Report generation — structured rollup data handed to an LLM for phrasing only.

## Open Questions

- Multi-board support: NCERT is one syllabus; other boards (state boards, ICSE) would need their own textbook ingestion into the same graph shape, or a mapping layer between board syllabi and a shared graph.
- Cross-chapter/cross-subject prerequisite links (e.g., weak in a Physics topic because of a shaky Math prerequisite) — the current design is a strict tree per subject; modeling prerequisites would need real cross-links, which is why this is called a "knowledge graph" loosely today but is actually a tree — worth revisiting if prerequisite-aware recommendations become a goal.
- **Fixed 3-level cap (Chapter/Topic/Subtopic) vs. deeper nesting — still undecided.** Two options if 3 levels turns out to be too shallow for some content:
  - **Bump the cap by one level** (e.g. add `sub_subtopic`) — small change, stays a fixed/known depth, so lookups and rollups stay plain joins (see [database-design.md § 5](backend/database-design.md#5-mysql-ddl-full-schema)), just one more join than today.
  - **Open-ended depth** — drop the fixed level enum, nest however deep a chapter's content actually needs. This needs `WITH RECURSIVE` queries instead of plain joins for both walking down the tree and rolling scores up, since depth is no longer known ahead of time. Recursive tree queries are a standard, well-supported SQL pattern (not a reason on their own to reach for a graph database — see the graph-DB discussion above), but they do need one safeguard: a cycle in `parent_id` (a node accidentally becoming its own ancestor) would make the query recurse forever. MySQL (8.0.19+) enforces a default recursion-depth cap (`cte_max_recursion_depth`, default 1000) so a runaway query errors out rather than hanging — worth also validating at the application layer, when a node's `parent_id` is edited in the review screen, that the new parent isn't already one of that node's own descendants. This path also needs MySQL 8.0+ (already assumed elsewhere in the schema for `JSON` columns).

  Not resolved either way yet — revisit once real chapter content shows whether 3 levels is actually too shallow, rather than deciding this up front.
