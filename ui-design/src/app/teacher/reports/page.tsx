"use client";

import { useState } from "react";
import { TopicTree } from "@/components/charts/TopicTree";
import {
  CLASS_WEAK_TOPICS,
  classesForTeacher,
  CURRENT_TEACHER_ID,
  flattenTopicLeaves,
  topicPathTo,
  type TopicNode,
} from "@/lib/mock-data";

interface WeakestInfo {
  path: string;
  accuracy: number;
  total: number;
  weak: number;
  needsPractice: number;
  strong: number;
}

// Splits the remaining (non-weak) students using the same Strong/Needs
// Practice/Weak ratio as the worked example in omr-grading.md § 20 (5:9:34).
function computeWeakest(topics: TopicNode[]): WeakestInfo | null {
  const leaves = flattenTopicLeaves(topics).filter(
    (n): n is TopicNode & { studentsTotal: number; studentsStruggling: number } =>
      n.studentsTotal !== undefined && n.studentsStruggling !== undefined
  );
  if (leaves.length === 0) return null;

  const weakest = [...leaves].sort((a, b) => a.accuracy - b.accuracy)[0];
  const remaining = weakest.studentsTotal - weakest.studentsStruggling;
  const needsPractice = Math.round(remaining * (9 / 14));

  return {
    path: topicPathTo(topics, weakest)?.join(" → ") ?? weakest.name,
    accuracy: weakest.accuracy,
    total: weakest.studentsTotal,
    weak: weakest.studentsStruggling,
    needsPractice,
    strong: remaining - needsPractice,
  };
}

export default function TeacherReportsPage() {
  const myClasses = classesForTeacher(CURRENT_TEACHER_ID);
  const [classId, setClassId] = useState(myClasses[0]?.id ?? "");
  const topics = CLASS_WEAK_TOPICS[classId] ?? [];
  const selectedClass = myClasses.find((c) => c.id === classId);
  const weakest = computeWeakest(topics);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:max-w-sm">
        <label htmlFor="report-class" className="text-sm font-medium text-ink/80 dark:text-paper/80">
          Class
        </label>
        <select
          id="report-class"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <h3 className="font-display text-lg text-ink dark:text-paper">
            {selectedClass?.name} · topic accuracy
          </h3>
          <div className="mt-4">
            <TopicTree nodes={topics} />
          </div>
        </div>

        {weakest && (
          <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
            <div>
              <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
                Weakest topic
              </p>
              <p className="mt-1 font-display text-lg text-ink dark:text-paper">{weakest.path}</p>
              <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
                Class accuracy:{" "}
                <span className="font-semibold text-mark">{weakest.accuracy}%</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { label: "Weak", count: weakest.weak, color: "bg-mark" },
                { label: "Needs practice", count: weakest.needsPractice, color: "bg-chart-amber" },
                { label: "Strong", count: weakest.strong, color: "bg-chart-green" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.color}`} />
                  <span className="flex-1 text-sm text-ink dark:text-paper">{row.label}</span>
                  <span className="font-utility text-xs text-ink/55 dark:text-paper/55">
                    {row.count} students
                  </span>
                </div>
              ))}
            </div>

            <p className="font-utility text-[11px] text-ink/45 dark:text-paper/45">
              {weakest.total} students total in {selectedClass?.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
