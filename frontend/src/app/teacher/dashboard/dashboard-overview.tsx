"use client";

import Link from "next/link";
import { ClassesIcon } from "@/components/icons";
import { StatTile } from "@/components/molecules/stat-tile";
import { useClasses } from "@/features/classes/hooks";

export function TeacherDashboardOverview() {
  const { classes, hasMore, isLoading } = useClasses();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="My classes"
          value={isLoading ? "—" : `${classes.length}${hasMore ? "+" : ""}`}
          icon={<ClassesIcon className="h-4 w-4" />}
        />
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

      <p className="max-w-xl text-sm text-ink/45 dark:text-paper/45">
        Test, submission and report totals aren&rsquo;t shown yet — that part of the backend
        hasn&rsquo;t been built.
      </p>
    </div>
  );
}
