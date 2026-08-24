"use client";

import { useState } from "react";
import { AlertIcon, ChevronIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useReportsPageController, type ReportTab } from "../hooks/useReportsPageController";
import type { StudentReport } from "../types";
import { NodeAccuracyTable, pct } from "./node-accuracy-table";

const TABS: ReportTab[] = ["class", "student"];
const TAB_LABEL: Record<ReportTab, string> = { class: "Class", student: "Student" };

function StudentReportRow({ report }: { report: StudentReport }) {
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
            {pct(report.score_percent)} ({report.score_correct}/{report.score_total})
          </span>
          <ChevronIcon className={`h-4 w-4 text-ink/40 transition-transform dark:text-paper/40 ${expanded ? "-rotate-90" : "rotate-180"}`} />
        </span>
      </button>

      {expanded && (
        <div className="mt-3 rounded-xl bg-ink/[0.02] p-4 dark:bg-paper/[0.03]">
          {report.weak_nodes.length === 0 ? (
            <p className="text-sm text-ink/50 dark:text-paper/50">No weak topics.</p>
          ) : (
            <NodeAccuracyTable nodes={report.weak_nodes} />
          )}
        </div>
      )}
    </li>
  );
}

export function ReportsView() {
  const controller = useReportsPageController();
  const { activeTab, setActiveTab } = controller;

  if (controller.isClassesLoading) {
    return <div className="h-10 w-64 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
  }

  if (controller.classes.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No classes assigned to you yet.</p>;
  }

  const classReport = controller.classReport;
  const studentReports = controller.studentReports;
  const { isClassReportLoading, isStudentReportsLoading } = controller;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label htmlFor="report-class-picker" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Class
          </label>
          <Combobox
            id="report-class-picker"
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

        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label htmlFor="report-test-picker" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Test
          </label>
          <select
            id="report-test-picker"
            value={controller.testId ?? ""}
            onChange={(event) => controller.setTestId(Number(event.target.value))}
            disabled={controller.publishedTests.length === 0}
            className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none disabled:opacity-50 dark:border-paper/20 dark:text-paper"
          >
            {controller.publishedTests.length === 0 && <option value="">No published tests</option>}
            {controller.publishedTests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          onClick={controller.handleGenerate}
          disabled={!controller.testId || controller.isGenerating}
          className="shrink-0"
        >
          {controller.isGenerating ? "Generating…" : "Generate report"}
        </Button>
      </div>

      {controller.error && (
        <p className="flex items-center gap-2 font-utility text-[11px] text-mark">
          <AlertIcon className="h-3.5 w-3.5" /> {controller.error}
        </p>
      )}

      <PillTabs tabs={TABS} active={activeTab} onChange={setActiveTab} label={(tab) => TAB_LABEL[tab]} className="self-start" />

      {activeTab === "class" && isClassReportLoading && (
        <div className="h-40 w-full animate-pulse rounded-2xl bg-ink/5 dark:bg-paper/5" />
      )}

      {activeTab === "class" && !isClassReportLoading && classReport && (
        <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-lg text-ink dark:text-paper">Topic accuracy</h3>
            <p className="text-sm text-ink/55 dark:text-paper/55">
              <span className="font-display text-2xl text-ink dark:text-paper">
                {pct(classReport.average_score_percent)}
              </span>{" "}
              class average · {classReport.students_evaluated} students evaluated
            </p>
          </div>
          {classReport.summary && (
            <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">{classReport.summary}</p>
          )}
          <div className="mt-4">
            <NodeAccuracyTable nodes={classReport.node_accuracies} />
          </div>
        </div>
      )}

      {activeTab === "class" && !isClassReportLoading && !classReport && (
        <p className="text-sm text-ink/50 dark:text-paper/50">No report generated for this test yet.</p>
      )}

      {activeTab === "student" && isStudentReportsLoading && (
        <div className="h-24 w-full animate-pulse rounded-2xl bg-ink/5 dark:bg-paper/5" />
      )}

      {activeTab === "student" && !isStudentReportsLoading && studentReports.length > 0 && (
        <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <h3 className="font-display text-lg text-ink dark:text-paper">Students</h3>
          <ul className="mt-2 flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
            {studentReports.map((report) => (
              <StudentReportRow key={report.student_id} report={report} />
            ))}
          </ul>
        </div>
      )}

      {activeTab === "student" && !isStudentReportsLoading && studentReports.length === 0 && (
        <p className="text-sm text-ink/50 dark:text-paper/50">No report generated for this test yet.</p>
      )}
    </div>
  );
}
