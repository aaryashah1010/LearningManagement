# OMR Answer Extraction Strategy — Answer Key & Student Sheets

> Implements the extraction side of `ICvOcrService` (`backend-guide.md` § Service Layer).
> Resolves the tension in `../omr-grading.md` (current version) between "any sheet layout
> must work, no calibration step" and the original cost principle "grading a submission
> should be free CV, not per-student AI."

## v1 decision: AI-vision reads every sheet, no caching, no registration

Two designs were weighed against each other for this doc:

- **A cached-template approach** — pure-CV auto-detects a test's bubble grid from its
  first sheet, caches it, and reuses it cheaply for every later submission via image
  registration (feature-matching + homography). Cheapest after the first sheet, but the
  most engineering: registration reliability and structural sanity-check thresholds are
  both unproven, and it's the most code to build (three fallback paths, a template cache,
  a homography step).
- **AI-vision reads every submission directly, independently, no template at all** —
  explicitly allowed as a first-class option in `../omr-grading.md` (not just a lesser
  fallback). Simplest by far: one code path, nothing to cache, nothing to align, no
  registration-reliability question exists because there's nothing to register against.
  Cost is a per-student AI-vision call — small and bounded for a typical class size, not
  a per-test one-time cost, but not the runaway cost a naive reading of "AI cost" might
  suggest either.

**v1 uses the second option.** Given how much of the cached-template approach is
unvalidated, and how fully the simple approach satisfies every stated MVP requirement,
building the complex, cost-optimized version before validating the simple one even works
is optimizing a cost that hasn't been shown to be a real problem yet. The cached-template
design is kept below as a documented **future optimization** — the idea isn't lost, it's
just not what v1 builds.

## Why not pure OpenCV, with no AI at all?

Worth answering directly, since it's a reasonable question to ask. **Fill detection**
— given a known bubble position, measuring whether it's filled — is genuinely simple,
reliable, decades-old technology. Nobody disputes that part; that's exactly the part
described as "easy, like reading structured text out of a PDF" elsewhere in this project's
docs. The part that's hard, and the actual reason v1 doesn't use pure OpenCV, is
**discovering where the bubbles are on a sheet the system has never seen before, with
no calibration step:**

1. **A photographed sheet has no embedded structure, unlike the NCERT PDFs this project
   also processes.** A PDF with a real text layer already has character positions baked
   in — extraction is a lookup, not an inference. A photo of a bubble sheet is just
   pixels; nothing in the file says "there's a bubble here." Every bubble position has to
   be inferred visually, which is a fundamentally different, harder category of problem.
2. **Real phone photos aren't clean, controlled input.** Variable lighting, shadows,
   glare, skew, paper creases, blur — all of these degrade classical contour detection.
   A shadow can look like a filled bubble; a crease can break a circle's outline.
3. **Every tuition's sheet is a different design.** Different bubble sizes, sometimes
   squares instead of circles, different column layouts (a common one: Q1–25 left column,
   Q26–50 right column), decorative elements that also look circular. Grouping detected
   marks into the *correct question and option* — not just "is this a circle" but "which
   circle is Q7's Option C" — is a geometry/clustering problem that classical CV solves
   well for clean, regular grids, but isn't guaranteed to solve for an arbitrary,
   never-seen layout.

**The honest framing, not an assertion either way:** "pure OpenCV reliably reads any
previously-unseen sheet, no calibration, at production accuracy" is an empirically
testable claim, not a settled fact — the real test would be running CV-only auto-detection
against a diverse batch of real tuitions' actual sheets and measuring the failure rate.
That's exactly why this doc doesn't bet v1 on it: the CV-first/cached-template design
below (§ Future Optimization) is that same idea, kept as something to build **after**
someone actually validates it, not before.

## Provider abstraction — this can change without touching any caller

