from collections import defaultdict
from dataclasses import dataclass

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.middleware.auth import get_current_teacher_or_admin, get_current_user
from app.models.curriculum_node import ChapterNode
from app.models.llm import ClassReportEvidence, WeakNodeEvidence
from app.models.report import (
    ClassCumulativeReport,
    ClassReport,
    CumulativeReport,
    NodeAccuracy,
    NodeVerdict,
    StudentNodeBucket,
    StudentReport,
    TestReportResponse,
)
from app.models.test import Test
from app.repositories.curriculum_node_repository import CurriculumNodeRepository
from app.repositories.report_repository import NodeStudentStat, ReportRepository, StudentScore
from app.repositories.test_repository import TestRepository
from app.services.llm.llm_service import ILlmService, get_llm_service
from app.types.token import TokenData
from app.utils.errors import ERRORS, AppError
from app.utils.logger import get_logger
from app.utils.responses import error_response, success_response
from app.utils.result import Result, err, ok
from app.utils.scoping import ensure_class_assigned_or_admin, ensure_shares_book_with_student_or_admin

router = APIRouter(tags=["reports"])
logger = get_logger("report_router")

_LEVEL_ORDER = {"chapter": 0, "topic": 1, "subtopic": 2}
_ACTIONABLE_VERDICTS = ("weak", "needs_practice")


def _err(error) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content=error_response(error.message, error.code))


def _ensure_test_scoped(test_id: int, current_user: TokenData):
    test_result = TestRepository.find_by_id(test_id)
    if test_result.is_err():
        return test_result
    scoped = ensure_class_assigned_or_admin(test_result.value.class_id, current_user)
    if scoped.is_err():
        return scoped
    return test_result


def _cumulative_period(test: Test) -> tuple[int, int]:
    # Single source of truth for the cumulative period boundary — keep in sync with the
    # YEAR()/MONTH() filter in ReportRepository.get_student_reports_for_period.
    return test.created_at.year, test.created_at.month


@dataclass
class _NodeMeta:
    name: str
    level: str
    path: str
    page_start: int | None
    page_end: int | None
    ancestors: list[int]


def _build_node_index(chapters: list[ChapterNode]) -> dict[int, _NodeMeta]:
    """Flattens the chapter->topic->subtopic tree into id -> metadata (including each
    node's own ancestor chain), so a leaf's stats can be rolled up to its topic/chapter
    without re-walking the tree per row."""
    index: dict[int, _NodeMeta] = {}
    for chapter in chapters:
        index[chapter.id] = _NodeMeta(
            name=chapter.name,
            level="chapter",
            path=chapter.name,
            page_start=chapter.page_start,
            page_end=chapter.page_end,
            ancestors=[],
        )
        for topic in chapter.topics:
            topic_path = f"{chapter.name} > {topic.name}"
            index[topic.id] = _NodeMeta(
                name=topic.name,
                level="topic",
                path=topic_path,
                page_start=topic.page_start,
                page_end=topic.page_end,
                ancestors=[chapter.id],
            )
            for subtopic in topic.subtopics:
                index[subtopic.id] = _NodeMeta(
                    name=subtopic.name,
                    level="subtopic",
                    path=f"{topic_path} > {subtopic.name}",
                    page_start=subtopic.page_start,
                    page_end=subtopic.page_end,
                    ancestors=[topic.id, chapter.id],
                )
    return index


def _classify(correct: int, total: int) -> NodeVerdict:
    if total < settings.REPORT_MIN_QUESTIONS_FOR_VERDICT:
        return "insufficient_data"
    accuracy = correct / total
    if accuracy >= settings.REPORT_STRONG_THRESHOLD:
        return "strong"
    if accuracy >= settings.REPORT_NEEDS_PRACTICE_THRESHOLD:
        return "needs_practice"
    return "weak"


