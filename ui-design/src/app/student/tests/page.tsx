import type { Metadata } from "next";
import Link from "next/link";
import {
  CURRENT_STUDENT_CLASS_ID,
  CURRENT_STUDENT_ID,
  publishedTestsForClass,
  submissionForStudentAndTest,
} from "@/lib/mock-data";

export const metadata: Metadata = { title: "Tests" };

export default function StudentTestsPage() {
  const tests = publishedTestsForClass(CURRENT_STUDENT_CLASS_ID);

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
        Tests your teacher has published. Upload a photo of your completed OMR
        sheet — any layout works.
      </p>

      <ul className="flex flex-col divide-y divide-ink/8 rounded-2xl border border-ink/10 dark:divide-paper/8 dark:border-paper/10">
        {tests.map((test) => {
          const submission = submissionForStudentAndTest(CURRENT_STUDENT_ID, test.id);
          return (
            <li key={test.id}>
              <Link
                href={`/student/tests/${test.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-correct dark:hover:bg-paper/[0.04]"
              >
                <div>
                  <p className="font-medium text-ink dark:text-paper">{test.title}</p>
                  <p className="font-utility text-xs text-ink/45 dark:text-paper/45">
                    {test.questionCount} questions
                  </p>
                </div>
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
  );
}
