"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { FormField } from "@/components/ui/form-field";
import { useClasses } from "@/features/classes/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTestsForClass } from "../hooks";
import { useCreateTestForm } from "../hooks/useCreateTestForm";
import type { TestSetupPath } from "../types";

const SETUP_PATH_OPTIONS: { value: TestSetupPath; label: string }[] = [
  { value: "uploaded_pdf", label: "Upload PDF" },
  { value: "in_app", label: "Build in-app" },
];

function TestRowSkeleton() {
  return <div className="h-10 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
}

export function TestsList() {
  const [classSearchInput, setClassSearchInput] = useState("");
  const classSearch = useDebouncedValue(classSearchInput);
  const {
    classes,
    isLoading: isClassesLoading,
    isFetchingNextPage: isFetchingMoreClasses,
    hasNextPage: hasMoreClasses,
    fetchNextPage: fetchMoreClasses,
  } = useClasses(classSearch);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const classId = selectedClassId ?? classes.at(0)?.id ?? null;
  const selectedClassName = classes.find((c) => c.id === classId)?.name ?? null;
  const { tests, isLoading: isTestsLoading } = useTestsForClass(classId);
  const form = useCreateTestForm(classId);

  if (isClassesLoading) {
    return <div className="h-10 w-64 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
  }

  if (classes.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No classes assigned to you yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:max-w-sm">
          <label htmlFor="test-class-picker" className="text-sm font-medium text-ink/80 dark:text-paper/80">
            Class
          </label>
          <Combobox
            id="test-class-picker"
            value={classId}
            onChange={setSelectedClassId}
            items={classes.map((c) => ({ id: c.id, label: c.name }))}
            search={classSearchInput}
            onSearchChange={setClassSearchInput}
            isLoading={isClassesLoading}
            isFetchingNextPage={isFetchingMoreClasses}
            hasNextPage={hasMoreClasses}
            onLoadMore={fetchMoreClasses}
            placeholder="Search classes…"
            selectedLabel={selectedClassName}
          />
        </div>
        <Button onClick={() => form.setShowForm(!form.showForm)} className="shrink-0">
          <PlusIcon className={`h-4 w-4 transition-transform duration-200 ${form.showForm ? "rotate-45" : ""}`} />
          {form.showForm ? "Cancel" : "Create test"}
        </Button>
      </div>

      {form.justCreated && !form.showForm && (
        <div className="flex items-center gap-3 rounded-xl border border-chart-green/30 bg-chart-green/[0.06] px-4 py-3 text-sm text-ink dark:text-paper">
          <CheckIcon className="h-4 w-4 shrink-0 text-chart-green" />
          <span>
            Test created as a draft —{" "}
            <Link href={`/teacher/tests/${form.justCreated}`} className="font-semibold underline">
              set up its questions next
            </Link>
            .
          </span>
        </div>
      )}

      {form.showForm && (
        <form
          onSubmit={form.handleSubmit}
          className="flex max-w-lg flex-col gap-6 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/80 dark:text-paper/80">Subject</label>
            <select
              value={form.subjectId ?? ""}
              onChange={(event) => form.setSubjectId(Number(event.target.value) || null)}
              className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
            >
              <option value="">Choose a subject…</option>
              {form.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink/80 dark:text-paper/80">Book</label>
            <select
              value={form.bookId ?? ""}
              onChange={(event) => form.setBookId(Number(event.target.value) || null)}
              disabled={!form.subjectId}
              className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none disabled:opacity-50 dark:border-paper/20 dark:text-paper"
            >
              <option value="">Choose a book…</option>
              {form.books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                  {b.grade ? ` · ${b.grade}` : ""}
                </option>
              ))}
            </select>
          </div>

          <FormField
            index={1}
            id="test-title"
            label="Test title"
            required
            value={form.title}
            onChange={(event) => form.setTitle(event.target.value)}
            placeholder="Test 6 — Trigonometry"
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink/80 dark:text-paper/80">Question paper</span>
            <div className="flex gap-2">
              {SETUP_PATH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => form.setSetupPath(option.value)}
                  className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    form.setupPath === option.value
                      ? "border-correct bg-correct/[0.06] text-ink dark:text-paper"
                      : "border-ink/12 text-ink/60 hover:border-ink/25 dark:border-paper/15 dark:text-paper/60"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {form.error && <p className="font-utility text-[11px] text-mark">{form.error}</p>}

          <Button type="submit" className="self-start" disabled={form.isCreating}>
            {form.isCreating ? "Creating…" : "Create draft test"}
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Setup</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isTestsLoading ? (
              <tr>
                <td colSpan={3} className="p-3">
                  <TestRowSkeleton />
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-sm text-ink/50 dark:text-paper/50">
                  No tests yet for this class — create the first one above.
                </td>
              </tr>
            ) : (
              tests.map((test) => (
                <tr key={test.id} className="border-b border-ink/8 last:border-0 dark:border-paper/8">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/teacher/tests/${test.id}`}
                      className="font-medium text-ink hover:text-correct dark:text-paper"
                    >
                      {test.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60">
                    {test.setup_path === "uploaded_pdf" ? "Uploaded PDF" : "Built in-app"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`font-utility text-[11px] font-medium uppercase tracking-wide ${
                        test.published_at ? "text-chart-green" : "text-chart-amber"
                      }`}
                    >
                      {test.published_at ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
