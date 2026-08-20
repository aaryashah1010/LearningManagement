import type { Metadata } from "next";
import Link from "next/link";
import { CURRENT_TEACHER_ID, MOCK_SUBMISSIONS, testById, testsForTeacher } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Submissions" };

export default function TeacherSubmissionsPage() {
  const myTestIds = new Set(testsForTeacher(CURRENT_TEACHER_ID).map((t) => t.id));
  const submissions = MOCK_SUBMISSIONS.filter((s) => myTestIds.has(s.testId));

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
        Low-confidence bubble reads need a quick confirm before they count toward
        a student&rsquo;s report.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
              <th className="px-5 py-3 font-medium">Student</th>
              <th className="px-5 py-3 font-medium">Test</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Review</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => {
              const needsReview = submission.answers.filter((a) => a.needsReview).length;
              const test = testById(submission.testId);
              return (
                <tr
                  key={submission.id}
                  className="border-b border-ink/8 last:border-0 dark:border-paper/8"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/teacher/submissions/${submission.id}`}
                      className="font-medium text-ink hover:text-correct dark:text-paper"
                    >
                      {submission.studentName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60">{test?.title}</td>
                  <td className="px-5 py-3.5 font-utility text-xs font-semibold text-ink dark:text-paper">
                    {submission.score}%
                  </td>
                  <td className="px-5 py-3.5">
                    {needsReview > 0 ? (
                      <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-mark">
                        {needsReview} flagged
                      </span>
                    ) : (
                      <span className="font-utility text-[11px] font-medium uppercase tracking-wide text-chart-green">
                        Clear
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
