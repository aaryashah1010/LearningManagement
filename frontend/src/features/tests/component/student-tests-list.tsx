"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatDate } from "@/lib/format-date";
import { useStudentTests } from "../hooks";
import type { StudentTestSummary } from "../types";

function TestRowSkeleton() {
  return <div className="h-14 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
}

function ResultBadge({ test }: { test: StudentTestSummary }) {
  if (!test.submission_id) {
    return (
      <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-ink/35 dark:text-paper/35">
        No submission yet
      </span>
    );
  }
  if (test.submission_status !== "processed" || !test.total_count) {
    return (
      <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-chart-amber">
        {test.submission_status === "needs_review" ? "Being reviewed" : "Not graded yet"}
      </span>
    );
  }
  const percent = Math.round(((test.correct_count ?? 0) / test.total_count) * 100);
  return (
    <span className="font-utility text-sm font-semibold text-chart-green">
      {percent}% <span className="text-ink/40 dark:text-paper/40">({test.correct_count}/{test.total_count})</span>
    </span>
  );
}

export function StudentTestsList() {
  const { user } = useAuth();
  const { tests, isLoading } = useStudentTests(user?.id ?? 0);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <TestRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tests.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No tests published for your class yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-ink/8 rounded-2xl border border-ink/10 dark:divide-paper/8 dark:border-paper/10">
      {tests.map((test) => (
        <li key={test.id}>
          <Link
            href={`/student/tests/${test.id}`}
            className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-correct dark:hover:bg-paper/[0.04]"
          >
            <div>
              <p className="font-medium text-ink dark:text-paper">{test.title}</p>
              <p className="font-utility text-xs text-ink/45 dark:text-paper/45">
                Published {formatDate(test.published_at)}
              </p>
            </div>
            <ResultBadge test={test} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
