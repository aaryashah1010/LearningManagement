"use client";

import Link from "next/link";
import { ClassesIcon, ReportsIcon, SubmissionsIcon, TestsIcon } from "@/components/icons";
import { StatTile } from "@/components/molecules/stat-tile";
import { useTeacherStats } from "@/features/stats/hooks";

export function TeacherDashboardOverview() {
  const { stats, isLoading } = useTeacherStats();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="My classes"
          value={isLoading ? "—" : String(stats?.classes_count ?? 0)}
          icon={<ClassesIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Published tests"
          value={isLoading ? "—" : String(stats?.published_tests_count ?? 0)}
          icon={<TestsIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Needs review"
          value={isLoading ? "—" : String(stats?.needs_review_submissions_count ?? 0)}
          status={!isLoading && (stats?.needs_review_submissions_count ?? 0) > 0 ? "attention" : "good"}
          delta={
            !isLoading
              ? {
                  text:
                    (stats?.needs_review_submissions_count ?? 0) > 0
                      ? "Submissions awaiting review"
                      : "All caught up",
                  direction: (stats?.needs_review_submissions_count ?? 0) > 0 ? "down" : "flat",
                }
              : undefined
          }
          icon={<SubmissionsIcon className="h-4 w-4" />}
        />
        {!isLoading && stats?.average_accuracy_percent !== null && stats?.average_accuracy_percent !== undefined && (
          <StatTile
            label="Avg accuracy"
            value={`${Math.round(stats.average_accuracy_percent)}%`}
            icon={<ReportsIcon className="h-4 w-4" />}
          />
        )}
      </div>

      <Link
        href="/teacher/classes"
        className="flex w-fit items-center gap-3 rounded-2xl border border-ink/10 bg-paper p-5 transition-colors hover:border-correct/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:border-paper/10 dark:bg-slate dark:focus-visible:ring-offset-slate"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-correct/15 text-correct">
          <ClassesIcon className="h-[18px] w-[18px]" />
        </span>
        <span className="font-medium text-ink dark:text-paper">View your classes</span>
      </Link>
    </div>
  );
}
