"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { submissionStudentName, type MockAnswer, type MockSubmission, type QuestionOption } from "@/lib/mock-data";

const OPTIONS: QuestionOption[] = ["A", "B", "C", "D"];

export function SubmissionReview({
  submission,
  testTitle,
}: {
  submission: MockSubmission;
  testTitle: string;
}) {
  const [answers, setAnswers] = useState<MockAnswer[]>(submission.answers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAnswer, setDraftAnswer] = useState<QuestionOption>("A");

  function startFix(answer: MockAnswer) {
    setEditingId(answer.questionId);
    setDraftAnswer(answer.studentAnswer ?? "A");
  }

  function confirm(questionId: string, value: QuestionOption) {
    setAnswers((prev) =>
      prev.map((row) =>
        row.questionId === questionId
          ? { ...row, studentAnswer: value, needsReview: false, confidence: "high" }
          : row
      )
    );
    setEditingId(null);
  }

  const remaining = answers.filter((a) => a.needsReview).length;
  const correctCount = answers.filter((a) => a.studentAnswer === a.correctAnswer).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-ink/55 dark:text-paper/55">{testTitle}</p>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl text-ink dark:text-paper">
            {submissionStudentName(submission)}
          </h2>
          <Link
            href={`/teacher/students/${submission.studentId}/report`}
            className="text-sm font-medium text-correct hover:underline"
          >
            Full report →
          </Link>
        </div>
        <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
          {correctCount}/{answers.length} correct ·{" "}
          {remaining > 0 ? `${remaining} still flagged` : "all confirmed"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
              <th className="px-5 py-3 font-medium">Q</th>
              <th className="px-5 py-3 font-medium">Student answer</th>
              <th className="px-5 py-3 font-medium">Correct answer</th>
              <th className="px-5 py-3 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {answers.map((answer) => {
              const isCorrect = answer.studentAnswer === answer.correctAnswer;
              return (
                <tr
                  key={answer.questionId}
                  className="border-b border-ink/8 last:border-0 dark:border-paper/8"
                >
                  <td className="px-5 py-3.5 font-utility text-xs text-ink/50 dark:text-paper/50">
                    {answer.questionNumber}
                  </td>
                  <td className="px-5 py-3.5">
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
                        <Button onClick={() => confirm(answer.questionId, draftAnswer)}>
                          Confirm
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-utility text-xs font-semibold text-ink dark:text-paper">
                          {answer.studentAnswer ?? "—"}
                        </span>
                        {answer.needsReview && (
                          <>
                            <span className="font-utility text-[10px] font-semibold uppercase tracking-wide text-mark">
                              Needs review
                            </span>
                            <button
                              type="button"
                              onClick={() => startFix(answer)}
                              className="font-utility text-[11px] font-medium text-correct hover:underline"
                            >
                              Confirm
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-utility text-xs font-semibold text-ink/70 dark:text-paper/70">
                    {answer.correctAnswer}
                  </td>
                  <td className="px-5 py-3.5">
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
      </div>
    </div>
  );
}
