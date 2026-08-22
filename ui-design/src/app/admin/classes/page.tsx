"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { MOCK_CLASSES, teacherName } from "@/lib/mock-data";

export default function AdminClassesPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJustCreated(name);
    setName("");
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
          Create a class, then assign a teacher and enroll students from its detail
          page.
        </p>
        <Button onClick={() => setShowForm((v) => !v)} className="shrink-0">
          <PlusIcon
            className={`h-4 w-4 transition-transform duration-200 ${showForm ? "rotate-45" : ""}`}
          />
          {showForm ? "Cancel" : "Create class"}
        </Button>
      </div>

      {justCreated && (
        <div className="flex items-center gap-3 rounded-xl border border-chart-green/30 bg-chart-green/[0.06] px-4 py-3 text-sm text-ink dark:text-paper">
          <CheckIcon className="h-4 w-4 shrink-0 text-chart-green" />
          <span>
            <strong className="font-semibold">{justCreated}</strong> created — it has
            no teacher or students yet.
          </span>
        </div>
      )}

      {showForm && (
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
          />
          <Button type="submit" className="self-start">
            Create class
          </Button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_CLASSES.map((c) => {
          const teacher = teacherName(c.teacherId);
          return (
            <Link
              key={c.id}
              href={`/admin/classes/${c.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-paper p-5 transition-colors hover:border-correct/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:border-paper/10 dark:bg-slate dark:focus-visible:ring-offset-slate"
            >
              <p className="font-display text-lg text-ink dark:text-paper">{c.name}</p>
              <p
                className={`text-sm ${
                  teacher ? "text-ink/55 dark:text-paper/55" : "font-medium text-mark"
                }`}
              >
                {teacher ?? "Unassigned"}
              </p>
              <p className="mt-auto font-utility text-xs text-ink/45 dark:text-paper/45">
                {c.enrolled} students enrolled
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