def _node_accuracy(node_id: int, meta: _NodeMeta, correct: int, total: int) -> NodeAccuracy:
    return NodeAccuracy(
        node_id=node_id,
        name=meta.name,
        level=meta.level,
        path=meta.path,
        correct_count=correct,
        total_count=total,
        accuracy=(correct / total) if total > 0 else None,
        verdict=_classify(correct, total),
        page_start=meta.page_start,
        page_end=meta.page_end,
    )


def _rollup_per_student(
    stats: list[NodeStudentStat], node_index: dict[int, _NodeMeta]
) -> dict[int, dict[int, list[int]]]:
    """student_id -> node_id -> [correct, total] — each leaf's counts are added to the
    leaf itself and to every ancestor (topic, chapter), weighted by question count, never
    averaged percentages."""
    per_student: dict[int, dict[int, list[int]]] = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for stat in stats:
        meta = node_index.get(stat.node_id)
        if meta is None:
            continue  # defensive — shouldn't happen, a node from outside this test's book
        for node_id in (stat.node_id, *meta.ancestors):
            agg = per_student[stat.student_id][node_id]
            agg[0] += stat.correct_count
            agg[1] += stat.total_count
    return per_student


def _build_node_accuracy_list(
    node_totals: dict[int, list[int]], node_index: dict[int, _NodeMeta]
) -> list[NodeAccuracy]:
    accuracies = [
        _node_accuracy(node_id, node_index[node_id], correct, total)
        for node_id, (correct, total) in node_totals.items()
        if node_id in node_index
    ]
    accuracies.sort(key=lambda n: (_LEVEL_ORDER[n.level], n.path))
    return accuracies


def _compute_evidence(
    test: Test,
) -> Result[tuple[dict[int, _NodeMeta], dict[int, dict[int, list[int]]], list[StudentScore]], "AppError"]:
    tree_result = CurriculumNodeRepository.get_tree(test.book_id)
    if tree_result.is_err():
        return err(tree_result.error)
    node_index = _build_node_index(tree_result.value)

    stats_result = ReportRepository.get_node_student_stats(test.id)
    if stats_result.is_err():
        return err(stats_result.error)

    scores_result = ReportRepository.get_student_scores(test.id)
    if scores_result.is_err():
        return err(scores_result.error)
    if not scores_result.value:
        return err(ERRORS["NO_RESULTS_YET"])

    per_student_nodes = _rollup_per_student(stats_result.value, node_index)
    return ok((node_index, per_student_nodes, scores_result.value))


def _build_student_report(
    test_id: int,
    score: StudentScore,
    node_totals: dict[int, list[int]],
    node_index: dict[int, _NodeMeta],
) -> StudentReport:
    node_accuracies = _build_node_accuracy_list(node_totals, node_index)
    weak_nodes = [n for n in node_accuracies if n.verdict in _ACTIONABLE_VERDICTS]
    score_percent = (score.correct_count / score.total_count) if score.total_count else None
    return StudentReport(
        student_id=score.student_id,
        student_name=score.student_name,
        test_id=test_id,
        score_correct=score.correct_count,
        score_total=score.total_count,
        score_percent=score_percent,
        node_accuracies=node_accuracies,
        weak_nodes=weak_nodes,
        summary=None,
    )


