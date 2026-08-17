# Subjective (Descriptive) Answer Grading & IQ/EQ Insights

## Why

Not every test is MCQ. Subjective/descriptive questions (short-answer, long-answer, essay-type) can't be graded by bubble detection — there's no fixed choice to compare against, so this needs OCR + AI-driven semantic grading instead. This is a companion feature to [OMR-Based Offline Test Grading](omr-grading.md): same two-login setup, same idea of scanning a physical sheet and rolling results into topic-wise analytics, but for handwritten descriptive answers instead of filled-in bubbles.

It also goes a step further than pure grading — from the same scanned answers, it derives partial marks (not just right/wrong), a per-question summary of what the student wrote, weak-topic analytics, and an indicative IQ/EQ signal per student.

## Accounts

Same two logins as the OMR module — no new role needed. Teacher does setup and reviews results; student uploads their own answer sheet under their own login. See [omr-grading.md → Accounts & Roles](omr-grading.md#accounts--roles).

## Test Setup

Same idea as the OMR module's two paths — teacher either builds the paper in-app or uploads their own question paper PDF. The difference is what counts as the "answer key" for a descriptive question, since there's no single correct letter:

- **Model answer or keyword key:** for each question, the teacher provides either a reference/model answer, or a set of expected keywords/key points — optionally weighted (e.g., worth 2 of the question's 5 marks) — plus the question's max marks.
- **Topic tagging:** same as the OMR module — AI reads each question's text on its own and predicts its topic. No manual tagging by the teacher.

## The Answer Sheet — Supplementary

- Students write their answers on a supplementary booklet (blank/ruled pages), not a bubble sheet — the normal format for offline subjective exams.
- Since students upload while logged into their own account, that login is the identification — no QR code or roll-number bubble grid needed on the supplementary itself.
- If a teacher bulk-uploads on behalf of students without app access, the same roster-matching screen from the OMR module's custom-template path applies here too.

## Scan & Processing

1. Scan or photograph the supplementary. If the booklet has printed corner markers (same as the OMR sheet), the same auto-straighten step applies; otherwise basic image cleanup runs first.
2. **Handwriting OCR** extracts the written text per question. This is real AI work, unlike OMR's bubble-fill detection — handwriting can't be read by a simple pixel check.
3. Low-confidence or illegible sections are flagged into the same kind of quick manual-review screen the OMR module uses for ambiguous bubbles — teacher confirms or corrects the extracted text in seconds instead of it being silently guessed.

## Grading — Partial Marks, Not Just Right/Wrong

- AI compares each extracted answer against the model answer / keyword key and assigns **partial marks** based on how much of the expected content is present and how well it's expressed — not a strict binary like OMR grading.
- A short **per-question summary** is generated — what the student actually wrote/covered — so the teacher can see the gist without rereading the handwriting.
- Results roll up into the same topic-wise weak-area analytics as the OMR module, except each answer contributes a partial-credit score per topic instead of a plain right/wrong.

## IQ / EQ Signals (Indicative, Not Clinical)

- Beyond grading, AI looks at the pattern across a student's answers as a whole — reasoning depth, structure, and problem-solving approach (IQ-leaning signals), and tone, emotional/behavioral expression (EQ-leaning signals) — and produces an indicative score per student.
- This should be labeled clearly in the UI as an **AI-generated indicative signal derived from this test's written answers**, not a clinically validated psychometric assessment — same spirit as confidence-flagging elsewhere in the app: a useful signal for the teacher, not a silent black-box number.

## Output

- **Per-student:** partial marks per question, total score, and a per-question summary of what was written.
- **Topic-wise weak-area chart**, same shape as the OMR module's.
- **Indicative IQ/EQ score** per student.
- **Class-wide view for the teacher:** weak topics across the batch plus score distribution — same as the OMR module's class-wide dashboard.
