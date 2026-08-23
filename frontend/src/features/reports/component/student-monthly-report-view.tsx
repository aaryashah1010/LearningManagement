"use client";

import { useStudentMonthlyReportPageController } from "../hooks/useStudentMonthlyReportPageController";
import { NodeAccuracyTable, pct } from "./node-accuracy-table";

export function StudentMonthlyReportView() {
  const controller = useStudentMonthlyReportPageController();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor="student-monthly-subject" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Subject
          </label>
          <select
            id="student-monthly-subject"
            value={controller.subjectId ?? ""}
            onChange={(event) => controller.setSubjectId(Number(event.target.value) || null)}
            className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
          >
            <option value="">Choose a subject…</option>
            {controller.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="student-monthly-book" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Book
          </label>
          <select
            id="student-monthly-book"
            value={controller.bookId ?? ""}
            onChange={(event) => controller.setBookId(Number(event.target.value) || null)}
            disabled={!controller.subjectId}
            className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none disabled:opacity-50 dark:border-paper/20 dark:text-paper"
          >
            <option value="">Choose a book…</option>
            {controller.books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
                {b.grade ? ` · ${b.grade}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="student-monthly-month" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Month
          </label>
          <input
            id="student-monthly-month"
            type="month"
            value={controller.monthInputValue}
            onChange={(event) => controller.setMonthInput(event.target.value)}
            className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
          />
        </div>
      </div>

      {!controller.bookId ? (
        <p className="text-sm text-ink/50 dark:text-paper/50">Choose a subject and book to see your report.</p>
      ) : controller.isLoading ? (
        <div className="h-40 w-full animate-pulse rounded-2xl bg-ink/5 dark:bg-paper/5" />
      ) : controller.report ? (
        <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-lg text-ink dark:text-paper">Topic accuracy</h3>
            <p className="text-sm text-ink/55 dark:text-paper/55">
              <span className="font-display text-2xl text-ink dark:text-paper">
                {pct(controller.report.score_percent)}
              </span>{" "}
              {controller.report.score_correct} of {controller.report.score_total} correct across{" "}
              {controller.report.tests_included} test{controller.report.tests_included === 1 ? "" : "s"}
            </p>
          </div>
          {controller.report.summary && (
            <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">{controller.report.summary}</p>
          )}
          <div className="mt-4">
            <NodeAccuracyTable nodes={controller.report.node_accuracies} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/50 dark:text-paper/50">
          No report for this subject and month yet.
        </p>
      )}
    </div>
  );
}
