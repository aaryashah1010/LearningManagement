"use client";

import { AlertIcon } from "@/components/icons";
import { useStudentReportPageController } from "../hooks/useStudentReportPageController";
import { NodeAccuracyTable, pct } from "./node-accuracy-table";

export function StudentReportView() {
  const controller = useStudentReportPageController();

  if (controller.isTestsLoading) {
    return <div className="h-10 w-64 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
  }

  if (!controller.hasAnyTests) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No tests published for your class yet.</p>;
  }

  if (controller.gradedTests.length === 0) {
    return (
      <p className="text-sm text-ink/50 dark:text-paper/50">
        Your reports will appear here once a test has been fully graded.
      </p>
    );
  }

  const report = controller.report;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:max-w-sm">
        <label htmlFor="student-report-test-picker" className="text-sm font-medium text-ink/80 dark:text-paper/80">
          Test
        </label>
        <select
          id="student-report-test-picker"
          value={controller.testId ?? ""}
          onChange={(event) => controller.setTestId(Number(event.target.value))}
          className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
        >
          {controller.gradedTests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {controller.error && (
        <p className="flex items-center gap-2 font-utility text-[11px] text-mark">
          <AlertIcon className="h-3.5 w-3.5" /> {controller.error.message}
        </p>
      )}

      {controller.isReportLoading ? (
        <div className="h-40 w-full animate-pulse rounded-2xl bg-ink/5 dark:bg-paper/5" />
      ) : (
        report && (
          <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-display text-lg text-ink dark:text-paper">Topic accuracy</h3>
              <p className="text-sm text-ink/55 dark:text-paper/55">
                <span className="font-display text-2xl text-ink dark:text-paper">{pct(report.score_percent)}</span>{" "}
                {report.score_correct} of {report.score_total} correct
              </p>
            </div>
            {report.summary && (
              <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">{report.summary}</p>
            )}
            <div className="mt-4">
              <NodeAccuracyTable nodes={report.node_accuracies} />
            </div>
          </div>
        )
      )}
    </div>
  );
}
