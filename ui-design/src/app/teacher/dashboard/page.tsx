import type { Metadata } from "next";
import Link from "next/link";
import { ClassesIcon, ReportsIcon, SubmissionsIcon, TestsIcon } from "@/components/icons";
import { StatTile } from "@/components/charts/StatTile";
import { TopicTree } from "@/components/charts/TopicTree";
import {
  CLASS_WEAK_TOPICS,
  classesForTeacher,
  CURRENT_TEACHER_ID,
  MOCK_SUBMISSIONS,
  testsForTeacher,
} from "@/lib/mock-data";

export const metadata: Metadata = { title: "Teacher dashboard" };

export default function TeacherDashboardPage() {
  const myClasses = classesForTeacher(CURRENT_TEACHER_ID);
  const myTests = testsForTeacher(CURRENT_TEACHER_ID);
  const myTestIds = new Set(myTests.map((t) => t.id));
  const publishedTests = myTests.filter((t) => t.status === "published").length;
  const submissionsNeedingReview = MOCK_SUBMISSIONS.filter(
    (s) => myTestIds.has(s.testId) && s.answers.some((a) => a.needsReview)
  );

  const primaryClass = myClasses[0];
  const weakTopics = primaryClass ? CLASS_WEAK_TOPICS[primaryClass.id] : undefined;
  const avgAccuracy = weakTopics
    ? Math.round(weakTopics.reduce((sum, t) => sum + t.accuracy, 0) / weakTopics.length)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="My classes" value={String(myClasses.length)} icon={<ClassesIcon className="h-4 w-4" />} />
        <StatTile label="Published tests" value={String(publishedTests)} icon={<TestsIcon className="h-4 w-4" />} />
        <StatTile
          label="Needs review"
          value={String(submissionsNeedingReview.length)}
          status={submissionsNeedingReview.length > 0 ? "attention" : "good"}
          delta={{
            text: submissionsNeedingReview.length > 0 ? "Low-confidence bubble reads" : "All caught up",
            direction: submissionsNeedingReview.length > 0 ? "down" : "flat",
          }}
          icon={<SubmissionsIcon className="h-4 w-4" />}
        />
        {avgAccuracy !== null && (
          <StatTile
            label={`Avg accuracy · ${primaryClass.name}`}
            value={`${avgAccuracy}%`}
            icon={<ReportsIcon className="h-4 w-4" />}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <h3 className="font-display text-lg text-ink dark:text-paper">My classes</h3>
          <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
            {myClasses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/teacher/classes/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg py-3 transition-colors hover:text-correct focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct"
                >
                  <span className="font-medium text-ink dark:text-paper">{c.name}</span>
                  <span className="font-utility text-xs text-ink/45 dark:text-paper/45">
                    {c.enrolled} students
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {weakTopics && primaryClass && (
          <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg text-ink dark:text-paper">
                {primaryClass.name} · weak topics
              </h3>
              <Link
                href="/teacher/reports"
                className="text-sm font-medium text-correct hover:underline"
              >
                Full report
              </Link>
            </div>
            <TopicTree nodes={weakTopics} />
          </div>
        )}
      </div>
    </div>
  );
}
