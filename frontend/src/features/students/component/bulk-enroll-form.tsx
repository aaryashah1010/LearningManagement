"use client";

import { AlertIcon, CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useEnrollStudentsForm } from "../hooks/useEnrollStudentsForm";

const inputClass =
  "w-full rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink placeholder:text-ink/35 focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper dark:placeholder:text-paper/35";

export function BulkEnrollForm() {
  const {
    classes,
    isLoadingClasses,
    selectedClassId,
    setClassId,
    rows,
    result,
    error,
    isEnrolling,
    updateRow,
    addRow,
    removeRow,
    handleSubmit,
    startNewBatch,
  } = useEnrollStudentsForm();

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-2xl text-sm text-ink/60 dark:text-paper/60">
        Bulk-add a class roster. Matching an existing student by email or phone enrolls
        them into this class without touching their password or date of birth.
      </p>

      {!result && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <label htmlFor="class-select" className="flex items-baseline gap-2">
              <span className="font-utility text-[11px] font-medium text-mark">Q1</span>
              <span className="text-sm font-medium text-ink/80 dark:text-paper/80">Class</span>
            </label>
            {isLoadingClasses ? (
              <div className="h-8 w-full animate-pulse rounded bg-ink/10 dark:bg-paper/10" />
            ) : classes.length === 0 ? (
              <p className="text-sm text-mark">Create a class first, on the Classes page.</p>
            ) : (
              <select
                id="class-select"
                value={selectedClassId ?? ""}
                onChange={(event) => setClassId(Number(event.target.value))}
                className={inputClass}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="flex items-baseline gap-2">
              <span className="font-utility text-[11px] font-medium text-mark">Q2</span>
              <span className="text-sm font-medium text-ink/80 dark:text-paper/80">
                Students to enroll
              </span>
            </p>

            <div className="hidden gap-3 px-1 font-utility text-[11px] uppercase tracking-wide text-ink/40 sm:grid sm:grid-cols-[1fr_150px_1fr_32px] dark:text-paper/40">
              <span>Name</span>
              <span>Date of birth</span>
              <span>Email or phone</span>
              <span />
            </div>

            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-ink/10 p-3 sm:grid-cols-[1fr_150px_1fr_32px] sm:items-center dark:border-paper/10"
                >
                  <input
                    className={inputClass}
                    placeholder="Full name"
                    required
                    value={row.name}
                    onChange={(event) => updateRow(row.id, "name", event.target.value)}
                  />
                  <input
                    type="date"
                    className={inputClass}
                    required
                    value={row.dateOfBirth}
                    onChange={(event) => updateRow(row.id, "dateOfBirth", event.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="Email or phone"
                    required
                    value={row.contact}
                    onChange={(event) => updateRow(row.id, "contact", event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    aria-label="Remove row"
                    className="flex h-8 w-8 items-center justify-center justify-self-start rounded-lg text-ink/40 transition-colors hover:bg-mark/10 hover:text-mark disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent sm:justify-self-center dark:text-paper/40"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button type="button" variant="ghost" onClick={addRow} className="self-start">
              <PlusIcon className="h-4 w-4" />
              Add row
            </Button>
          </div>

          {error && <p className="text-sm font-medium text-mark">{error}</p>}

          <Button type="submit" className="self-start" disabled={!selectedClassId || isEnrolling}>
            {isEnrolling ? "Enrolling…" : `Enroll ${rows.length} ${rows.length === 1 ? "student" : "students"}`}
          </Button>
        </form>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <p className="font-display text-lg text-ink dark:text-paper">
            {result.created.length} of {result.created.length + result.failed.length} enrolled
            {selectedClass ? ` into ${selectedClass.name}` : ""}
          </p>

          <ul className="flex flex-col gap-2.5">
            {result.created.map((student) => (
              <li key={`created-${student.id}`} className="flex items-center gap-3 text-sm">
                <CheckIcon className="h-4 w-4 shrink-0 text-chart-green" />
                <span className="font-medium text-ink dark:text-paper">{student.name}</span>
              </li>
            ))}
            {result.failed.map((row, i) => (
              <li key={`failed-${i}`} className="flex items-center gap-3 text-sm">
                <AlertIcon className="h-4 w-4 shrink-0 text-mark" />
                <span className="font-medium text-ink dark:text-paper">{row.name}</span>
                <span className="text-mark">{row.message}</span>
              </li>
            ))}
          </ul>

          <p className="font-utility text-[11px] leading-relaxed text-ink/50 dark:text-paper/50">
            Each new student&rsquo;s default password is their date of birth (DDMMYYYY) —
            they&rsquo;ll be asked to change it after first login.
          </p>

          <Button variant="ghost" onClick={startNewBatch} className="self-start">
            Enroll another batch
          </Button>
        </div>
      )}
    </div>
  );
}
