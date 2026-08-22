import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClassRoster } from "@/components/teacher/ClassRoster";
import {
  classesForTeacher,
  classById,
  CURRENT_TEACHER_ID,
  testsForTeacher,
} from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: classById(id)?.name ?? "Class" };
}

export default async function TeacherClassDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cls = classById(id);

  // Teachers only ever see classes they're assigned to — an unassigned
  // teacher gets CLASS_NOT_FOUND, not FORBIDDEN (accounts-and-roster.md).
  if (!cls || cls.teacherId !== CURRENT_TEACHER_ID) notFound();

  const myTests = testsForTeacher(CURRENT_TEACHER_ID).filter((t) => t.classId === id);
  const otherClasses = classesForTeacher(CURRENT_TEACHER_ID).filter((c) => c.id !== id);

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/teacher/classes"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
      >
        <span aria-hidden>←</span> All classes
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <h3 className="font-display text-lg text-ink dark:text-paper">Tests</h3>
          <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
            {myTests.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/teacher/tests/${t.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-correct"
                >
                  <span className="font-medium text-ink dark:text-paper">{t.title}</span>
                  <span
                    className={`font-utility text-[11px] font-medium uppercase tracking-wide ${
                      t.status === "published" ? "text-chart-green" : "text-chart-amber"
                    }`}
                  >
                    {t.status}
                  </span>
                </Link>
              </li>
            ))}
            {myTests.length === 0 && (
              <li className="py-4 text-sm text-ink/45 dark:text-paper/45">
                No tests for this class yet.
              </li>
            )}
          </ul>
          <Link href="/teacher/tests" className="text-sm font-medium text-correct hover:underline">
            Create a test →
          </Link>
        </div>

        <ClassRoster cls={cls} otherClasses={otherClasses} />
      </div>
    </div>
  );
}
