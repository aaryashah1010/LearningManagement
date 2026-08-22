"use client";

import { useState, type FormEvent } from "react";
import { AlertIcon, CheckIcon, ImportIcon, PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { MOCK_CLASSES } from "@/lib/mock-data";

interface DraftRow {
  id: string;
  name: string;
  dateOfBirth: string;
  contact: string;
}

interface RowResult {
  id: string;
  status: "created" | "failed";
  reason?: string;
}

function emptyRow(): DraftRow {
  return { id: crypto.randomUUID(), name: "", dateOfBirth: "", contact: "" };
}

const inputClass =
  "w-full rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink placeholder:text-ink/35 focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper dark:placeholder:text-paper/35";

export default function AdminStudentsPage() {
  const [classId, setClassId] = useState(MOCK_CLASSES[0].id);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [results, setResults] = useState<RowResult[] | null>(null);

  const selectedClass = MOCK_CLASSES.find((c) => c.id === classId);

  function updateRow(id: string, field: keyof Omit<DraftRow, "id">, value: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seenContacts = new Set<string>();
    const nextResults: RowResult[] = rows.map((row) => {
      const contact = row.contact.trim().toLowerCase();
      if (contact && seenContacts.has(contact)) {
        return {
          id: row.id,
          status: "failed",
          reason: "Email or phone already used earlier in this batch",
        };
      }
      if (contact) seenContacts.add(contact);
      return { id: row.id, status: "created" };
    });
    setResults(nextResults);
  }

  function startNewBatch() {
    setRows([emptyRow()]);
    setResults(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-ink/60 dark:text-paper/60">
          Bulk-add a class roster. Matching an existing student by email or
          phone enrolls them into this class without touching their password
          or date of birth.
        </p>
        <Button variant="ghost" className="shrink-0">
          <ImportIcon className="h-4 w-4" />
          Import Excel
        </Button>
      </div>

      {!results && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <label htmlFor="class-select" className="flex items-baseline gap-2">
              <span className="font-utility text-[11px] font-medium text-mark">Q1</span>
              <span className="text-sm font-medium text-ink/80 dark:text-paper/80">
                Class
              </span>
            </label>
            <select
              id="class-select"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className={inputClass}
            >
              {MOCK_CLASSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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

          <Button type="submit" className="self-start">
            Enroll {rows.length} {rows.length === 1 ? "student" : "students"}
          </Button>
        </form>
      )}

      {results && selectedClass && (
        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <p className="font-display text-lg text-ink dark:text-paper">
            {results.filter((r) => r.status === "created").length} of {results.length}{" "}
            enrolled into {selectedClass.name}
          </p>

          <ul className="flex flex-col gap-2.5">
            {results.map((result, i) => (
              <li key={result.id} className="flex items-center gap-3 text-sm">
                {result.status === "created" ? (
                  <CheckIcon className="h-4 w-4 shrink-0 text-chart-green" />
                ) : (
                  <AlertIcon className="h-4 w-4 shrink-0 text-mark" />
                )}
                <span className="font-medium text-ink dark:text-paper">
                  {rows[i].name || "(unnamed)"}
                </span>
                {result.status === "failed" && (
                  <span className="text-mark">{result.reason}</span>
                )}
              </li>
            ))}
          </ul>

          <p className="font-utility text-[11px] leading-relaxed text-ink/50 dark:text-paper/50">
            Each new student&rsquo;s default password is their date of birth
            (DDMMYYYY) — they&rsquo;ll be asked to change it after first login.
          </p>

          <Button variant="ghost" onClick={startNewBatch} className="self-start">
            Enroll another batch
          </Button>
        </div>
      )}
    </div>
  );
}
