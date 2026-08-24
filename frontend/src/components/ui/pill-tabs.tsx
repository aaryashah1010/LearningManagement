interface PillTabsProps<T extends string> {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  label: (tab: T) => string;
  className?: string;
}

export function PillTabs<T extends string>({ tabs, active, onChange, label, className }: PillTabsProps<T>) {
  return (
    <div className={`flex gap-1 rounded-full border border-ink/10 p-1 dark:border-paper/10 ${className ?? ""}`}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            active === tab
              ? "bg-correct/15 text-ink dark:text-paper"
              : "text-ink/55 hover:bg-ink/5 dark:text-paper/55 dark:hover:bg-paper/10"
          }`}
        >
          {label(tab)}
        </button>
      ))}
    </div>
  );
}
