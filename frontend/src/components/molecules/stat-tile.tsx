import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: string;
  helper?: string;
  delta?: { text: string; direction: "up" | "down" | "flat" };
  status?: "good" | "attention";
  icon?: ReactNode;
}

export function StatTile({ label, value, helper, delta, status, icon }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5 dark:border-paper/10 dark:bg-slate">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink/55 dark:text-paper/55">{label}</p>
        {icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              status === "attention"
                ? "bg-mark/15 text-mark"
                : status === "good"
                  ? "bg-chart-green/15 text-chart-green"
                  : "bg-ink/5 text-ink/50 dark:bg-paper/10 dark:text-paper/55"
            }`}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 font-body text-3xl font-semibold text-ink dark:text-paper">{value}</p>

      {delta && (
        <p
          className={`mt-1.5 text-xs font-medium ${
            delta.direction === "up"
              ? "text-chart-green"
              : delta.direction === "down"
                ? "text-mark"
                : "text-ink/45 dark:text-paper/45"
          }`}
        >
          {delta.text}
        </p>
      )}
      {!delta && helper && (
        <p className="mt-1.5 text-xs font-medium text-ink/45 dark:text-paper/45">{helper}</p>
      )}
    </div>
  );
}
