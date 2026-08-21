"use client";

import Link from "next/link";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { formatDate } from "@/lib/format-date";
import { useClasses } from "../hooks";
import { useCreateClassForm } from "../hooks/useCreateClassForm";

function ClassCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 p-5 dark:border-paper/10">
      <div className="h-5 w-2/3 animate-pulse rounded bg-ink/10 dark:bg-paper/10" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-ink/10 dark:bg-paper/10" />
    </div>
  );
}

interface ClassesGridProps {
  // Only admins can create classes (POST /api/classes/ is admin-only) — the
  // teacher view of this same grid hides the form instead of showing a
  // control that would just 403.
  canCreate?: boolean;
  basePath: string;
}

export function ClassesGrid({ canCreate = true, basePath }: ClassesGridProps) {
  const { classes, hasMore, isLoading } = useClasses();
  const { name, setName, showForm, setShowForm, error, justCreated, isCreating, handleSubmit } =
    useCreateClassForm();

  return (
    <div className="flex flex-col gap-8">
      {canCreate && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
            Create a class, then manage its roster from its detail page.
          </p>
          <Button onClick={() => setShowForm(!showForm)} className="shrink-0">
            <PlusIcon className={`h-4 w-4 transition-transform duration-200 ${showForm ? "rotate-45" : ""}`} />
            {showForm ? "Cancel" : "Create class"}
          </Button>
        </div>
      )}

      {canCreate && justCreated && !showForm && (
        <div className="flex items-center gap-3 rounded-xl border border-chart-green/30 bg-chart-green/[0.06] px-4 py-3 text-sm text-ink dark:text-paper">
          <CheckIcon className="h-4 w-4 shrink-0 text-chart-green" />
          <span>
            <strong className="font-semibold">{justCreated}</strong> created — it has no students yet.
          </span>
        </div>
      )}

      {canCreate && showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-lg flex-col gap-6 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate"
        >
          <FormField
            index={1}
            id="class-name"
            label="Class name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Class 10 · Mathematics"
            error={error ?? undefined}
          />
          <Button type="submit" className="self-start" disabled={isCreating}>
            {isCreating ? "Creating…" : "Create class"}
          </Button>
        </form>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ClassCardSkeleton key={i} />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="text-sm text-ink/50 dark:text-paper/50">
          {canCreate ? "No classes yet — create the first one above." : "No classes assigned to you yet."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map((c) => (
              <Link
                key={c.id}
                href={`${basePath}/${c.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-paper p-5 transition-colors hover:border-correct/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:border-paper/10 dark:bg-slate dark:focus-visible:ring-offset-slate"
              >
                <p className="font-display text-lg text-ink dark:text-paper">{c.name}</p>
                <p className="font-utility text-xs text-ink/45 dark:text-paper/45">
                  Created {formatDate(c.created_at)}
                </p>
              </Link>
            ))}
          </div>
          {hasMore && (
            <p className="font-utility text-xs text-ink/40 dark:text-paper/40">
              Showing the first 100 classes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
