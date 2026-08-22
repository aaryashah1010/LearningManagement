"use client";

import { Button } from "@/components/ui/button";
import { useInAppQuestionsForm } from "../hooks/useInAppQuestionsForm";

const OPTION_FIELDS = ["option_a", "option_b", "option_c", "option_d"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"];

export function InAppQuestionsForm({ testId }: { testId: number }) {
  const { rows, updateRow, addRow, removeRow, error, isCreating, handleSubmit } = useInAppQuestionsForm(testId);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
        Add questions
      </p>

      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-xl border border-ink/10 p-4 dark:border-paper/10">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={row.question_number}
                onChange={(e) => updateRow(index, "question_number", Number(e.target.value))}
                className="w-16 rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
                aria-label="Question number"
              />
              <input
                type="text"
                value={row.question_text}
                onChange={(e) => updateRow(index, "question_text", e.target.value)}
                placeholder="Question text"
                className="flex-1 rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="font-utility text-xs text-mark hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OPTION_FIELDS.map((field, i) => (
                <input
                  key={field}
                  type="text"
                  value={row[field] ?? ""}
                  onChange={(e) => updateRow(index, field, e.target.value)}
                  placeholder={`Option ${OPTION_LABELS[i]}`}
                  className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-ink/60 dark:text-paper/60">Correct option</span>
              <select
                value={row.correct_option}
                onChange={(e) => updateRow(index, "correct_option", e.target.value)}
                className="rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
              >
                {OPTION_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" onClick={addRow}>
          Add another question
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isCreating}>
          {isCreating ? "Saving…" : "Save questions"}
        </Button>
      </div>

      {error && <p className="font-utility text-[11px] text-mark">{error}</p>}
    </div>
  );
}
