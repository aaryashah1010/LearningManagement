import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentReport } from "@/components/teacher/StudentReport";
import {
  CURRENT_TEACHER_ID,
  findStudentInTeacherClasses,
  STUDENT_WEAK_TOPICS,
  TEST_HISTORY,
} from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const found = findStudentInTeacherClasses(CURRENT_TEACHER_ID, id);
  return { title: found ? `${found.student.name}'s report` : "Student report" };
}

export default async function TeacherStudentReportPage({ params }: PageProps) {
  const { id } = await params;
  const found = findStudentInTeacherClasses(CURRENT_TEACHER_ID, id);
  if (!found) notFound();

  const { student, cls } = found;

  return (
    <StudentReport
      student={student}
      cls={cls}
      topics={STUDENT_WEAK_TOPICS[student.id]}
      history={TEST_HISTORY[student.id]}
    />
  );
}
