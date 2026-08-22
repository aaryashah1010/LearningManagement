"use client";

import Link from "next/link";
import { CheckIcon, XIcon } from "@/components/icons";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSubmissionDetail } from "@/features/submissions/hooks";
import { useStudentTests } from "../hooks";

// The list endpoint (GET /students/{id}/tests) already returns a correct/total
// count computed in SQL, but the detail view derives its own score straight from
// this submission's answers array — a manual, client-side recount rather than a
// second trip to the server for a number we can already work out ourselves.
function computeScore(answers: { is_correct: boolean | null }[]) {
  const total = answers.length;
  const correct = answers.filter((a) => a.is_correct === true).length;
  return { correct, total };
}

function AnswerRow({
  questionNumber,
  extractedAnswer,
  correctOption,
  isCorrect,
  needsReview,
}: {
  questionNumber: number | null;
  extractedAnswer: string | null;
  correctOption: string | null;
  isCorrect: boolean | null;
  needsReview: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-ink dark:text-paper">Q{questionNumber}</span>
      <span className="flex items-center gap-3">
        <span className="font-utility text-xs text-ink/55 dark:text-paper/55">
          Your answer: {extractedAnswer ?? "—"} · Correct: {correctOption ?? "—"}
        </span>
        {needsReview ? (
          <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-mark">
            In review
          </span>
        ) : isCorrect ? (
          <CheckIcon className="h-4 w-4 text-chart-green" />
        ) : (
          <XIcon className="h-4 w-4 text-mark" />
        )}
      </span>
    </li>
  );
}

export function StudentTestDetail({ testId }: { testId: number }) {
  const { user } = useAuth();
  const { tests, isLoading: isListLoading } = useStudentTests(user?.id ?? 0);
  const test = tests.find((t) => t.id === testId);

  if (isListLoading || !test) {
    return <div className="h-8 w-64 animate-pulse rounded bg-ink/10 dark:bg-paper/10" />;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/student/tests"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
      >
        <span aria-hidden>←</span> All tests
      </Link>

      <h2 className="font-display text-3xl text-ink dark:text-paper">{test.title}</h2>

      {!test.submission_id ? (
        <p className="text-sm text-ink/50 dark:text-paper/50">
          Your answer sheet hasn&rsquo;t been uploaded yet — check back once your teacher has scanned it.
        </p>
      ) : (
        <SubmissionBreakdown submissionId={test.submission_id} />
      )}
    </div>
  );
}

function SubmissionBreakdown({ submissionId }: { submissionId: number }) {
  const { submission, isLoading } = useSubmissionDetail(submissionId);

  if (isLoading || !submission) {
    return <div className="h-24 w-full animate-pulse rounded-2xl bg-ink/5 dark:bg-paper/5" />;
  }

  if (submission.status !== "processed") {
    return (
      <p className="text-sm text-ink/50 dark:text-paper/50">
        Your teacher is still reviewing this submission — your score will show up here once it&rsquo;s
        finalized.
      </p>
    );
  }

  const { correct, total } = computeScore(submission.answers);
  const percent = total > 0 ? Math.round((correct / total) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
        <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
          Score
        </p>
        <p className="mt-1 font-display text-3xl text-ink dark:text-paper">
          {percent === null ? "—" : `${percent}%`}
        </p>
        <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
          {correct} of {total} correct
        </p>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
        <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
          Answers
        </p>
        <ul className="mt-2 flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
          {submission.answers
            .slice()
            .sort((a, b) => (a.question_number ?? 0) - (b.question_number ?? 0))
            .map((answer) => (
              <AnswerRow
                key={answer.id}
                questionNumber={answer.question_number}
                extractedAnswer={answer.extracted_answer}
                correctOption={answer.correct_option}
                isCorrect={answer.is_correct}
                needsReview={answer.needs_review}
              />
            ))}
        </ul>
      </div>
    </div>
  );
}
