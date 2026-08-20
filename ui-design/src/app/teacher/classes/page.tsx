import type { Metadata } from "next";
import Link from "next/link";
import { classesForTeacher, CURRENT_TEACHER_ID, testsForTeacher } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Classes" };

export default function TeacherClassesPage() {
  const myClasses = classesForTeacher(CURRENT_TEACHER_ID);
  const myTests = testsForTeacher(CURRENT_TEACHER_ID);

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
        Only classes you&rsquo;re assigned to — an admin manages who&rsquo;s
        assigned where.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {myClasses.map((c) => {
          const testCount = myTests.filter((t) => t.classId === c.id).length;
          return (
            <Link
              key={c.id}
              href={`/teacher/classes/${c.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-paper p-5 transition-colors hover:border-correct/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:border-paper/10 dark:bg-slate dark:focus-visible:ring-offset-slate"
            >
              <p className="font-display text-lg text-ink dark:text-paper">{c.name}</p>
              <p className="text-sm text-ink/55 dark:text-paper/55">{c.enrolled} students</p>
              <p className="mt-auto font-utility text-xs text-ink/45 dark:text-paper/45">
                {testCount} {testCount === 1 ? "test" : "tests"}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
