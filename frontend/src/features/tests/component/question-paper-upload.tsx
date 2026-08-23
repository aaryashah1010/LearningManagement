"use client";

import { useRef, useState } from "react";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RequestError } from "@/lib/api";
import { useUploadQuestionPaper } from "../hooks";

export function QuestionPaperUpload({ testId }: { testId: number }) {
  const { uploadQuestionPaper, isUploading } = useUploadQuestionPaper(testId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; unparsed: number[] } | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const uploaded = await uploadQuestionPaper(file);
      setResult({ created: uploaded.questions.length, unparsed: uploaded.unparsed_question_numbers });
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not process the question paper.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
        Question paper
      </p>
      <p className="text-sm text-ink/60 dark:text-paper/60">
        Upload the question paper PDF — the answer key is extracted automatically.
      </p>

      <input ref={inputRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
      <Button
        type="button"
        variant="ghost"
        className="self-start"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? "Processing…" : "Upload PDF"}
      </Button>

      {error && (
        <p className="flex items-center gap-2 font-utility text-[11px] text-mark">
          <AlertIcon className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      {result && (
        <div className="flex items-start gap-2 rounded-xl border border-chart-green/30 bg-chart-green/[0.06] px-3 py-2 text-sm text-ink dark:text-paper">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-chart-green" />
          <span>
            {result.created} question{result.created === 1 ? "" : "s"} extracted.
            {result.unparsed.length > 0 && (
              <>
                {" "}
                Question{result.unparsed.length === 1 ? "" : "s"} {result.unparsed.join(", ")} need manual
                entry.
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
