import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubmissionReview } from "@/components/teacher/SubmissionReview";
import { classById, CURRENT_TEACHER_ID, submissionById, testById } from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const submission = submissionById(id);
  return { title: submission ? `${submission.studentName}'s submission` : "Submission" };
}

export default async function TeacherSubmissionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const submission = submissionById(id);
  const test = submission ? testById(submission.testId) : undefined;
  const cls = test ? classById(test.classId) : undefined;
  if (!submission || !test || !cls || cls.teacherId !== CURRENT_TEACHER_ID) notFound();

  return <SubmissionReview submission={submission} testTitle={test.title} />;
}
