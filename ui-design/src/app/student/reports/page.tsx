import type { Metadata } from "next";
import { TopicTree } from "@/components/charts/TopicTree";
import { TrendChart } from "@/components/charts/TrendChart";
import {
  CURRENT_STUDENT_ID,
  flattenTopicLeaves,
  STUDENT_TOPIC_HISTORY,
  STUDENT_WEAK_TOPICS,
  topicPathTo,
} from "@/lib/mock-data";

export const metadata: Metadata = { title: "My report" };

export default function StudentReportsPage() {
  const topics = STUDENT_WEAK_TOPICS[CURRENT_STUDENT_ID] ?? [];
  const history = STUDENT_TOPIC_HISTORY[CURRENT_STUDENT_ID];

  const leaves = flattenTopicLeaves(topics);
  const weakest = [...leaves].sort((a, b) => a.accuracy - b.accuracy)[0];
  const weakestPath = weakest ? topicPathTo(topics, weakest)?.join(" → ") ?? weakest.name : null;

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
        Rolled up from your own results — the same tree every question maps to,
        drilled down to what you personally need to re-read.
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <h3 className="font-display text-lg text-ink dark:text-paper">My weak areas</h3>
          <div className="mt-4">
            <TopicTree nodes={topics} />
          </div>
        </div>

        {weakest && weakestPath && history && (
          <TrendChart
            title={`${weakestPath.split(" → ").at(-1)} accuracy`}
            periodLabel="Last 4 tests"
            unitLabel="% accuracy"
            data={history}
            valueSuffix="%"
          />
        )}
      </div>
    </div>
  );
}