def _build_class_report(
    class_id: int,
    test_id: int,
    student_scores: list[StudentScore],
    per_student_nodes: dict[int, dict[int, list[int]]],
    node_index: dict[int, _NodeMeta],
) -> ClassReport:
    class_node_totals: dict[int, list[int]] = defaultdict(lambda: [0, 0])
    all_node_ids: set[int] = set()
    for nodes in per_student_nodes.values():
        all_node_ids.update(nodes.keys())
        for node_id, (correct, total) in nodes.items():
            agg = class_node_totals[node_id]
            agg[0] += correct
            agg[1] += total

    node_accuracies = _build_node_accuracy_list(class_node_totals, node_index)

    bucket_counts: dict[int, dict[str, int]] = {
        node_id: {"strong": 0, "needs_practice": 0, "weak": 0, "insufficient_data": 0}
        for node_id in all_node_ids
        if node_id in node_index
    }
    # Iterate every graded student, not just per_student_nodes.values() — a student with
    # zero node-mapped answers still has no key there and must still count as
    # insufficient_data on each node, not be silently skipped from the bucket totals.
    for score in student_scores:
        nodes = per_student_nodes.get(score.student_id, {})
        for node_id in bucket_counts:
            correct, total = nodes.get(node_id, [0, 0])
            bucket_counts[node_id][_classify(correct, total)] += 1

    node_buckets = [
        StudentNodeBucket(
            node_id=node_id,
            name=node_index[node_id].name,
            path=node_index[node_id].path,
            strong_count=counts["strong"],
            needs_practice_count=counts["needs_practice"],
            weak_count=counts["weak"],
            insufficient_data_count=counts["insufficient_data"],
        )
        for node_id, counts in bucket_counts.items()
    ]
    node_buckets.sort(key=lambda b: (_LEVEL_ORDER[node_index[b.node_id].level], b.path))

    percents = [s.correct_count / s.total_count for s in student_scores if s.total_count]
    average_score_percent = (sum(percents) / len(percents)) if percents else None

    return ClassReport(
        class_id=class_id,
        test_id=test_id,
        students_evaluated=len(student_scores),
        average_score_percent=average_score_percent,
        node_accuracies=node_accuracies,
        node_student_buckets=node_buckets,
        summary=None,
    )


def _weak_node_evidence(node_accuracies: list[NodeAccuracy]) -> list[WeakNodeEvidence]:
    return [
        WeakNodeEvidence(path=n.path, accuracy=n.accuracy or 0.0, verdict=n.verdict)
        for n in node_accuracies
        if n.verdict in _ACTIONABLE_VERDICTS
    ]


async def _add_class_summary(
    class_report: ClassReport | ClassCumulativeReport, llm: ILlmService, test_id: int
) -> None:
    evidence = ClassReportEvidence(
        students_evaluated=class_report.students_evaluated,
        average_score_percent=class_report.average_score_percent or 0.0,
        weak_nodes=_weak_node_evidence(class_report.node_accuracies),
    )
    result = await llm.phrase_class_report(evidence)
    if result.is_ok():
        class_report.summary = result.value
    else:
        logger.warning("Class report narrative failed for test %s: %s", test_id, result.error.message)


def _build_cumulative_report(
    student_id: int,
    student_name: str,
    book_id: int,
    year: int,
    month: int,
    period_reports: list[StudentReport],
    node_index: dict[int, _NodeMeta],
) -> CumulativeReport:
    # period_reports is re-fetched fresh each call, so this naturally re-sums rather
    # than double-counting when a test in the period gets regenerated.
    score_correct = sum(r.score_correct for r in period_reports)
    score_total = sum(r.score_total for r in period_reports)
    score_percent = (score_correct / score_total) if score_total else None

    node_totals: dict[int, list[int]] = defaultdict(lambda: [0, 0])
    for r in period_reports:
        for n in r.node_accuracies:
            agg = node_totals[n.node_id]
            agg[0] += n.correct_count
            agg[1] += n.total_count

    node_accuracies = _build_node_accuracy_list(node_totals, node_index)
    weak_nodes = [n for n in node_accuracies if n.verdict in _ACTIONABLE_VERDICTS]

    return CumulativeReport(
        student_id=student_id,
        student_name=student_name,
        book_id=book_id,
        report_year=year,
        report_month=month,
        tests_included=len(period_reports),
        score_correct=score_correct,
        score_total=score_total,
        score_percent=score_percent,
        node_accuracies=node_accuracies,
        weak_nodes=weak_nodes,
        summary=None,
    )