`ICvOcrService` (§ Interface shape below) is the reason this decision isn't a one-way
door. Whether extraction is "AI-vision reads every sheet" (v1), "pure OpenCV with a
cached template" (§ Future Optimization), or something else entirely, is an
implementation detail of one class behind that interface — same pattern as
`ILlmService`/`IEmbeddingService` in `backend-guide.md` § Service Layer & Provider
Abstraction. Routers, the submission pipeline, and every other caller only ever depend on
`ICvOcrService`'s method signatures, never on a concrete implementation — swapping the
underlying approach is a new implementation class plus a config value, with zero changes
to any code that calls it.

## Input format

Submissions are captured as a single plain image (in-app guided camera capture, or a
gallery-picked file) — `submissions.image_url` (`database-design.md`), one file per
submission. **v1 is single-page OMR only** — a test needing a multi-page bubble sheet
isn't supported yet (deliberately deferred, not designed for speculatively). A
`submission_pages`-style one-to-many relation was considered (and briefly built) for
multi-page subjective booklets, then reverted — that's out of scope until subjective
grading is actually being built, not before (`database-design.md` § Design Decisions).

If/when multi-page support does come back, it should still be **plain per-page images,
not a bundled PDF**: since capture happens through our own app rather than accepting
arbitrary externally-assembled documents, there's no benefit to a PDF wrapper — it would
only add an encode step client-side and a render-back-to-images step server-side before
AI-vision could touch the content, for no functional gain.

## How it works

### 1. Answer key extraction (teacher's test setup)

Two possible inputs, matching `omr-grading.md` §13:

- **Teacher uploads a plain typed/printed answer list** (no photographed sheet): plain
  PDF/text extraction gets the `{question: answer}` key — no AI needed.
- **Teacher uploads an answer-marked photo/scan of the actual OMR sheet:** one AI-vision
  call reads the marked answers into the key — same mechanism as a student submission
  (below), just for the key instead of a graded attempt.

### 2. Student sheet extraction

Every submission's single page image goes to one AI-vision call, which returns:

- `{question_number: selected_option}` for every question it could read, **and**
- a per-question flag for anything it's not confident about (blank, double-marked,
  smudged, illegible) — see § Confidence & Teacher Review below.

```
Teacher's test setup
        │
        ├── typed answer list  →  plain text extraction  →  key
        │
        └── marked sheet photo →  AI-vision read  →  key
        │
        ▼
Every student submission (single page)
        │
        ▼
  AI-vision read  →  {question_number: answer}  +  per-question confidence flags
        │
        ▼
  flagged questions  →  answers.needs_review = true  →  teacher confirms
```

No caching, no template, no registration step — every sheet is read independently,
regardless of whether other students in the same test have already submitted.

## Confidence & Teacher Review

Since there's no separate pixel-level fill-detection step in this design (AI-vision does
the reading directly, not OpenCV against known bubble positions), confidence has to come
from the AI's own response, not a fill-percentage measurement. The AI-vision call is
prompted to flag, per question, exactly the same ambiguous cases the original
`../omr-grading.md` already names — "any bubble that's ambiguous (smudge, light mark,
double-mark) is flagged into a quick manual-review screen instead of being silently
guessed":

| Pattern | AI-reported outcome | Result |
|---|---|---|
| One option clearly marked | `{"answer": "B", "confidence": "high"}` | Auto-accept, no review |
| Two options both appear marked | `{"answer": null, "flag": "double_mark"}` | `needs_review = true` |
| Nothing appears marked | `{"answer": null, "flag": "blank_or_unclear"}` | `needs_review = true`, not assumed blank |
| Mark present but ambiguous/faint | `{"answer": "B", "confidence": "low"}` | `needs_review = true` |

**What happens on a flag:** `answers.needs_review` is set `true`, the submission surfaces
in the teacher's review queue, and `PUT /api/submissions/{id}/answers/{q_id}`
(`backend-architecture.md` § 2.5) lets the teacher confirm or correct the read in seconds.

**Open item:** unlike the deterministic pixel-threshold approach this replaces, an AI
model's self-reported confidence is exactly that — self-reported, not a guaranteed
calibration. Whether "low confidence" as returned by whatever vision provider is chosen
actually correlates with real ambiguity needs benchmarking against real sample sheets,
same as everything else flagged as unvalidated in this doc.

