import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestReview } from "@/components/teacher/TestReview";
import { classById, CURRENT_TEACHER_ID, testById } from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: testById(id)?.title ?? "Test" };
}

export default async function TeacherTestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const test = testById(id);
  const cls = test ? classById(test.classId) : undefined;
  if (!test || !cls || cls.teacherId !== CURRENT_TEACHER_ID) notFound();

  return <TestReview test={test} cls={cls} />;
}
