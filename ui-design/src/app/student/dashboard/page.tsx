import type { Metadata } from "next";
import Link from "next/link";
import { ReportsIcon, TestsIcon } from "@/components/icons";
import { StatTile } from "@/components/charts/StatTile";
import { TopicTree } from "@/components/charts/TopicTree";
import {
  CURRENT_STUDENT_CLASS_ID,
  CURRENT_STUDENT_ID,
  flattenTopicLeaves,
  MOCK_SUBMISSIONS,
  publishedTestsForClass,
  STUDENT_WEAK_TOPICS,
  submissionForStudentAndTest,
} from "@/lib/mock-data";

export const metadata: Metadata = { title: "Student dashboard" };

export default function StudentDashboardPage() {
  const tests = publishedTestsForClass(CURRENT_STUDENT_CLASS_ID);
  const pendingTests = tests.filter(
    (test) => !submissionForStudentAndTest(CURRENT_STUDENT_ID, test.id)
  );
  const mySubmissions = MOCK_SUBMISSIONS.filter((s) => s.studentId === CURRENT_STUDENT_ID);
  const avgScore = mySubmissions.length
    ? Math.round(mySubmissions.reduce((sum, s) => sum + s.score, 0) / mySubmissions.length)
    : null;

  const topics = STUDENT_WEAK_TOPICS[CURRENT_STUDENT_ID] ?? [];
  const weakest = [...flattenTopicLeaves(topics)].sort((a, b) => a.accuracy - b.accuracy)[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Tests to take"
          value={String(pendingTests.length)}
          status={pendingTests.length > 0 ? "attention" : "good"}
          delta={{
            text: pendingTests.length > 0 ? "Waiting on your OMR sheet" : "All caught up",
            direction: pendingTests.length > 0 ? "down" : "flat",
          }}
          icon={<TestsIcon className="h-4 w-4" />}
        />
        {avgScore !== null && (
          <StatTile label="Average score" value={`${avgScore}%`} icon={<ReportsIcon className="h-4 w-4" />} />
        )}
        {weakest && (
          <StatTile
            label="Weakest topic"
            value={`${weakest.accuracy}%`}
            delta={{ text: weakest.name, direction: "flat" }}
            status="attention"
            icon={<ReportsIcon className="h-4 w-4" />}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg text-ink dark:text-paper">Tests</h3>
            <Link href="/student/tests" className="text-sm font-medium text-correct hover:underline">
              All tests
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
            {tests.map((test) => {
              const submission = submissionForStudentAndTest(CURRENT_STUDENT_ID, test.id);
              return (
                <li key={test.id}>
                  <Link
                    href={`/student/tests/${test.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:text-correct"
                  >
                    <span className="font-medium text-ink dark:text-paper">{test.title}</span>
                    {submission ? (
                      <span className="font-utility text-xs font-semibold text-chart-green">
                        {submission.score}%
                      </span>
                    ) : (
                      <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-chart-amber">
                        Take test
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg text-ink dark:text-paper">My weak areas</h3>
            <Link href="/student/reports" className="text-sm font-medium text-correct hover:underline">
              Full report
            </Link>
          </div>
          <TopicTree nodes={topics} />
        </div>
      </div>
    </div>
  );
}
