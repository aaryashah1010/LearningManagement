"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { BulkUploadPanel } from "@/features/submissions/component/bulk-upload-panel";
import { RequestError } from "@/lib/api";
import { usePublishTest, useQuestions, useTest } from "../hooks";
import { InAppQuestionsForm } from "./in-app-questions-form";
import { QuestionNodeList } from "./question-node-list";
import { QuestionPaperUpload } from "./question-paper-upload";

export function TestDetailView({ testId }: { testId: number }) {
  const { test, isLoading, error } = useTest(testId);
  const { questions } = useQuestions(testId);
  const { publishTest, isPublishing } = usePublishTest(testId);
  const [publishError, setPublishError] = useState<string | null>(null);

  if (error) {
    return <p className="text-sm text-mark">{error.message}</p>;
  }

  if (isLoading || !test) {
    return <div className="h-8 w-64 animate-pulse rounded bg-ink/10 dark:bg-paper/10" />;
  }

  async function handlePublish() {
    setPublishError(null);
    try {
      await publishTest();
    } catch (err) {
      setPublishError(err instanceof RequestError ? err.message : "Could not publish the test.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/teacher/tests"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
      >
        <span aria-hidden>←</span> All tests
      </Link>

      <div>
        <h2 className="font-display text-3xl text-ink dark:text-paper">{test.title}</h2>
        <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
          {test.setup_path === "uploaded_pdf" ? "Uploaded PDF" : "Built in-app"} ·{" "}
          <span className={test.published_at ? "text-chart-green" : "text-chart-amber"}>
            {test.published_at ? "Published" : "Draft"}
          </span>
        </p>
      </div>

      {!test.published_at &&
        (test.setup_path === "uploaded_pdf" ? (
          <QuestionPaperUpload testId={testId} />
        ) : (
          <InAppQuestionsForm testId={testId} />
        ))}

      <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
        <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
          Questions
        </p>
        <div className="mt-4">
          <QuestionNodeList testId={testId} bookId={test.book_id} />
        </div>
      </div>

      {!test.published_at && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="self-start"
            onClick={handlePublish}
            disabled={isPublishing || questions.length === 0}
          >
            {isPublishing ? "Publishing…" : "Publish test"}
          </Button>
          {questions.length === 0 && (
            <p className="font-utility text-[11px] text-ink/45 dark:text-paper/45">
              Add at least one question before publishing.
            </p>
          )}
          {publishError && (
            <p className="flex items-center gap-2 font-utility text-[11px] text-mark">
              <AlertIcon className="h-3.5 w-3.5" /> {publishError}
            </p>
          )}
        </div>
      )}

      {test.published_at && <BulkUploadPanel testId={testId} />}
    </div>
  );
}
