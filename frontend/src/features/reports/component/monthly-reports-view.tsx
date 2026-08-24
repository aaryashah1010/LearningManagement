"use client";

import { useState } from "react";
import { ChevronIcon } from "@/components/icons";
import { Combobox } from "@/components/ui/combobox";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useMonthlyReportsPageController, type MonthlyReportTab } from "../hooks/useMonthlyReportsPageController";
import type { CumulativeReport } from "../types";
import { NodeAccuracyTable, pct } from "./node-accuracy-table";

const TABS: MonthlyReportTab[] = ["class", "student"];
const TAB_LABEL: Record<MonthlyReportTab, string> = { class: "Class", student: "Student" };

function StudentCumulativeRow({ report }: { report: CumulativeReport }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="font-medium text-ink dark:text-paper">{report.student_name}</span>
        <span className="flex items-center gap-3">
          <span className="font-utility text-xs font-semibold text-ink dark:text-paper">
            {pct(report.score_percent)} ({report.score_correct}/{report.score_total}, {report.tests_included} test
            {report.tests_included === 1 ? "" : "s"})
          </span>
          <ChevronIcon
            className={`h-4 w-4 text-ink/40 transition-transform dark:text-paper/40 ${expanded ? "-rotate-90" : "rotate-180"}`}
          />
        </span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl bg-ink/[0.02] p-4 dark:bg-paper/[0.03]">
          <NodeAccuracyTable nodes={report.node_accuracies} />
        </div>
      )}
    </li>
  );
}

export function MonthlyReportsView() {
  const controller = useMonthlyReportsPageController();

  if (controller.isClassesLoading) {
    return <div className="h-10 w-64 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
  }

  if (controller.classes.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No classes assigned to you yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label htmlFor="monthly-report-class-picker" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Class
          </label>
          <Combobox
            id="monthly-report-class-picker"
            value={controller.classId}
            onChange={controller.setClassId}
            items={controller.classes.map((c) => ({ id: c.id, label: c.name }))}
            search={controller.classSearch}
            onSearchChange={controller.setClassSearch}
            isLoading={controller.isClassesLoading}
            isFetchingNextPage={controller.isFetchingMoreClasses}
            hasNextPage={controller.hasMoreClasses}
            onLoadMore={controller.fetchMoreClasses}
            placeholder="Search classes…"
            selectedLabel={controller.classes.find((c) => c.id === controller.classId)?.name ?? null}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="monthly-report-subject" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Subject
          </label>
          <select
            id="monthly-report-subject"
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
          <label htmlFor="monthly-report-book" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Book
          </label>
          <select
            id="monthly-report-book"
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
          <label htmlFor="monthly-report-month" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Month
          </label>
          <input
            id="monthly-report-month"
            type="month"
            value={controller.monthInputValue}
            onChange={(event) => controller.setMonthInput(event.target.value)}
            className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
          />
        </div>
      </div>

      {!controller.bookId ? (
        <p className="text-sm text-ink/50 dark:text-paper/50">Choose a subject and book to see reports.</p>
      ) : (
        <>
          <PillTabs
            tabs={TABS}
            active={controller.activeTab}
            onChange={controller.setActiveTab}
            label={(tab) => TAB_LABEL[tab]}
            className="self-start"
          />

          {controller.activeTab === "class" && (
            <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
              {controller.isClassLoading ? (
                <div className="h-40 w-full animate-pulse rounded-xl bg-ink/5 dark:bg-paper/5" />
              ) : controller.classCumulativeReport ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg text-ink dark:text-paper">Class topic accuracy</h3>
                    <p className="text-sm text-ink/55 dark:text-paper/55">
                      <span className="font-display text-2xl text-ink dark:text-paper">
                        {pct(controller.classCumulativeReport.average_score_percent)}
                      </span>{" "}
                      class average · {controller.classCumulativeReport.students_evaluated} students evaluated
                    </p>
                  </div>
                  {controller.classCumulativeReport.summary && (
                    <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">
                      {controller.classCumulativeReport.summary}
                    </p>
                  )}
                  <div className="mt-4">
                    <NodeAccuracyTable nodes={controller.classCumulativeReport.node_accuracies} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink/50 dark:text-paper/50">
                  No report for this class, book, and month yet.
                </p>
              )}
            </div>
          )}

          {controller.activeTab === "student" && (
            <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
              {controller.isStudentsLoading ? (
                <div className="h-40 w-full animate-pulse rounded-xl bg-ink/5 dark:bg-paper/5" />
              ) : controller.studentCumulativeReports.length === 0 ? (
                <p className="text-sm text-ink/50 dark:text-paper/50">
                  No report for this class, book, and month yet.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
                  {controller.studentCumulativeReports.map((report) => (
                    <StudentCumulativeRow key={report.student_id} report={report} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
