interface ClassRosterRow {
  name: string;
  teacher: string | null;
  enrolled: number;
  capacity: number;
}

export function ClassRosterChart({
  title,
  rows,
}: {
  title: string;
  rows: ClassRosterRow[];
}) {
  const maxCapacity = Math.max(...rows.map((row) => row.capacity));

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg text-ink dark:text-paper">{title}</h3>
        <p className="font-body text-sm text-ink/50 dark:text-paper/50">
          Enrolled / capacity
        </p>
      </div>

      <ul className="mt-5 flex flex-col gap-4">
        {rows.map((row) => (
          <li
            key={row.name}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex min-w-0 flex-col sm:w-44 sm:shrink-0">
              <span className="truncate text-sm font-medium text-ink dark:text-paper">
                {row.name}
              </span>
              <span
                className={`text-xs ${
                  row.teacher
                    ? "text-ink/50 dark:text-paper/50"
                    : "font-medium text-mark"
                }`}
              >
                {row.teacher ?? "Unassigned"}
              </span>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-[3px]" aria-hidden>
              {Array.from({ length: maxCapacity }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    i < row.enrolled
                      ? "bg-chart-green"
                      : i < row.capacity
                        ? "border border-ink/25 dark:border-paper/25"
                        : "opacity-0"
                  }`}
                />
              ))}
            </div>

            <span className="font-utility text-xs text-ink/55 dark:text-paper/55 sm:ml-auto">
              {row.enrolled}/{row.capacity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
