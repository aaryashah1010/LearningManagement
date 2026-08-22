import base64
import json
from typing import Protocol

from openai import AsyncOpenAI

from app.config.settings import settings
from app.models.llm import (
    BubbleJudgment,
    ClassReportEvidence,
    NodeMapping,
    QuestionToMap,
    StudentReportEvidence,
    TaxonomyNode,
)
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.result import Result, err, ok

logger = get_logger("llm_service")


class ILlmService(Protocol):
    async def map_questions_to_nodes(
        self, questions: list[QuestionToMap], candidates: list[TaxonomyNode]
    ) -> Result[list[NodeMapping], "AppError"]: ...
    async def adjudicate_bubbles(
        self, crops: list[tuple[int, bytes]]
    ) -> Result[list[BubbleJudgment], "AppError"]: ...
    async def read_whole_sheet(self, image: bytes) -> Result[list[BubbleJudgment], "AppError"]: ...
    async def phrase_class_report(self, evidence: ClassReportEvidence) -> Result[str, "AppError"]: ...
    async def phrase_student_reports(
        self, evidence: list[StudentReportEvidence]
    ) -> Result[dict[int, str], "AppError"]: ...


_SYSTEM_PROMPT = (
    "You are a curriculum-classification assistant for NCERT textbooks. Given a batch of "
    "test questions and a list of candidate curriculum topics, you identify, for EVERY "
    "question, the single topic it primarily tests. If a question could plausibly touch "
    "more than one topic, choose the most specific one that best matches what is actually "
    "being asked — not a broader topic it's loosely related to. You must pick an id from "
    "the candidate list you are given for every question; never invent one that isn't "
    "listed, and never skip a question.\n\n"
    "Important: when a candidate topic's name enumerates specific items or cases (e.g. "
    "'Cards, Balls, and Coins'), treat that enumeration as exhaustive for that topic — do "
    "not pick it for a question about something not on the list just because the topic "
    "*sounds* thematically similar (e.g. 'single-stage random selection' sounds like it "
    "could cover a die, but if dice aren't listed, they aren't covered by that topic). "
    "Prefer a more general/definitional topic over a specific-list topic whenever the "
    "question's subject isn't literally in that list.\n\n"
    "Example 1:\n"
    "Questions:\n"
    "101: Find the HCF of 96 and 404 using the Fundamental Theorem of Arithmetic.\n"
    "102: State the Fundamental Theorem of Arithmetic.\n"
    "Candidate topics (id: path):\n"
    "3: Real Numbers > The Fundamental Theorem of Arithmetic > Fundamental Theorem of "
    "Arithmetic - Statement and Prime Factorisation\n"
    "4: Real Numbers > The Fundamental Theorem of Arithmetic > HCF and LCM using Prime "
    "Factorisation Method\n"
    "Your response:\n"
    '{"mappings": ['
    '{"question_id": 101, "reasoning": "Asks to compute the HCF using prime '
    "factorisation, which is exactly this subtopic, not just the theorem's statement.\", "
    '"node_id": 4}, '
    '{"question_id": 102, "reasoning": "Asks only for the statement of the theorem, not '
    'an application of it.", "node_id": 3}'
    "]}\n\n"
    "Example 2 (enumerated list must be taken literally):\n"
    "Questions:\n"
    "201: A die is thrown once. What is the probability of getting a prime number?\n"
    "Candidate topics (id: path):\n"
    "91: Probability > Probability - A Theoretical Approach > Theoretical Probability - "
    "Definition, Elementary Events, and Complementary Events\n"
    "92: Probability > Probability - A Theoretical Approach > Applications - Single-Stage "
    "Random Selection from Cards, Balls, and Coins\n"
    "Your response:\n"
    '{"mappings": [{"question_id": 201, "reasoning": "This is a basic single die-roll '
    "probability question. Topic 92's enumerated list is cards, balls, and coins only — "
    "no dice — so despite the thematic similarity of 'single-stage random selection', the "
    'die falls under the general definitional topic instead.", "node_id": 91}]}\n\n'
    "Respond with ONLY a JSON object in that exact form — no other text, no markdown, no "
    'code fences: {"mappings": [{"question_id": <id>, "reasoning": "<one sentence>", '
    '"node_id": <id>}, ...]}. Include exactly one entry per question you were given.'
)


_BUBBLE_SYSTEM_PROMPT = (
    "You read cropped rows from an OMR answer sheet — each row shows one question's "
    "number and its A/B/C/D bubbles. Bubble fill detection couldn't confidently decide "
    "these particular rows (faint marks, double marks, crossed-out marks), so you make "
    "the call a human grader would: which single option, if any, is the student's real "
    "answer. A crossed-out or scribbled-over mark means the student changed their answer "
    "— read what they corrected it to, not what they crossed out; if genuinely two "
    "options are both cleanly filled with no correction indicated, or nothing is legibly "
    "marked, say so with low confidence rather than guessing.\n\n"
    'Respond with ONLY a JSON object: {"answers": [{"question_number": <number>, '
    '"selected_option": "A"|"B"|"C"|"D"|null, "confidence": <0.0-1.0>}, ...]}. Include '
    "exactly one entry per row image you were given, in any order. confidence reflects "
    "how sure you are of selected_option (or of it being unanswered, if null) — low "
    "confidence for anything genuinely ambiguous, not just to hedge."
)


