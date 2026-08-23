import type { ClassRosterRow } from "../types";

export function ClassRosterChart({ title, rows }: { title: string; rows: ClassRosterRow[] }) {
  const maxEnrolled = Math.max(...rows.map((row) => row.enrolled_count), 1);

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg text-ink dark:text-paper">{title}</h3>
        <p className="font-body text-sm text-ink/50 dark:text-paper/50">Enrolled students</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-ink/50 dark:text-paper/50">No classes yet.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.class_id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-col sm:w-44 sm:shrink-0">
                <span className="truncate text-sm font-medium text-ink dark:text-paper">{row.name}</span>
                <span
                  className={`truncate text-xs ${
                    row.teacher_names.length > 0 ? "text-ink/50 dark:text-paper/50" : "font-medium text-mark"
                  }`}
                >
                  {row.teacher_names.length > 0 ? row.teacher_names.join(", ") : "Unassigned"}
                </span>
              </div>

              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/8 dark:bg-paper/10" aria-hidden>
                <div
                  className="h-full rounded-full bg-chart-green"
                  style={{ width: `${(row.enrolled_count / maxEnrolled) * 100}%` }}
                />
              </div>

              <span className="font-utility text-xs text-ink/55 dark:text-paper/55 sm:ml-auto">
                {row.enrolled_count} student{row.enrolled_count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
