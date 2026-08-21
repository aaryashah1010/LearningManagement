# Question Paper PDF Parsing

> Implements `IQuestionPaperService` (`backend-guide.md` § Service Layer & Provider
> Abstraction). Used by `POST /api/tests/{test_id}/questions/upload`, for tests with
> `setup_path = "uploaded_pdf"`.

## What this replaces

Before this, a teacher creating a test with `setup_path = "in_app"` had to type every
question, its correct option, and marks by hand via `POST /api/tests/{test_id}/questions/bulk`.
This adds a second path: upload the actual question paper (a PDF like a school's
existing "que-ans" answer-key paper — question stem, four options, `Ans. : <letter>`,
optionally an `Explanation:` paragraph, sometimes a diagram) and have it parsed
automatically instead of retyped.

## How it works — text-layer parsing, no AI, no OCR

`TextLayerQuestionPaperService` reads the PDF's own embedded text layer directly
(PyMuPDF, `page.get_text("text", sort=True)`) and regex-parses it into questions:
stem, all four option texts, and the correct-option letter. Diagram images are pulled
from the PDF the same way — they're literally embedded image objects in the file, not
rendered pixels that need recognizing — and matched to their question by comparing the
image's vertical position on the page to each question's text position (whichever
question's text block the image sits directly below/before the next question's).

No AI call anywhere in this parsing step. This mirrors the OMR pipeline's own
reasoning (`omr-extraction-strategy.md` § Why this changed): the input has a fixed,
known-enough structure (a real embedded text layer with a consistent `Ans. :` marker
convention) that a deterministic parse handles for free, reliably, and only an
AI/vision call would cost real money and introduce a new failure mode — a plausible-
but-wrong guess — for no benefit over what regex already gets right.

**Requires a real text layer.** A scanned/photographed question paper (no extractable
text) will fail to parse entirely, cleanly (`QUESTION_PAPER_PARSE_FAILED`), rather than
produce garbage. Not currently handled — see § Future below.

## What happens when a question can't be parsed

A question is included in `ParsedPaper.unparsed_question_numbers` (not silently
dropped, not guessed at) whenever the parser can't confidently extract its structure —
in practice, this has so far only happened when an option itself is a rendered math
formula/equation, which text extraction can garble into unrecoverable fragments. The
teacher adds that one question manually via the existing bulk-entry endpoint; every
other question in the paper is still created normally.

## Why images are sent to AI for topic-mapping, but never for parsing

These are two different steps with two different reasons to (or not to) use AI:

- **Parsing** (getting the stem/options/answer out of the PDF) is handled entirely by
  the deterministic text-layer read above — sending pages to a vision model here would
  cost real money to re-derive something regex already extracts for free and just as
  reliably.
- **Topic-mapping** (`ILlmService.map_questions_to_nodes`) is already an AI call by
  design — it's a judgment task with no purely mechanical answer. For a question with
  a diagram, the stem text alone is sometimes genuinely insufficient to say *which*
  topic it tests (e.g. "study the given ray diagram and select the correct statement"
  names no topic in words at all — the diagram is what actually distinguishes a prism
  question from a rectangular-glass-slab question). Since an AI call is already
  happening for classification regardless, including the diagram for just the
  minority of questions that have one is a small, bounded addition to a step that was
  never going to be deterministic anyway — not a new AI dependency.

## Future — vision-based fallback for unparseable questions

Considered and **deliberately deferred, not built now**: when a question lands in
`unparsed_question_numbers`, instead of always requiring manual entry, crop that
question's region on its page (from where its number starts to where the next
question's number starts, or the page end) and send *just that crop* to a
vision-capable LLM, asking it to extract the same stem/options/answer structure.

Not built yet because there's no current real failure case to build or validate it
against — the one real instance found (a formula-based option, `refrence/que-ans.pdf`
Q15) turned out to be fixable with a regex change instead (searching for the answer
letter anywhere after the `Ans. :` marker, rather than assuming it's the very first
token — a formula-heavy option can leave garbled fragments there before the real
letter appears). The sample paper now parses 50/50 without any AI involved.

If a real paper does produce a question the text-layer parser genuinely can't recover
(not just a regex gap), the fallback is a small, contained addition — it slots into
the existing `unparsed_question_numbers` path rather than requiring new architecture,
and it should stay scoped to *only* the specific questions that actually fail, never
the whole PDF: a whole-PDF vision call was estimated at roughly 5-8x the cost of the
current text-only topic-mapping call (image tokens dominate; a typical page costs on
the order of ~4,000 image tokens vs. ~150-250 for the same page's extracted text), for
no benefit on the ~100% of content the free deterministic parse already handles
correctly. The same "never silently guess" principle used everywhere else in this
backend (OMR bubble ambiguity, unmatched submission names) applies here too: a
vision-model misread of a garbled equation would still produce fluent-looking text, an
answer, and a topic — a wrong-but-confident result is worse than the current explicit
`unparsed_question_numbers` signal a teacher can see and act on.

## Future — a genuinely scanned paper (no text layer at all)

Not built now either, and a different problem from the one above: this is a paper
that's a photograph/scan with *no* extractable text at all (`page.get_text()` returns
nothing), not a real text layer with one garbled formula in it. Two ways this could be
handled if it's ever actually needed:

**Option A — one whole-PDF vision call: send every page plus the full candidate topic
list, ask for question + options + answer + topic all at once.** Rejected as the
worse option. There's already direct evidence of how this fails at this kind of scale:
the OMR whole-sheet AI fallback (`omr-extraction-strategy.md`) asked a vision model to
transcribe 50 bubble-answers in a single call, and it hallucinated a repeating
`A,B,C,D,A,B,C,D...` pattern instead of actually reading them — a smaller, simpler
transcription task than a full question paper (stem + 4 options + answer letter, per
question, for 30-50 questions) in the same call that's also trying to classify topics.
A mistranscribed `correct_option` here silently corrupts grading for every student on
that question, with no independent check. It's also the expensive path — full pages
as images plus the whole taxonomy in one request, on the order of the ~5-8x cost
estimate already noted above, for a task with a *higher* error rate than the cheaper
option below, not a lower one.

**Option B — OCR the pages to text first, then feed that text into the existing
`TextLayerQuestionPaperService` regex parser, unchanged.** The better option, if this
is ever needed. This keeps AI scoped to two narrow, already-proven-reliable jobs
instead of one big one: OCR (mechanical text reading — the same technique already
used for the submission header's NAME field via Cloud Vision, `IOcrService`) to get
text out of the image, then the same deterministic parser already validated at 50/50
on the real sample paper to turn that text into structured questions. Topic-mapping
stays the only genuine AI *judgment* call, same as it is today — the grading-critical
field (`correct_option`) never depends on a single AI call getting a big, structured
transcription right in one shot.

Neither is built now, same reasoning as the section above: there's no real scanned
paper in hand to build or validate either approach against yet.
