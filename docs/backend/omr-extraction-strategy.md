# OMR Answer Extraction Strategy — Answer Key & Student Sheets

> Implements the extraction side of `ICvOcrService` (`backend-guide.md` § Service Layer).
> Supersedes the earlier AI-vision-per-sheet design that assumed an arbitrary,
> never-seen tuition sheet layout — see § Why this changed below.

## v2 decision: one fixed sheet template, pure OpenCV, in-app guided capture, no AI

The platform now standardizes on **a single OMR sheet template** designed and printed
by this project, rather than accepting whatever OMR format each tuition already uses.
Every test uses the same physical layout — same bubble grid geometry, same fiducial
corner markers, same dimensions. That single fact removes the entire problem the
previous AI-vision design existed to solve.

## Why this changed

The earlier design (AI-vision reads every sheet directly, no template) was built around
a specific constraint: **"any sheet layout must work, no calibration step"** — a tuition
keeps using its own existing OMR sheet, and the system has to read it without ever
having seen its layout before. Under that constraint, discovering bubble positions is a
genuinely hard, unbounded visual-inference problem (see the old reasoning: no embedded
structure in a photo, real phone-photo noise, every tuition's sheet is a different
design), which is why pure OpenCV was rejected in favor of AI-vision.

That constraint no longer holds. **The sheet layout is fixed and known in advance** —
there's exactly one template, designed by this project, so bubble positions aren't
discovered per sheet, they're read from a single config once and reused for every
submission, every test, every student. This is the same idea the old doc's deferred
"Future Optimization" section described as a cached template — the only difference is
the template doesn't need to be *learned* from a first sheet, because it's fixed by
design from day one.

## The template

One printed sheet design (A4, portrait), used for every test regardless of
subject/class. Geometry lives in `app/services/omr_template.py` — the printed sheet and
the fill-reading code are generated from the same numbers, not kept in sync by hand:

| Zone | Spec |
|---|---|
| Page | A4, 210 x 297mm, portrait |
| Corner markers | 10 x 10mm solid black squares, 8mm inset from each edge |
| Header | y: 20-52mm — title, name/test fields, printed fill guide |
| Question grid | y: 58-273mm, two 86mm columns, 14mm gutter |
| Rows | 25 per column, 8.36mm each — 50 questions total (Q1-25 left, Q26-50 right) |
| Bubbles | 5mm diameter, A/B/C/D on a 16mm pitch, 12mm question-number label column |

**Four printed corner fiducial markers** exist specifically so orientation/skew can be
corrected reliably regardless of how the photo was framed — this was the exact gap the
old design flagged as missing ("an arbitrary tuition's sheet has no such markers"),
solved here simply by owning the template and printing markers on it.

**Bubble geometry is a single static config** (`omr_template.py`) — not per-test, not
learned, not cached from a first sheet. Question count is a fixed maximum (50); tests
with fewer questions simply leave the remaining rows blank. If the template is ever
revised, that's a new config version, still fixed and known in advance — never an
inferred/discovered one. A printable reference of this exact layout exists as a design
artifact (corner markers, header, and full 50-question grid rendered at true scale).

## In-app guided capture

Submissions are **not** an arbitrary gallery-picked photo. The student captures the
sheet through the app's own camera screen, which:

- Shows a live on-screen guide (e.g. a rectangle outline) for where the sheet edges
  should sit in frame, so captures are reasonably consistent in framing and distance
  before any CV runs.
- Can optionally attempt live marker detection in the camera preview and only enable
  capture once all four corner markers are visible — catching a bad angle or partial
  frame *before* the photo is taken, rather than after upload.

This doesn't eliminate real-world capture noise (lighting, shadows, slight blur are
still possible), but it bounds it a lot more than an unconstrained gallery photo would —
combined with the fixed template and printed markers, it's what makes a pure-OpenCV
pipeline viable without AI as a fallback.

## How it works

### 1. Answer key extraction (teacher's test setup)

Same underlying pipeline as a student submission below — the teacher marks the answer
key directly onto a copy of the same template sheet and captures it the same way.
A **plain typed/printed answer list** (no photographed sheet) is still supported as a
separate, simpler path — plain text/PDF extraction gets the `{question: answer}` key
directly, no CV involved.

### 2. Student sheet extraction — the pipeline

```
Captured sheet photo
        │
        ▼
1. Detect the 4 corner fiducial markers (contour detection)
        │  — not found / fewer than 4 → extraction fails outright,
        │    submission flagged for retake, never silently guessed
        ▼
2. Compute homography from detected marker positions → warp/deskew
   to the canonical (fixed-size, fixed-orientation) image
        │
        ▼
3. Sample each bubble's fixed region from the static template config
   (no discovery — positions are already known)
        │
        ▼
4. Measure fill for each bubble (dark-pixel ratio inside its region)
        │
        ▼
5. Per question: decide the marked option (or flag) from the fill ratios
        │
        ▼
  {question_number: selected_option}  +  per-question needs_review flags
```

No AI call anywhere in this path. No caching/registration step either — every capture
goes through the same fixed-position sampling, since there's nothing to learn per test.

## Confidence & Teacher Review

Confidence now comes from a deterministic fill-ratio measurement, not a self-reported
AI label — the same style of check any classical OMR reader uses:

