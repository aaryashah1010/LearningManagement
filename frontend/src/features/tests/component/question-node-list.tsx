"use client";

import { useState } from "react";
import { useCurriculumOptions, useQuestions, useSetQuestionNode } from "../hooks";

function NodePicker({
  testId,
  questionId,
  bookId,
}: {
  testId: number;
  questionId: number;
  bookId: number;
}) {
  const { nodes } = useCurriculumOptions(bookId);
  const { setQuestionNode, isSettingNode } = useSetQuestionNode(testId);
  const [value, setValue] = useState("");

  async function handleChange(nodeId: string) {
    setValue(nodeId);
    const node = nodes.find((n) => n.id === Number(nodeId));
    if (!node) return;
    await setQuestionNode({ questionId, nodeId: node.id, path: node.path });
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isSettingNode}
      className="w-full max-w-[220px] self-start truncate rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1 text-xs text-ink focus:border-correct focus:outline-none disabled:opacity-50 dark:border-paper/20 dark:text-paper"
    >
      <option value="">Change topic…</option>
      {nodes.map((n) => (
        <option key={n.id} value={n.id}>
          {n.path}
        </option>
      ))}
    </select>
  );
}

function QuestionRowSkeleton() {
  return <div className="h-12 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
}

export function QuestionNodeList({ testId, bookId }: { testId: number; bookId: number }) {
  const { questions, isLoading } = useQuestions(testId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <QuestionRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-paper/50">No questions yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
      {questions.map((q) => (
        <li key={q.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-ink dark:text-paper">
              <span className="font-utility text-xs font-medium text-ink/45 dark:text-paper/45">
                Q{q.question_number}
              </span>{" "}
              {q.question_text}
            </p>
            <p className="mt-1 font-utility text-[11px] text-ink/40 dark:text-paper/40">
              Correct: {q.correct_option}
              {q.node?.path ? ` · ${q.node.path}` : " · unmapped"}
            </p>
          </div>
          <NodePicker testId={testId} questionId={q.id} bookId={bookId} />
        </li>
      ))}
    </ul>
  );
}
