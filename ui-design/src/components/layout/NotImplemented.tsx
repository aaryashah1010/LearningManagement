export function NotImplemented({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink/15 text-center dark:border-paper/15">
      <span className="h-10 w-10 rounded-full border-2 border-ink/20 dark:border-paper/25" />
      <div>
        <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
          Not implemented yet
        </p>
        <h2 className="mt-2 font-display text-2xl text-ink dark:text-paper">
          {label}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-ink/55 dark:text-paper/55">
          This section is next in the build queue — not on screen yet.
        </p>
      </div>
    </div>
  );
}