| Pattern | Detected fill ratios | Result |
|---|---|---|
| Exactly one bubble clearly above the fill threshold, no close runner-up | e.g. B = 78%, others < 15% | Auto-accept, no review |
| Every option nowhere near the fill threshold | all below ~10% | Auto-accept as unanswered, no review — unambiguously blank |
| Top option below the fill threshold but not by much | e.g. 20%, threshold 35% | `needs_review = true` — could be a genuine mark the CV under-read, not just blank |
| Two or more bubbles independently clear the fill threshold | e.g. B = 55%, C = 48% | `needs_review = true` (double-mark) |
| One bubble above threshold but a close runner-up | e.g. B = 40%, C = 32% | `needs_review = true` (low-confidence fill) |
| Fewer than 4 corner markers detected at all | — | Whole submission fails extraction, flagged for retake — never partially guessed |

A genuinely blank answer is common (most students skip questions) and isn't itself
ambiguous — flagging every blank for review would flood the teacher's queue with
non-issues. Only a *near-miss* blank (low but not negligible fill) stays flagged, since
that's the pattern that could mean a real mark got under-read, not just skipped.

**What happens on a flag:** `answers.needs_review` is set `true`, the submission
surfaces in the teacher's review queue, and `PUT /api/submissions/{id}/answers/{q_id}`
(`backend-architecture.md` § 2.5) lets the teacher confirm or correct the read in
seconds — same review mechanism as before, just fed by a deterministic signal instead
of an AI confidence label.

## Provider abstraction — this can still change without touching any caller

`ICvOcrService` (§ Interface shape below) is still the reason this decision isn't a
one-way door — same pattern as `ILlmService` in `backend-guide.md` § Service Layer &
Provider Abstraction. Whether extraction is this fixed-template OpenCV pipeline, a
future multi-template design, or AI-vision again someday, is an implementation detail of
one class behind that interface. Routers, the submission pipeline, and every other
caller only ever depend on `ICvOcrService`'s method signatures, never on a concrete
implementation — swapping the underlying approach is a new implementation class plus a
config value, with zero changes to any code that calls it.

## Interface shape (`ICvOcrService`)

Implemented — `app/services/cv_ocr_service.py`:

```python
class ICvOcrService(Protocol):
    async def detect_bubbles(self, image: bytes, test_id: int) -> Result[AnswerMap, "AppError"]: ...

class OpenCvOcrService:
    """Pure OpenCV against the one fixed sheet template. No AI, no per-photo bubble
    discovery — positions come from omr_template.py."""
    async def detect_bubbles(self, image: bytes, test_id: int) -> Result[AnswerMap, "AppError"]: ...

def get_cv_ocr_service() -> ICvOcrService:
    if settings.CV_OCR_PROVIDER == "opencv":
        return OpenCvOcrService()
    raise ValueError(f"Unknown CV_OCR_PROVIDER: {settings.CV_OCR_PROVIDER}")
```

Same shape as originally designed. MCQ/OMR only — no handwriting/OCR method on this
interface at all; that's added when subjective grading is actually built, as its own PR.

`AnswerMap` (`app/models/omr.py`) includes both the answers and the per-question
`needs_review` flags described above. `test_id` is accepted but unused by the current
single-template implementation — kept in the signature so a future multi-template
design (§ below) can use it without changing the interface or any caller.

Verified with a synthetic test image (markers + filled bubbles rendered from the same
`omr_template.py` geometry, then rotated a few degrees to simulate photo skew) —
the pipeline correctly deskews, reads the marked bubbles, and flags an unmarked
question as `needs_review`. This confirms the pipeline mechanics work; it is **not**
validation against a real photographed sheet — see the unresolved items below.

## What still needs deciding / validating before this is committed

- **Marker size/contrast** — how large and how high-contrast the corner markers need to
  be printed for reliable detection under real phone-camera conditions (lighting,
  compression, slight blur) — needs testing against real printed/photographed sheets,
  not assumed.
- **Fill-ratio threshold tuning** — the percentages in § Confidence & Teacher Review
  above are illustrative, not validated. Real threshold values need tuning against a
  batch of real captured sheets before being trusted in production.
- **Live in-app marker detection** is a client-side capture-quality feature, not a
  backend concern — this doc only requires that captured images eventually contain all
  four markers; how strictly the app enforces that before allowing capture is a frontend
  decision, not specified here.
- **Sheet printing/distribution** — how the one template actually gets into students'
  hands (pre-printed by the tuition, generated per-test, etc.) is outside this doc's
  scope; it only assumes every submission is a photo of that one fixed layout.

---

## Future: supporting more than one sheet template

Out of scope for now — the whole point of this design is that there's exactly one
template. If the platform ever needs to support multiple sheet layouts again (e.g.
different templates per grade, or per tuition), that's a genuinely different problem
from what this doc solves: it would mean going back to either (a) AI-vision for any
template not yet known to the system, or (b) a calibration step where a new template's
geometry is registered once (uploaded + bubble regions marked, or auto-detected and
confirmed) before it can be read by pure CV — effectively the old deferred cached-template
idea, but reintroduced deliberately rather than by default. Not something to build
speculatively now; revisit only if a real second-template requirement shows up.
