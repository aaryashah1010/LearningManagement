import Link from "next/link";
import { TopicTree } from "@/components/charts/TopicTree";
import { TrendChart } from "@/components/charts/TrendChart";
import type { MockClass, MockStudent, TopicNode } from "@/lib/mock-data";

export function StudentReport({
  student,
  cls,
  topics,
  history,
}: {
  student: MockStudent;
  cls: MockClass;
  topics: TopicNode[] | undefined;
  history: { label: string; value: number }[] | undefined;
}) {
  return (
    <div className="flex flex-col gap-8">
      <Link
        href={`/teacher/classes/${cls.id}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
      >
        <span aria-hidden>←</span> {cls.name}
      </Link>

      <div>
        <h2 className="font-display text-2xl text-ink dark:text-paper">{student.name}</h2>
        <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">{cls.name}</p>
      </div>

      {topics && history ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
            <h3 className="font-display text-lg text-ink dark:text-paper">Weak areas</h3>
            <div className="mt-4">
              <TopicTree nodes={topics} />
            </div>
          </div>

          <TrendChart
            title="Cumulative — 4 unit tests"
            periodLabel="This subject, this term"
            unitLabel="overall"
            data={history}
            valueSuffix="%"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/15 py-16 text-center dark:border-paper/15">
          <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
            Insufficient data
          </p>
          <p className="max-w-sm text-sm text-ink/55 dark:text-paper/55">
            {student.name} hasn&rsquo;t submitted enough graded tests yet for a
            reliable report.
          </p>
        </div>
      )}
    </div>
  );
}
