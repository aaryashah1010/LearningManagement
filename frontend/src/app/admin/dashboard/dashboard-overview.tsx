"use client";

import Link from "next/link";
import { AlertIcon, CheckIcon, ClassesIcon, StudentsIcon, TeachersIcon } from "@/components/icons";
import { StatTile } from "@/components/molecules/stat-tile";
import { ClassRosterChart } from "@/features/stats/component/class-roster-chart";
import { TrendChart } from "@/features/stats/component/trend-chart";
import { useAdminStats } from "@/features/stats/hooks";

const QUICK_LINKS = [
  { href: "/admin/classes", label: "Create a class", icon: ClassesIcon },
  { href: "/admin/teachers", label: "Add a teacher", icon: TeachersIcon },
  { href: "/admin/students", label: "Enroll students", icon: StudentsIcon },
];

export function DashboardOverview() {
  const { stats, isLoading } = useAdminStats();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Teachers"
          value={isLoading ? "—" : String(stats?.teachers_count ?? 0)}
          icon={<TeachersIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Students"
          value={isLoading ? "—" : String(stats?.students_count ?? 0)}
          icon={<StudentsIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Classes"
          value={isLoading ? "—" : String(stats?.classes_count ?? 0)}
          icon={<ClassesIcon className="h-4 w-4" />}
        />
        <StatTile
          label="Needs attention"
          value={isLoading ? "—" : String(stats?.unassigned_classes_count ?? 0)}
          delta={
            !isLoading
              ? {
                  text:
                    (stats?.unassigned_classes_count ?? 0) > 0
                      ? "Class without a teacher"
                      : "Every class is staffed",
                  direction: (stats?.unassigned_classes_count ?? 0) > 0 ? "down" : "flat",
                }
              : undefined
          }
          status={!isLoading && (stats?.unassigned_classes_count ?? 0) > 0 ? "attention" : "good"}
          icon={
            !isLoading && (stats?.unassigned_classes_count ?? 0) > 0 ? (
              <AlertIcon className="h-4 w-4" />
            ) : (
              <CheckIcon className="h-4 w-4" />
            )
          }
        />
      </div>

      {!isLoading && stats && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
          <TrendChart
            title="Enrollment growth"
            periodLabel="Last 6 months"
            unitLabel="students"
            data={stats.enrollment_trend.map((p) => ({ label: p.label, value: p.count }))}
          />
          <ClassRosterChart title="Class roster" rows={stats.class_roster} />
        </div>
      )}

      <div>
        <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
          Quick actions
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-paper p-5 transition-colors hover:border-correct/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:border-paper/10 dark:bg-slate dark:focus-visible:ring-offset-slate"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-correct/15 text-correct">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="font-medium text-ink dark:text-paper">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