## Interface shape (`ICvOcrService`)

```python
class ICvOcrService(Protocol):
    async def detect_bubbles(self, image: bytes, test_id: int) -> Result[AnswerMap, "AppError"]: ...
    async def extract_handwriting(self, image: bytes) -> Result[list[TextRegion], "AppError"]: ...
```

`AnswerMap` includes both the answers and the per-question confidence flags described
above. `test_id` is accepted but unused for caching in v1 — kept in the signature so the
future optimization below can be added later without changing the interface or any
caller. Routers and the submission pipeline never need to know the extraction method
changed; this matches the "extraction and analytics must be decoupled" principle already
in `omr-grading.md` §25.

## What still needs deciding / validating before this is committed

- **AI-vision accuracy for fine-grained bubble reading** — needs benchmarking against a
  real vision-model provider before assuming it's reliable enough to grade from directly.
- **Confidence-flag calibration** — does the provider's self-reported confidence actually
  track real ambiguity, or does it need a stricter rule layered on top (e.g., always
  flag if the model expresses any uncertainty at all, rather than trusting a "low/high"
  label at face value)?
- **Cost at real scale** — needs real per-call pricing from whichever vision-model
  provider is chosen, multiplied against realistic class sizes, to confirm the "small and
  bounded" cost claim above actually holds up in practice.

---

## Future Optimization (Not v1): Cached Template, CV-First Detection

Kept here so the design isn't lost — this is what would replace the AI-vision-per-sheet
approach above **if** real usage shows AI-vision cost at scale is worth optimizing away.

### The idea

Learn a test's bubble-grid geometry once, from the first sheet, and reuse it cheaply:

1. **First sheet for a test** (key sheet or first student submission): try pure-CV
   contour detection + geometric row/column clustering first. If it passes structural
   sanity checks (consistent row spacing, consistent bubble-count per row, plausible
   reading order), trust it directly — zero AI cost even for the first sheet
   (`source = 'cv_auto_detected'`). If it fails those checks, one AI-vision call reads
   the sheet instead and seeds the template from that read (`source = 'ai_vision_seed'`).
2. **Every submission after that:** align the new photo to the cached template via
   feature-matching + homography (detect keypoints in both images, match them, compute a
   perspective transform, warp the new photo into alignment — an established
   document-scanning technique, not invented for this doc), then read bubbles with cheap
   OpenCV fill-percentage detection against known positions — no AI involved.
3. **If a submission doesn't align confidently:** fall back to a one-off AI-vision read
   for just that sheet.

### Why this needs real validation before ever being built

- **Registration reliability is unproven.** The original standardized sheet had printed
  fiducial markers specifically so alignment would be reliable regardless of photo angle.
  An arbitrary tuition's sheet has no such markers — registration has to work off
  whatever visual structure the sheet naturally has, which is meaningfully less robust
  against skewed photos, shadows, creases, or a folded sheet.
- **Structural sanity-check thresholds need tuning** — too strict and everything falls
  through to AI-vision anyway (defeating the point), too loose and a wrong grouping gets
  trusted and cached as if correct.
- **Fill-detection thresholds need tuning** — the same "60% filled, 30-point separation"
  style deterministic thresholds as any classical OMR reader, illustrative only until
  validated against real sheets.
- **The AI-vision fallback wouldn't be a rare edge case** in this design — it's the
  safety net for exactly the cases registration is least certain about, and should be
  expected to fire non-trivially often until registration is validated and tuned.

### Schema this would need (not in v1)

A `test_layout_templates` table — one row per test, `source` enum
(`cv_auto_detected`/`ai_vision_seed`), a `layout_data` JSON blob for the geometry, a
reference image pointer, and a `passed_sanity_checks` flag. Would also need
`page_number` scoping if combined with multi-page OMR support, since v1's single-page
assumption (§ Input format above) would need to be lifted first for that to matter.

### When to revisit

Once v1 (AI-vision-per-sheet) is running with real usage data — if per-submission AI
cost at actual scale turns out to be a real problem, this is the documented next step,
not a redesign from scratch.