_WHOLE_SHEET_SYSTEM_PROMPT = (
    "Read this OMR sheet: 50 questions (1-25 left block, 26-50 right block), each with "
    "A/B/C/D bubbles. For each question give the filled option (or null if blank/unclear) "
    "and a confidence 0-1. If a mark is crossed out, use the corrected answer, not the "
    "crossed-out one.\n\n"
    'JSON only: {"answers":[{"question_number":<1-50>,"selected_option":"A"|"B"|"C"|"D"|'
    'null,"confidence":<0-1>}]} — one entry per question 1 to 50.'
)
# Kept deliberately short — a longer prompt combined with an image and json_object mode
# was observed to hang indefinitely on one OpenAI-compatible provider (NVIDIA NIM); the
# same request with a short prompt returns normally. See omr-extraction-strategy.md.


_CLASS_REPORT_SYSTEM_PROMPT = (
    "You write a short teacher-facing summary of a class's test performance. You are "
    "given already-computed evidence — average score and a list of the class's weakest "
    "curriculum topics with their accuracy and verdict (needs_practice or weak). Your "
    "only job is to phrase this evidence into 2-4 plain sentences a teacher can act on — "
    "which topics need re-teaching, roughly how weak they are. Never invent a number, "
    "topic, or student that isn't in the evidence, and never soften or second-guess a "
    "verdict that's already been computed — you are phrasing the evidence, not judging "
    'it.\n\nRespond with ONLY a JSON object: {"summary": "<2-4 sentences>"}.'
)

_STUDENT_REPORTS_SYSTEM_PROMPT = (
    "You write a short student-facing summary of test performance, one per student. You "
    "are given a batch of students, each with their score and their weakest curriculum "
    "topics (accuracy + verdict: needs_practice or weak). For each student, write 1-3 "
    "plain, encouraging sentences naming their weak topics and roughly how weak they "
    "are. Never invent a number or topic not in that student's evidence, and never judge "
    "or soften a verdict that's already been computed — you are only phrasing it. If a "
    "student has no weak topics listed, write a short positive sentence about their "
    "score instead.\n\n"
    'Respond with ONLY a JSON object: {"summaries": [{"student_id": <id>, "summary": '
    '"<1-3 sentences>"}, ...]}. Include exactly one entry per student you were given.'
)


def _parse_json_content(content: str) -> dict:
    # Used only where response_format=json_object is skipped (long prompt + image on
    # NVIDIA NIM hangs — see above). The prompt still asks for JSON-only, but without
    # the enforced mode a model may wrap it in a code fence anyway.
    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    return json.loads(text)