def _build_class_cumulative_report(
    class_id: int,
    book_id: int,
    year: int,
    month: int,
    cumulative_reports: list[CumulativeReport],
    node_index: dict[int, _NodeMeta],
) -> ClassCumulativeReport:
    class_node_totals: dict[int, list[int]] = defaultdict(lambda: [0, 0])
    all_node_ids: set[int] = set()
    per_student_node_totals: dict[int, dict[int, tuple[int, int]]] = {}
    for report in cumulative_reports:
        node_totals = {n.node_id: (n.correct_count, n.total_count) for n in report.node_accuracies}
        per_student_node_totals[report.student_id] = node_totals
        all_node_ids.update(node_totals.keys())
        for node_id, (correct, total) in node_totals.items():
            agg = class_node_totals[node_id]
            agg[0] += correct
            agg[1] += total

    node_accuracies = _build_node_accuracy_list(class_node_totals, node_index)

    bucket_counts: dict[int, dict[str, int]] = {
        node_id: {"strong": 0, "needs_practice": 0, "weak": 0, "insufficient_data": 0}
        for node_id in all_node_ids
        if node_id in node_index
    }
    for report in cumulative_reports:
        nodes = per_student_node_totals[report.student_id]
        for node_id in bucket_counts:
            correct, total = nodes.get(node_id, (0, 0))
            bucket_counts[node_id][_classify(correct, total)] += 1

    node_buckets = [
        StudentNodeBucket(
            node_id=node_id,
            name=node_index[node_id].name,
            path=node_index[node_id].path,
            strong_count=counts["strong"],
            needs_practice_count=counts["needs_practice"],
            weak_count=counts["weak"],
            insufficient_data_count=counts["insufficient_data"],
        )
        for node_id, counts in bucket_counts.items()
    ]
    node_buckets.sort(key=lambda b: (_LEVEL_ORDER[node_index[b.node_id].level], b.path))

    percents = [r.score_correct / r.score_total for r in cumulative_reports if r.score_total]
    average_score_percent = (sum(percents) / len(percents)) if percents else None

    return ClassCumulativeReport(
        class_id=class_id,
        book_id=book_id,
        report_year=year,
        report_month=month,
        students_evaluated=len(cumulative_reports),
        average_score_percent=average_score_percent,
        node_accuracies=node_accuracies,
        node_student_buckets=node_buckets,
        summary=None,
    )


