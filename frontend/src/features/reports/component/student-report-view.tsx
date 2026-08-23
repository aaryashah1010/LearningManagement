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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
              <h3 className="font-display text-lg text-ink dark:text-paper">Topic accuracy</h3>
              <div className="mt-4">
                <NodeAccuracyTable nodes={report.node_accuracies} />
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
              <div>
                <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
                  Your score
                </p>
                <p className="mt-1 font-display text-3xl text-ink dark:text-paper">{pct(report.score_percent)}</p>
                <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
                  {report.score_correct} of {report.score_total} correct
                </p>
              </div>
              {report.summary && <p className="text-sm text-ink/70 dark:text-paper/70">{report.summary}</p>}
              {report.weak_nodes.length > 0 && (
                <div>
                  <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
                    Focus on
                  </p>
                  <div className="mt-2">
                    <NodeAccuracyTable nodes={report.weak_nodes} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
        <h3 className="font-display text-lg text-ink dark:text-paper">This month</h3>
        {controller.isCumulativeLoading ? (
          <div className="mt-4 h-24 w-full animate-pulse rounded-xl bg-ink/5 dark:bg-paper/5" />
        ) : controller.cumulativeReport ? (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <p className="font-display text-3xl text-ink dark:text-paper">
                {pct(controller.cumulativeReport.score_percent)}
              </p>
              <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
                {controller.cumulativeReport.score_correct} of {controller.cumulativeReport.score_total} correct
                across {controller.cumulativeReport.tests_included} test
                {controller.cumulativeReport.tests_included === 1 ? "" : "s"}
              </p>
            </div>
            {controller.cumulativeReport.summary && (
              <p className="text-sm text-ink/70 dark:text-paper/70">{controller.cumulativeReport.summary}</p>
            )}
            {controller.cumulativeReport.weak_nodes.length > 0 && (
              <NodeAccuracyTable nodes={controller.cumulativeReport.weak_nodes} />
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink/50 dark:text-paper/50">
            No cumulative report for this month yet.
          </p>
        )}
      </div>
    </div>
  );
}
