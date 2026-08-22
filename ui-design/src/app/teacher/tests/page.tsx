"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckIcon, PlusIcon, SubmissionsIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { classesForTeacher, CURRENT_TEACHER_ID, testsForTeacher } from "@/lib/mock-data";

type SetupPath = "in_app" | "uploaded_pdf";
type UploadStatus = "uploading" | "done";

export default function TeacherTestsPage() {
  const myClasses = classesForTeacher(CURRENT_TEACHER_ID);
  const tests = testsForTeacher(CURRENT_TEACHER_ID);
  const [showForm, setShowForm] = useState(false);
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [setupPath, setSetupPath] = useState<SetupPath>("uploaded_pdf");
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJustCreated(title);
    setTitle("");
    setShowForm(false);
  }

  function handleUploadSheets(testId: string) {
    setUploadStatus((prev) => ({ ...prev, [testId]: "uploading" }));
    setTimeout(() => {
      setUploadStatus((prev) => ({ ...prev, [testId]: "done" }));
    }, 900);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
          A test starts as a draft — question extraction and curriculum mapping
          happen before you publish it.
        </p>
        <Button onClick={() => setShowForm((v) => !v)} className="shrink-0">
          <PlusIcon
            className={`h-4 w-4 transition-transform duration-200 ${showForm ? "rotate-45" : ""}`}
          />
          {showForm ? "Cancel" : "Create test"}
        </Button>
      </div>

      {justCreated && (
        <div className="flex items-center gap-3 rounded-xl border border-chart-green/30 bg-chart-green/[0.06] px-4 py-3 text-sm text-ink dark:text-paper">
          <CheckIcon className="h-4 w-4 shrink-0 text-chart-green" />
          <span>
            <strong className="font-semibold">{justCreated}</strong> created as a
            draft — upload its question paper next.
          </span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-lg flex-col gap-6 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="test-class" className="flex items-baseline gap-2">
              <span className="font-utility text-[11px] font-medium text-mark">Q1</span>
              <span className="text-sm font-medium text-ink/80 dark:text-paper/80">Class</span>
            </label>
            <select
              id="test-class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
            >
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <FormField
            index={2}
            id="test-title"
            label="Test title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Test 6 — Trigonometry"
          />

          <div className="flex flex-col gap-2">
            <label className="flex items-baseline gap-2">
              <span className="font-utility text-[11px] font-medium text-mark">Q3</span>
              <span className="text-sm font-medium text-ink/80 dark:text-paper/80">
                Question paper
              </span>
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "uploaded_pdf", label: "Upload PDF" },
                  { value: "in_app", label: "Build in-app" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSetupPath(option.value)}
                  className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
                    setupPath === option.value
                      ? "border-correct bg-correct/[0.06] text-ink dark:text-paper"
                      : "border-ink/12 text-ink/60 hover:border-ink/25 dark:border-paper/15 dark:text-paper/60"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="self-start">
            Create draft test
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
              <th className="px-5 py-3 font-medium">Title</th>
              <th className="px-5 py-3 font-medium">Class</th>
              <th className="px-5 py-3 font-medium">Questions</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">OMR sheets</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => {
              const cls = myClasses.find((c) => c.id === test.classId);
              const status = uploadStatus[test.id];
              return (
                <tr key={test.id} className="border-b border-ink/8 last:border-0 dark:border-paper/8">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/teacher/tests/${test.id}`}
                      className="font-medium text-ink hover:text-correct dark:text-paper"
                    >
                      {test.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60">{cls?.name}</td>
                  <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60">
                    {test.questionCount || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`font-utility text-[11px] font-medium uppercase tracking-wide ${
                        test.status === "published" ? "text-chart-green" : "text-chart-amber"
                      }`}
                    >
                      {test.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {test.status !== "published" ? (
                      <span className="font-utility text-xs text-ink/35 dark:text-paper/35">
                        Publish first
                      </span>
                    ) : status === "done" ? (
                      <span className="inline-flex items-center gap-1.5 font-utility text-[11px] font-medium uppercase tracking-wide text-chart-green">
                        <CheckIcon className="h-3.5 w-3.5" /> Uploaded
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUploadSheets(test.id)}
                        disabled={status === "uploading"}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-paper/20 dark:text-paper/70 dark:hover:bg-paper/10"
                      >
                        <SubmissionsIcon className="h-3.5 w-3.5" />
                        {status === "uploading" ? "Uploading…" : "Upload sheets"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
