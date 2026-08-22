"use client";

import Link from "next/link";
import { useState } from "react";
import { TopicTree } from "@/components/charts/TopicTree";
import { TrendChart } from "@/components/charts/TrendChart";
import { CheckIcon, ChevronIcon, PencilIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  CLASS_WEAK_TOPICS,
  submissionsForTest,
  submissionStudentName,
  TEST_HISTORY,
  type MockAnswer,
  type MockClass,
  type MockQuestion,
  type MockTest,
  type QuestionOption,
} from "@/lib/mock-data";

const OPTIONS: QuestionOption[] = ["A", "B", "C", "D"];

type FlowStep = "idle" | "uploading" | "processing" | "review" | "report";

interface ReviewRow {
  studentId: string;
  studentName: string;
  answers: MockAnswer[];
}

// Stand-in for what grading would hand back when a test has no uploaded
// submissions yet — same "AI extraction demo" pattern as TestReview's
// DEMO_QUESTIONS, sprinkled with a few wrong/low-confidence answers so the
// review step has something to fix.
function synthesizeRows(cls: MockClass, questions: MockQuestion[]): ReviewRow[] {
  return cls.roster.map((student, i) => ({
    studentId: student.id,
    studentName: student.name,
    answers: questions.map((q, qi) => {
      const missed = (i + qi) % 4 === 0;
      const lowConfidence = (i + qi) % 7 === 0;
      const wrongOption = OPTIONS[(OPTIONS.indexOf(q.correctAnswer) + 1) % OPTIONS.length];
      return {
        questionId: q.id,
        questionNumber: q.number,
        studentAnswer: missed ? wrongOption : q.correctAnswer,
        correctAnswer: q.correctAnswer,
        confidence: lowConfidence ? "low" : "high",
        needsReview: lowConfidence,
      };
    }),
  }));
}

function buildRows(test: MockTest, cls: MockClass, questions: MockQuestion[]): ReviewRow[] {
  const existing = submissionsForTest(test.id);
  if (existing.length > 0) {
    return existing.map((s) => ({
      studentId: s.studentId,
      studentName: submissionStudentName(s),
      answers: s.answers,
    }));
  }
  return questions.length > 0 ? synthesizeRows(cls, questions) : [];
}

function scoreFor(answers: MockAnswer[]): number {
  if (answers.length === 0) return 0;
  const correct = answers.filter((a) => a.studentAnswer === a.correctAnswer).length;
  return Math.round((correct / answers.length) * 100);
}

