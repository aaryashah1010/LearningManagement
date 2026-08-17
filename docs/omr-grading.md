# OMR-Based Offline Test Grading & Topic Analytics


## Why

Most tuition classes still run tests on pen-and-paper, not online. This feature extends instant grading and topic-wise analytics to physical, offline MCQ tests — so classes get AI-driven insights without needing to move testing online.

Teachers never manually tag topics — the AI reads the uploaded question paper once per test and figures out the topic per question itself. Grading each student's OMR sheet is still pure image processing (OpenCV-style bubble detection), so the only AI cost is a single one-time read of the question PDF per test, not per student — cost stays flat no matter how large the class is.

## Accounts & Roles

Two upload actions in this flow belong to two different people, so, for now, two separate logins:

- **Teacher login** — does the test setup (Path A or Path B), reviews/confirms the AI-extracted answer key and topic tags, and views the class-wide analytics dashboard (which topics need re-teaching across the batch).
- **Student login** — uploads their own filled OMR sheet, and views their own score, right/wrong per question, and topic-wise performance chart.

Kept to just these two roles for now — that's the minimum needed to cover the whole flow end to end (setup + review on one side, upload + results on the other). Additional roles (e.g., an admin/owner login for managing the tuition's teachers and classes) can be layered on later if needed.

## Test Setup — Two Paths to an Answer Key

Every OMR test needs the same end result: a list of `{question number → correct answer → topic tag}`. There are two ways to get there.

### Path A — Paper built in-app

Teacher uses the in-app Question Paper Builder / Question Bank. Answer key and topic tags are already known automatically — zero extra setup.

### Path B — Teacher's own paper (uploaded PDF)

Teacher uploads a single PDF containing the question paper with answers (e.g., an answer-marked master copy). The teacher does **not** enter a topic table — instead, two separate extraction steps happen:

1. **Answer key extraction:** AI parses the PDF and pulls out the correct answer marked for each question number — plain extraction, not a judgment call.
2. **Topic prediction:** AI reads each question's text on its own — not the answer, not any student's response — and predicts which topic it belongs to (e.g., Algebra, Geometry, Thermodynamics). This is the only place AI "judgment" is used; it looks solely at what the question is asking.
3. Teacher gets a quick review screen to skim the extracted `{question → answer → topic}` list and correct anything the AI got wrong, then confirms. This is optional but recommended, since the topic tags directly drive the weak-area analytics later.

## The OMR Answer Sheet

- App generates a standardized, print-ready OMR bubble sheet — numbered questions, A/B/C/D bubbles — works for any test regardless of which path was used, since the sheet is just a generic bubble grid.
- Corner/fiducial markers printed on the sheet let the software auto-detect and straighten the page from any scan or phone photo, regardless of angle or lighting.
- QR code per sheet encodes the student's ID — eliminates error-prone roll-number-bubble reading and guarantees each scan is matched to the right student.
- Tuition prints the sheets, hands them out; students fill by pen.

## Scan, Upload & Processing

Students scan or photograph their own filled sheet and upload it individually (e.g., from their phone, via the app) — no need to wait for the teacher to collect and batch everything. Teachers can still bulk-upload on behalf of students without app access.

**Processing pipeline** (pure computer vision, no AI cost):

1. Perspective correction using the corner markers
2. Grid slicing based on the known sheet template
3. Bubble fill-percentage detection per question
4. Student identification via QR code
5. Answer extraction per question

**Confidence flagging:** any bubble that's ambiguous (smudge, light mark, double-mark) is flagged into a quick manual-review screen instead of being silently guessed — teacher confirms the correct read in seconds.

## Grading & Topic-Wise Analytics

- **Grading is a plain comparison:** each student's extracted answer is checked against the answer key extracted at setup — instant, rule-based, no AI involved in deciding right or wrong.
- **Weak-area detection uses the AI-predicted topic tags:** since every question was already tagged by topic (from reading the question text alone, during setup — no manual input from the teacher), each right/wrong result rolls straight into topic-wise weak-area detection — for every student, automatically, the moment their sheet is scanned.
- **Output:** per-student score, right/wrong per question, and an AI-generated topic-wise performance chart flagging weak topics — plus a class-wide view for teachers showing which topics need re-teaching across the batch.

## Custom OMR Template Support (Phase 2 / advanced option)

For tuitions attached to their own existing OMR sheet stock (rather than switching to the generated sheet):

- **One-time template calibration:** admin scans a blank copy of their sheet and marks each question's bubble region in a simple point-and-click setup screen. Saved as a reusable template for that sheet design.
- Without a QR code, student identification falls back to either an existing roll-number bubble grid on their sheet, or a manual match-to-roster screen after upload (teacher matches scanned thumbnails to student names in one pass).
- More setup effort and slightly lower reliability than the standard sheet — positioned as an advanced option, not the default.