class OpenAiCompatibleLlmService:
    """Calls any provider exposing an OpenAI-compatible chat completions endpoint (NVIDIA,
    Gemini, OpenAI itself) — which base_url/model/key is used comes entirely from config,
    not from a provider-specific class. Implements ILlmService."""

    def __init__(self) -> None:
        self._client = AsyncOpenAI(base_url=settings.LLM_BASE_URL, api_key=settings.LLM_API_KEY)

    async def map_questions_to_nodes(
        self, questions: list[QuestionToMap], candidates: list[TaxonomyNode]
    ) -> Result[list[NodeMapping], "AppError"]:
        if not questions or not candidates:
            return err(ERRORS["LLM_SERVICE_ERROR"])

        text_only = [q for q in questions if q.image is None]
        question_block = "\n".join(f"{q.question_id}: {q.question_text}" for q in text_only)
        options = "\n".join(f"{c.id}: {c.path}" for c in candidates)
        user_prompt = f"Questions:\n{question_block}\n\nCandidate topics (id: path):\n{options}"

        content: list[dict] = [{"type": "text", "text": user_prompt}]
        for q in questions:
            if q.image is None:
                continue
            image_b64 = base64.b64encode(q.image).decode()
            label = f"Question {q.question_id} (has a diagram, see image): {q.question_text}"
            content.append({"type": "text", "text": label})
            content.append(
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
            )
        has_images = any(q.image is not None for q in questions)

        try:
            response = await self._client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": content},
                ],
                # This prompt is long — skip strict JSON mode once an image joins it (see
                # _parse_json_content above for why).
                **({} if has_images else {"response_format": {"type": "json_object"}}),
                temperature=0,
            )
            data = _parse_json_content(response.choices[0].message.content)
            mappings = [
                NodeMapping(
                    question_id=int(m["question_id"]),
                    node_id=int(m["node_id"]),
                    reasoning=str(m["reasoning"]),
                )
                for m in data["mappings"]
            ]
        except Exception:
            logger.exception("map_questions_to_nodes call failed")
            return err(ERRORS["LLM_SERVICE_ERROR"])

        valid_node_ids = {c.id for c in candidates}
        expected_question_ids = {q.question_id for q in questions}
        returned_question_ids = {m.question_id for m in mappings}
        if returned_question_ids != expected_question_ids:
            return err(ERRORS["LLM_SERVICE_ERROR"])  # missing, duplicate, or extra questions
        if any(m.node_id not in valid_node_ids for m in mappings):
            return err(ERRORS["LLM_SERVICE_ERROR"])

        return ok(mappings)

    async def adjudicate_bubbles(
        self, crops: list[tuple[int, bytes]]
    ) -> Result[list[BubbleJudgment], "AppError"]:
        if not crops:
            return err(ERRORS["LLM_SERVICE_ERROR"])

        content = []
        for question_number, image in crops:
            image_b64 = base64.b64encode(image).decode()
            content.append({"type": "text", "text": f"Question {question_number}:"})
            content.append(
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
            )

        try:
            response = await self._client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": _BUBBLE_SYSTEM_PROMPT},
                    {"role": "user", "content": content},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            data = json.loads(response.choices[0].message.content)
            judgments = [
                BubbleJudgment(
                    question_number=int(a["question_number"]),
                    selected_option=a["selected_option"],
                    confidence=float(a["confidence"]),
                )
                for a in data["answers"]
            ]
        except Exception:
            logger.exception("adjudicate_bubbles call failed")
            return err(ERRORS["LLM_SERVICE_ERROR"])

        expected = {q for q, _ in crops}
        returned = {j.question_number for j in judgments}
        if returned != expected:
            return err(ERRORS["LLM_SERVICE_ERROR"])  # missing, duplicate, or extra questions

        return ok(judgments)

    async def read_whole_sheet(self, image: bytes) -> Result[list[BubbleJudgment], "AppError"]:
        image_b64 = base64.b64encode(image).decode()
        try:
            response = await self._client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": _WHOLE_SHEET_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
                        ],
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            data = json.loads(response.choices[0].message.content)
            judgments = [
                BubbleJudgment(
                    question_number=int(a["question_number"]),
                    selected_option=a["selected_option"],
                    confidence=float(a["confidence"]),
                )
                for a in data["answers"]
            ]
        except Exception:
            logger.exception("read_whole_sheet call failed")
            return err(ERRORS["LLM_SERVICE_ERROR"])

        if {j.question_number for j in judgments} != set(range(1, 51)):
            return err(ERRORS["LLM_SERVICE_ERROR"])  # missing, duplicate, or extra questions

        return ok(judgments)

    async def phrase_class_report(self, evidence: ClassReportEvidence) -> Result[str, "AppError"]:
        weak_block = "\n".join(
            f"- {n.path}: {n.accuracy:.0%} accuracy ({n.verdict})" for n in evidence.weak_nodes
        )
        weak_block = weak_block or "(none — no topic fell below the needs-practice threshold)"
        user_prompt = (
            f"Students evaluated: {evidence.students_evaluated}\n"
            f"Average score: {evidence.average_score_percent:.0%}\n"
            f"Weakest topics:\n{weak_block}"
        )
        try:
            response = await self._client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": _CLASS_REPORT_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            data = json.loads(response.choices[0].message.content)
            return ok(str(data["summary"]))
        except Exception:
            logger.exception("phrase_class_report call failed")
            return err(ERRORS["LLM_SERVICE_ERROR"])

    async def phrase_student_reports(
        self, evidence: list[StudentReportEvidence]
    ) -> Result[dict[int, str], "AppError"]:
        if not evidence:
            return ok({})

        blocks = []
        for s in evidence:
            weak_block = "\n".join(
                f"  - {n.path}: {n.accuracy:.0%} accuracy ({n.verdict})" for n in s.weak_nodes
            )
            blocks.append(
                f"Student {s.student_id} ({s.student_name}): score {s.score_percent:.0%}\n"
                f"{weak_block if weak_block else '  (no weak topics)'}"
            )
        user_prompt = "\n\n".join(blocks)

        try:
            response = await self._client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": _STUDENT_REPORTS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            data = json.loads(response.choices[0].message.content)
            summaries = {int(s["student_id"]): str(s["summary"]) for s in data["summaries"]}
        except Exception:
            logger.exception("phrase_student_reports call failed")
            return err(ERRORS["LLM_SERVICE_ERROR"])

        expected = {s.student_id for s in evidence}
        if set(summaries.keys()) != expected:
            return err(ERRORS["LLM_SERVICE_ERROR"])  # missing, duplicate, or extra students

        return ok(summaries)


def get_llm_service() -> ILlmService:
    if settings.LLM_PROVIDER in ("nvidia", "gemini", "openai"):
        return OpenAiCompatibleLlmService()
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")