function StudentAnswers({
  row,
  onSave,
}: {
  row: ReviewRow;
  onSave: (studentId: string, answers: MockAnswer[]) => void;
}) {
  const [answers, setAnswers] = useState<MockAnswer[]>(row.answers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAnswer, setDraftAnswer] = useState<QuestionOption>("A");

  function startEdit(answer: MockAnswer) {
    setEditingId(answer.questionId);
    setDraftAnswer(answer.studentAnswer ?? "A");
  }

  function confirm(questionId: string) {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId
          ? { ...a, studentAnswer: draftAnswer, needsReview: false, confidence: "high" }
          : a
      )
    );
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-ink/8 px-5 py-4 dark:border-paper/8">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink/45 dark:text-paper/45">
            <th className="py-2 pr-3 font-medium">Q</th>
            <th className="py-2 pr-3 font-medium">Answer</th>
            <th className="py-2 pr-3 font-medium">Correct</th>
            <th className="py-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {answers.map((answer) => {
            const isCorrect = answer.studentAnswer === answer.correctAnswer;
            return (
              <tr key={answer.questionId} className="border-t border-ink/8 dark:border-paper/8">
                <td className="py-2 pr-3 font-utility text-xs text-ink/50 dark:text-paper/50">
                  {answer.questionNumber}
                </td>
                <td className="py-2 pr-3">
                  {editingId === answer.questionId ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setDraftAnswer(opt)}
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 font-utility text-xs font-semibold transition-colors ${
                              draftAnswer === opt
                                ? "border-correct bg-correct text-ink"
                                : "border-ink/20 text-ink/60 dark:border-paper/25 dark:text-paper/60"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <Button onClick={() => confirm(answer.questionId)}>Confirm</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-utility text-xs font-semibold text-ink dark:text-paper">
                        {answer.studentAnswer ?? "—"}
                      </span>
                      {answer.needsReview && (
                        <span className="font-utility text-[10px] font-semibold uppercase tracking-wide text-mark">
                          Flagged
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(answer)}
                        className="font-utility text-[11px] font-medium text-correct hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-2 pr-3 font-utility text-xs font-semibold text-ink/70 dark:text-paper/70">
                  {answer.correctAnswer}
                </td>
                <td className="py-2">
                  <span
                    className={`font-utility text-[11px] font-medium uppercase tracking-wide ${
                      isCorrect ? "text-chart-green" : "text-mark"
                    }`}
                  >
                    {isCorrect ? "Correct" : "Wrong"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Button onClick={() => onSave(row.studentId, answers)} className="self-start">
        Save changes
      </Button>
    </div>
  );
}

export function MarksheetFlow({
  test,
  cls,
  questions,
}: {
  test: MockTest;
  cls: MockClass;
  questions: MockQuestion[];
}) {
  const [step, setStep] = useState<FlowStep>("idle");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  function startEditName(row: ReviewRow) {
    setEditingNameId(row.studentId);
    setDraftName(row.studentName);
  }

  function saveName(studentId: string) {
    const name = draftName.trim();
    if (name) {
      setRows((prev) =>
        prev.map((r) => (r.studentId === studentId ? { ...r, studentName: name } : r))
      );
    }
    setEditingNameId(null);
  }

  function handleUpload() {
    setStep("uploading");
    setTimeout(() => {
      setStep("processing");
      setTimeout(() => {
        setRows(buildRows(test, cls, questions));
        setStep("review");
      }, 1100);
    }, 900);
  }

  function handleSaveRow(studentId: string, answers: MockAnswer[]) {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, answers } : r)));
    setSavedIds((prev) => new Set(prev).add(studentId));
    setExpandedId(null);
  }

  const totalFlagged = rows.reduce(
    (sum, r) => sum + r.answers.filter((a) => a.needsReview).length,
    0
  );
  const cumulative = TEST_HISTORY[cls.id];
  const topics = CLASS_WEAK_TOPICS[cls.id];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg text-ink dark:text-paper">OMR sheets</h3>
        {rows.length > 0 && (
          <p className="text-sm text-ink/50 dark:text-paper/50">
            {rows.length} student{rows.length === 1 ? "" : "s"} graded
          </p>
        )}
      </div>

      {step === "idle" && (
        <>
          <p className="max-w-md text-sm text-ink/55 dark:text-paper/55">
            Upload one PDF containing every student&rsquo;s completed answer sheet
            for this test — no need to sort or label them first.
          </p>
          <Button onClick={handleUpload} className="self-start">
            Upload OMR sheets
          </Button>
        </>
      )}

      {step === "uploading" && (
        <p className="text-sm text-ink/55 dark:text-paper/55">Uploading…</p>
      )}

      {step === "processing" && (
        <p className="animate-pulse text-sm text-ink/55 dark:text-paper/55">
          Grading in progress — matching bubbles to the answer key…
        </p>
      )}

      {step === "review" && (
        <>
          <p className="text-sm text-ink/55 dark:text-paper/55">
            {totalFlagged > 0
              ? `${totalFlagged} answer${totalFlagged === 1 ? "" : "s"} flagged for review.`
              : "All answers confirmed."}{" "}
            Review any student, fix and save, then generate the report.
          </p>

          <div className="overflow-hidden rounded-2xl border border-ink/10 dark:border-paper/10">
            {rows.map((row) => {
              const flagged = row.answers.filter((a) => a.needsReview).length;
              const expanded = expandedId === row.studentId;
              const editingName = editingNameId === row.studentId;
              return (
                <div
                  key={row.studentId}
                  className="border-b border-ink/8 last:border-0 dark:border-paper/8"
                >
                  <div
                    onClick={() => {
                      if (!editingName) setExpandedId(expanded ? null : row.studentId);
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left hover:bg-ink/[0.02] dark:hover:bg-paper/[0.03]"
                  >
                    {editingName ? (
                      <div
                        className="flex flex-1 items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveName(row.studentId);
                            if (event.key === "Escape") setEditingNameId(null);
                          }}
                          className="w-full max-w-[220px] rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1 text-sm font-medium text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
                        />
                        <button
                          type="button"
                          onClick={() => saveName(row.studentId)}
                          className="font-utility text-[11px] font-medium text-correct hover:underline"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNameId(null)}
                          className="font-utility text-[11px] font-medium text-ink/45 hover:underline dark:text-paper/45"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="flex flex-1 items-center gap-2">
                        <span className="font-medium text-ink dark:text-paper">
                          {row.studentName}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            startEditName(row);
                          }}
                          aria-label={`Edit ${row.studentName}'s name`}
                          className="text-ink/35 hover:text-ink dark:text-paper/40 dark:hover:text-paper"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                    {savedIds.has(row.studentId) && (
                      <span className="flex items-center gap-1 font-utility text-[11px] font-medium uppercase tracking-wide text-chart-green">
                        <CheckIcon className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                    {flagged > 0 ? (
                      <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-mark">
                        {flagged} flagged
                      </span>
                    ) : (
                      <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-chart-green">
                        Clear
                      </span>
                    )}
                    <span className="font-utility text-xs font-semibold text-ink dark:text-paper">
                      {scoreFor(row.answers)}%
                    </span>
                    <ChevronIcon
                      className={`h-4 w-4 text-ink/40 transition-transform dark:text-paper/40 ${
                        expanded ? "rotate-90" : "-rotate-90"
                      }`}
                    />
                  </div>
                  {expanded && <StudentAnswers row={row} onSave={handleSaveRow} />}
                </div>
              );
            })}
          </div>

          <Button onClick={() => setStep("report")} className="self-start">
            Generate report
          </Button>
        </>
      )}

      {step === "report" && (
        <>
          <p className="flex items-center gap-2 text-sm text-chart-green">
            <CheckIcon className="h-4 w-4" /> Report generated for {test.title}.
          </p>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
            {topics && (
              <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
                <div className="flex items-baseline justify-between">
                  <h4 className="font-display text-base text-ink dark:text-paper">
                    {cls.name} · topic accuracy
                  </h4>
                  <Link
                    href="/teacher/reports"
                    className="text-sm font-medium text-correct hover:underline"
                  >
                    Full class report →
                  </Link>
                </div>
                <div className="mt-4">
                  <TopicTree nodes={topics} />
                </div>
              </div>
            )}

            {cumulative && (
              <TrendChart
                title={`${cls.name} · cumulative`}
                periodLabel="Class average"
                unitLabel="class average"
                data={cumulative}
                valueSuffix="%"
              />
            )}
          </div>

          <div className="rounded-2xl border border-ink/10 dark:border-paper/10">
            <div className="flex items-baseline justify-between border-b border-ink/10 px-5 py-3 dark:border-paper/10">
              <h4 className="font-display text-base text-ink dark:text-paper">Student reports</h4>
              <p className="text-sm text-ink/50 dark:text-paper/50">{rows.length} students</p>
            </div>
            <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
              {rows.map((row) => (
                <li key={row.studentId}>
                  <Link
                    href={`/teacher/students/${row.studentId}/report`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:text-correct"
                  >
                    <span className="font-medium text-ink dark:text-paper">{row.studentName}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-utility text-xs font-semibold text-ink/70 dark:text-paper/70">
                        {scoreFor(row.answers)}%
                      </span>
                      <span className="text-correct">View report →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Button variant="ghost" onClick={() => setStep("review")} className="self-start">
            Back to review
          </Button>
        </>
      )}
    </div>
  );
}