@router.post("/api/tests/{test_id}/report/generate")
async def generate_report(
    test_id: int,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
    llm: ILlmService = Depends(get_llm_service),
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    test = scoped.value

    counts_result = ReportRepository.get_grading_counts(test_id)
    if counts_result.is_err():
        return _err(counts_result.error)
    counts = counts_result.value
    if counts.pending + counts.needs_review + counts.processed == 0:
        return _err(ERRORS["NO_RESULTS_YET"])
    if counts.pending > 0 or counts.needs_review > 0:
        return _err(ERRORS["TEST_GRADING_INCOMPLETE"])

    evidence_result = _compute_evidence(test)
    if evidence_result.is_err():
        return _err(evidence_result.error)
    node_index, per_student_nodes, student_scores = evidence_result.value

    student_reports = [
        _build_student_report(test_id, score, per_student_nodes.get(score.student_id, {}), node_index)
        for score in student_scores
    ]
    class_report = _build_class_report(test.class_id, test_id, student_scores, per_student_nodes, node_index)

    await _add_class_summary(class_report, llm, test_id)

    save_result = ReportRepository.save_test_reports(class_report, student_reports)
    if save_result.is_err():
        return _err(save_result.error)

    cumulative_year, cumulative_month = _cumulative_period(test)
    cumulative_reports = []
    for score in student_scores:
        period_result = ReportRepository.get_student_reports_for_period(
            score.student_id, test.book_id, cumulative_year, cumulative_month
        )
        if period_result.is_err():
            return _err(period_result.error)
        cumulative_reports.append(
            _build_cumulative_report(
                score.student_id,
                score.student_name,
                test.book_id,
                cumulative_year,
                cumulative_month,
                period_result.value,
                node_index,
            )
        )

    cumulative_save_result = ReportRepository.save_cumulative_reports(cumulative_reports)
    if cumulative_save_result.is_err():
        return _err(cumulative_save_result.error)

    # Re-fetched after the save above, not built from cumulative_reports directly — this
    # class's cumulative must include every enrolled student with a row for this
    # book/month, not just the students from the test that triggered this generate call.
    class_period_result = ReportRepository.get_cumulative_reports_for_class(
        test.class_id, test.book_id, cumulative_year, cumulative_month
    )
    if class_period_result.is_err():
        return _err(class_period_result.error)
    class_cumulative_report = _build_class_cumulative_report(
        test.class_id, test.book_id, cumulative_year, cumulative_month, class_period_result.value, node_index
    )
    await _add_class_summary(class_cumulative_report, llm, test_id)

    class_cumulative_save_result = ReportRepository.save_class_cumulative_report(class_cumulative_report)
    if class_cumulative_save_result.is_err():
        return _err(class_cumulative_save_result.error)

    response = TestReportResponse(class_report=class_report, student_reports=student_reports)
    return JSONResponse(
        status_code=200, content=success_response(response.model_dump(mode="json"), "Report generated")
    )


@router.get("/api/tests/{test_id}/report/class")
async def get_class_report(
    test_id: int,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    scoped = _ensure_test_scoped(test_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)
    test = scoped.value

    report_result = ReportRepository.get_class_report(test_id, test.class_id)
    if report_result.is_err():
        return _err(report_result.error)

    return JSONResponse(
        status_code=200, content=success_response(report_result.value.model_dump(mode="json"))
    )


@router.get("/api/tests/{test_id}/report/students/{student_id}")
async def get_student_report(
    test_id: int,
    student_id: int,
    current_user: TokenData = Depends(get_current_user),
) -> JSONResponse:
    test_result = TestRepository.find_by_id(test_id)
    if test_result.is_err():
        return _err(test_result.error)
    test = test_result.value

    if current_user.role == "student":
        if current_user.id != student_id:
            return _err(ERRORS["FORBIDDEN"])
    else:
        scoped = ensure_class_assigned_or_admin(test.class_id, current_user)
        if scoped.is_err():
            return _err(scoped.error)

    report_result = ReportRepository.get_student_report(test_id, student_id)
    if report_result.is_err():
        return _err(report_result.error)

    return JSONResponse(
        status_code=200, content=success_response(report_result.value.model_dump(mode="json"))
    )


@router.get("/api/students/{student_id}/report/cumulative")
async def get_cumulative_report(
    student_id: int,
    book_id: int,
    year: int,
    month: int,
    current_user: TokenData = Depends(get_current_user),
) -> JSONResponse:
    if current_user.role == "student":
        if current_user.id != student_id:
            return _err(ERRORS["FORBIDDEN"])
    else:
        scoped = ensure_shares_book_with_student_or_admin(student_id, book_id, current_user)
        if scoped.is_err():
            return _err(scoped.error)

    report_result = ReportRepository.get_cumulative_report(student_id, book_id, year, month)
    if report_result.is_err():
        return _err(report_result.error)

    return JSONResponse(
        status_code=200, content=success_response(report_result.value.model_dump(mode="json"))
    )


@router.get("/api/classes/{class_id}/report/cumulative")
async def get_class_cumulative_report(
    class_id: int,
    book_id: int,
    year: int,
    month: int,
    current_user: TokenData = Depends(get_current_teacher_or_admin),
) -> JSONResponse:
    scoped = ensure_class_assigned_or_admin(class_id, current_user)
    if scoped.is_err():
        return _err(scoped.error)

    report_result = ReportRepository.get_class_cumulative_report(class_id, book_id, year, month)
    if report_result.is_err():
        return _err(report_result.error)

    return JSONResponse(
        status_code=200, content=success_response(report_result.value.model_dump(mode="json"))
    )
