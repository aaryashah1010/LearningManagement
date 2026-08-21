"use client";

import Link from "next/link";
import { ClassesIcon, StudentsIcon, TeachersIcon } from "@/components/icons";
import { StatTile } from "@/components/molecules/stat-tile";
import { useClasses } from "@/features/classes/hooks";

const QUICK_LINKS = [
  { href: "/admin/classes", label: "Create a class", icon: ClassesIcon },
  { href: "/admin/teachers", label: "Add a teacher", icon: TeachersIcon },
  { href: "/admin/students", label: "Enroll students", icon: StudentsIcon },
];

export function DashboardOverview() {
  const { classes, hasMore, isLoading } = useClasses();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Classes"
          value={isLoading ? "—" : `${classes.length}${hasMore ? "+" : ""}`}
          icon={<ClassesIcon className="h-4 w-4" />}
        />
      </div>

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

      <p className="max-w-xl text-sm text-ink/45 dark:text-paper/45">
        Teacher and student totals aren&rsquo;t shown yet — the backend doesn&rsquo;t expose
        an aggregate stats endpoint.
      </p>
    </div>
  );
}
