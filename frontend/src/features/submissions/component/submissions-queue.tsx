"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { RequestError } from "@/lib/api";
import { STATUS_TABS, useSubmissionsQueueController } from "../hooks/useSubmissionsQueueController";
import type { SubmissionStatus } from "../types";

const STATUS_LABEL: Record<SubmissionStatus | "all", string> = {
  all: "All",
  pending: "Pending review",
  needs_review: "Needs review",
  processed: "Processed",
};

function SubmissionRowSkeleton() {
  return <div className="h-10 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
}

export function SubmissionsQueue({ initialTestId }: { initialTestId: number | null }) {
  const controller = useSubmissionsQueueController(initialTestId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  async function handleSave() {
    setSaveError(null);
    setSaveResult(null);
    try {
      const result = await controller.saveSubmissions();
      setSaveResult(`${result.processed} processed, ${result.needs_review} flagged for review.`);
    } catch (err) {
      setSaveError(err instanceof RequestError ? err.message : "Could not save submissions.");
    }
  }

  if (controller.isClassesLoading) {
    return <div className="h-10 w-64 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
  }

  if (controller.classes.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No classes assigned to you yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2 sm:max-w-xs">
          <label htmlFor="submissions-class-picker" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Class
          </label>
          <Combobox
            id="submissions-class-picker"
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
          <label htmlFor="submissions-test-picker" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Test
          </label>
          <select
            id="submissions-test-picker"
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
      </div>

      {controller.testId && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-1 rounded-full border border-ink/10 p-1 dark:border-paper/10">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => controller.setStatusTab(tab)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    controller.statusTab === tab
                      ? "bg-correct/15 text-ink dark:text-paper"
                      : "text-ink/55 hover:bg-ink/5 dark:text-paper/55 dark:hover:bg-paper/10"
                  }`}
                >
                  {STATUS_LABEL[tab]}
                </button>
              ))}
            </div>

            <Button type="button" variant="ghost" onClick={handleSave} disabled={controller.isSaving}>
              {controller.isSaving ? "Saving…" : "Save batch"}
            </Button>
          </div>

          {saveError && (
            <p className="flex items-center gap-2 font-utility text-[11px] text-mark">
              <AlertIcon className="h-3.5 w-3.5" /> {saveError}
            </p>
          )}
          {saveResult && (
            <p className="flex items-center gap-2 font-utility text-[11px] text-chart-green">
              <CheckIcon className="h-3.5 w-3.5" /> {saveResult}
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
                  <th className="px-5 py-3 font-medium">Extracted name</th>
                  <th className="px-5 py-3 font-medium">Match</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {controller.isSubmissionsLoading ? (
                  <tr>
                    <td colSpan={3} className="p-3">
                      <SubmissionRowSkeleton />
                    </td>
                  </tr>
                ) : controller.submissions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-sm text-ink/50 dark:text-paper/50">
                      Nothing here.
                    </td>
                  </tr>
                ) : (
                  controller.submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-ink/8 last:border-0 dark:border-paper/8">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/teacher/submissions/${submission.id}`}
                          className="font-medium text-ink hover:text-correct dark:text-paper"
                        >
                          {submission.raw_extracted_name ?? "Unreadable name"}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60">
                        {submission.student_id ? "Matched" : "Unmatched"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-utility text-[11px] font-medium uppercase tracking-wide ${
                            submission.status === "processed"
                              ? "text-chart-green"
                              : submission.status === "needs_review"
                                ? "text-mark"
                                : "text-chart-amber"
                          }`}
                        >
                          {submission.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
