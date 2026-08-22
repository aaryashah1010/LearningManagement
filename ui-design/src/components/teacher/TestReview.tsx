"use client";

import { useState } from "react";
import { SubmissionsIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { MarksheetFlow } from "@/components/teacher/MarksheetFlow";
import type { MockClass, MockQuestion, MockTest, TestStatus } from "@/lib/mock-data";

// Illustrates what "AI extraction" would hand back for a fresh draft test —
// same worked example as docs/omr-grading.md § 12.
const DEMO_QUESTIONS: MockQuestion[] = [
  { id: "demo-q1", number: 1, text: "Factorise: x² + 5x + 6", correctAnswer: "B", nodePath: "Algebra / Polynomials / Factorisation", confidence: "high" },
  { id: "demo-q2", number: 2, text: "A tangent is drawn from an external point to a circle of radius 5 cm.", correctAnswer: "C", nodePath: "Geometry / Circles / Tangents", confidence: "low" },
  { id: "demo-q3", number: 3, text: "Two triangles are similar if their corresponding angles are equal.", correctAnswer: "A", nodePath: "Geometry / Triangles / Similarity", confidence: "high" },
  { id: "demo-q4", number: 4, text: "Find the mean of the following grouped data.", correctAnswer: "D", nodePath: "Statistics / Data Handling / Mean", confidence: "high" },
];

export function TestReview({ test, cls }: { test: MockTest; cls: MockClass }) {
  const [questions, setQuestions] = useState<MockQuestion[]>(test.questions);
  const [status, setStatus] = useState<TestStatus>(test.status);
  const [extracting, setExtracting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPath, setDraftPath] = useState("");

  function handleUpload() {
    setExtracting(true);
    setTimeout(() => {
      setQuestions(DEMO_QUESTIONS);
      setExtracting(false);
    }, 900);
  }

  function startEdit(question: MockQuestion) {
    setEditingId(question.id);
    setDraftPath(question.nodePath);
  }

  function confirmEdit(id: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, nodePath: draftPath, confidence: "high" } : q))
    );
    setEditingId(null);
  }

  const hasLowConfidence = questions.some((q) => q.confidence === "low");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink/55 dark:text-paper/55">{cls.name}</p>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl text-ink dark:text-paper">{test.title}</h2>
          <span
            className={`font-utility text-[11px] font-medium uppercase tracking-wide ${
              status === "published" ? "text-chart-green" : "text-chart-amber"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink/15 py-16 text-center dark:border-paper/15">
          <SubmissionsIcon className="h-8 w-8 text-ink/30 dark:text-paper/30" />
          <div>
            <p className="font-display text-lg text-ink dark:text-paper">No questions yet</p>
            <p className="mt-1 max-w-sm text-sm text-ink/55 dark:text-paper/55">
              Upload the question paper PDF — AI extracts questions, answers, and
              curriculum mapping for you to review.
            </p>
          </div>
          <Button onClick={handleUpload} disabled={extracting}>
            {extracting ? "Extracting…" : "Upload question paper"}
          </Button>
        </div>
      ) : (
        <>
          {hasLowConfidence && status === "draft" && (
            <div className="rounded-xl border border-chart-amber/30 bg-chart-amber/[0.08] px-4 py-3 text-sm text-ink dark:text-paper">
              One mapping needs a look before you publish — low-confidence AI picks
              are marked below.
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
                  <th className="px-5 py-3 font-medium">Q</th>
                  <th className="px-5 py-3 font-medium">Question</th>
                  <th className="px-5 py-3 font-medium">Answer</th>
                  <th className="px-5 py-3 font-medium">Curriculum node</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-ink/8 align-top last:border-0 dark:border-paper/8"
                  >
                    <td className="px-5 py-3.5 font-utility text-xs text-ink/50 dark:text-paper/50">
                      {q.number}
                    </td>
                    <td className="max-w-xs px-5 py-3.5 text-ink dark:text-paper">{q.text}</td>
                    <td className="px-5 py-3.5 font-utility text-xs font-semibold text-ink dark:text-paper">
                      {q.correctAnswer}
                    </td>
                    <td className="px-5 py-3.5">
                      {editingId === q.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={draftPath}
                            onChange={(event) => setDraftPath(event.target.value)}
                            className="w-full rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1.5 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
                          />
                          <Button onClick={() => confirmEdit(q.id)}>Save</Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-ink/70 dark:text-paper/70">{q.nodePath}</span>
                          {q.confidence === "low" && (
                            <span className="font-utility text-[10px] font-semibold uppercase tracking-wide text-mark">
                              Low confidence
                            </span>
                          )}
                          {status === "draft" && (
                            <button
                              type="button"
                              onClick={() => startEdit(q)}
                              className="font-utility text-[11px] font-medium text-correct hover:underline"
                            >
                              Fix
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {status === "draft" ? (
            <Button onClick={() => setStatus("published")} className="self-start">
              Publish test
            </Button>
          ) : (
            <>
              <p className="font-utility text-xs text-ink/45 dark:text-paper/45">
                Published — curriculum mapping is locked for this test.
              </p>

              <MarksheetFlow test={test} cls={cls} questions={questions} />
            </>
          )}
        </>
      )}
    </div>
  );
}
