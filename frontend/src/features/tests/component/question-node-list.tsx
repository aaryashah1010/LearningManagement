"use client";

import { useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { useCurriculumOptions, useQuestions, useSetQuestionNode } from "../hooks";

function NodePicker({
  testId,
  questionId,
  bookId,
  currentNodeId,
  currentPath,
}: {
  testId: number;
  questionId: number;
  bookId: number;
  currentNodeId: number | null;
  currentPath: string | null;
}) {
  const { nodes, isLoading } = useCurriculumOptions(bookId);
  const { setQuestionNode, isSettingNode } = useSetQuestionNode(testId);
  const [search, setSearch] = useState("");

  const filtered = search
    ? nodes.filter((n) => n.path.toLowerCase().includes(search.toLowerCase()))
    : nodes;

  async function handleChange(nodeId: number) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setSearch("");
    await setQuestionNode({ questionId, nodeId: node.id, path: node.path });
  }

  return (
    <div className="w-full self-start sm:max-w-xs">
      <Combobox
        value={currentNodeId}
        onChange={handleChange}
        items={filtered.map((n) => ({ id: n.id, label: n.path }))}
        search={search}
        onSearchChange={setSearch}
        isLoading={isLoading}
        isFetchingNextPage={false}
        hasNextPage={false}
        onLoadMore={() => {}}
        placeholder="Change topic…"
        disabled={isSettingNode}
        selectedLabel={currentPath}
      />
    </div>
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
          <NodePicker
            testId={testId}
            questionId={q.id}
            bookId={bookId}
            currentNodeId={q.node?.id ?? null}
            currentPath={q.node?.path ?? null}
          />
        </li>
      ))}
    </ul>
  );
}
