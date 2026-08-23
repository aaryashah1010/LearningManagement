"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { useClassEnrollments } from "@/features/classes/hooks";
import { useTest } from "@/features/tests/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RequestError } from "@/lib/api";
import { useAssignSubmissionStudent, useSubmissionDetail, useUpdateSubmissionAnswer } from "../hooks";

const OPTIONS = ["A", "B", "C", "D"];

function StudentMatchPanel({ submissionId, testId }: { submissionId: number; testId: number }) {
  const { submission } = useSubmissionDetail(submissionId);
  const { test } = useTest(testId);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const { students, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useClassEnrollments(
    test?.class_id ?? 0,
    search
  );
  const { assignStudent, isAssigning } = useAssignSubmissionStudent(submissionId);

  const [picked, setPicked] = useState<{ id: number; label: string } | null>(null);
  const [name, setName] = useState(submission?.raw_extracted_name ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!submission) return null;

  async function handleAssign() {
    setError(null);
    if (!picked) return;
    try {
      await assignStudent({ studentId: picked.id, rawExtractedName: name.trim() || undefined });
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not update the student match.");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
        Student match
      </p>

      <div>
        <p className="text-sm text-ink/55 dark:text-paper/55">Extracted name (OCR)</p>
        <p className="font-medium text-ink dark:text-paper">{submission.raw_extracted_name ?? "—"}</p>
      </div>

      <div>
        <p className="text-sm text-ink/55 dark:text-paper/55">Match status</p>
        <p className={`font-medium ${submission.student_id ? "text-ink dark:text-paper" : "text-mark"}`}>
          {submission.student_id ? "Matched" : "No match"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink/80 dark:text-paper/80">Correct student</label>
        <Combobox
          value={picked?.id ?? null}
          onChange={(id) => {
            const item = students.find((s) => s.id === id);
            if (item) setPicked({ id: item.id, label: item.name });
          }}
          items={students.map((s) => ({ id: s.id, label: s.name, sublabel: s.email ?? s.phone ?? undefined }))}
          search={searchInput}
          onSearchChange={setSearchInput}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onLoadMore={fetchNextPage}
          placeholder="Search students…"
          selectedLabel={picked?.label ?? null}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink/80 dark:text-paper/80">Corrected name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Fix misread handwriting"
          className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 font-utility text-[11px] text-mark">
          <AlertIcon className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <Button type="button" className="self-start" onClick={handleAssign} disabled={!picked || isAssigning}>
        {isAssigning ? "Saving…" : "Confirm match"}
      </Button>
    </div>
  );
}

function AnswersPanel({ submissionId }: { submissionId: number }) {
  const { submission } = useSubmissionDetail(submissionId);
  const { updateAnswer, isUpdating } = useUpdateSubmissionAnswer(submissionId);
  const [error, setError] = useState<string | null>(null);

  if (!submission) return null;

  async function handleChange(questionId: number, value: string) {
    setError(null);
    try {
      await updateAnswer({ questionId, selectedOption: value || null });
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not update the answer.");
    }
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
        Answers
      </p>

      {error && (
        <p className="mt-2 flex items-center gap-2 font-utility text-[11px] text-mark">
          <AlertIcon className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <ul className="mt-4 flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
        {submission.answers
          .sort((a, b) => (a.question_number ?? 0) - (b.question_number ?? 0))
          .map((answer) => (
            <li key={answer.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink dark:text-paper">Q{answer.question_number}</p>
                <p className="font-utility text-[11px] text-ink/45 dark:text-paper/45">
                  Correct: {answer.correct_option ?? "—"}
                  {answer.needs_review && <span className="ml-2 text-mark">Flagged</span>}
                </p>
              </div>
              <select
                value={answer.extracted_answer ?? ""}
                onChange={(e) => handleChange(answer.question_id, e.target.value)}
                disabled={isUpdating}
                className={`rounded-lg border-b-2 bg-transparent px-1 pb-1 text-sm focus:outline-none ${
                  answer.needs_review
                    ? "border-mark text-mark"
                    : "border-ink/15 text-ink focus:border-correct dark:border-paper/20 dark:text-paper"
                }`}
              >
                <option value="">Blank</option>
                {OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </li>
          ))}
      </ul>
    </div>
  );
}

export function SubmissionDetailView({ submissionId }: { submissionId: number }) {
  const { submission, isLoading, error } = useSubmissionDetail(submissionId);

  if (error) {
    return <p className="text-sm text-mark">{error.message}</p>;
  }

  if (isLoading || !submission) {
    return <div className="h-8 w-64 animate-pulse rounded bg-ink/10 dark:bg-paper/10" />;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/teacher/submissions"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
      >
        <span aria-hidden>←</span> Submissions queue
      </Link>

      <div className="flex items-center gap-2">
        <h2 className="font-display text-3xl text-ink dark:text-paper">
          {submission.raw_extracted_name ?? "Unreadable name"}
        </h2>
        {submission.status === "processed" && <CheckIcon className="h-5 w-5 text-chart-green" />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-2xl border border-ink/10 dark:border-paper/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={submission.image_url} alt="Scanned answer sheet" className="w-full" />
          </div>
          <StudentMatchPanel submissionId={submissionId} testId={submission.test_id} />
        </div>

        <AnswersPanel submissionId={submissionId} />
      </div>
    </div>
  );
}
