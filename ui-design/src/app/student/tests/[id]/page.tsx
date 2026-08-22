import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestAction } from "@/components/student/TestAction";
import {
  CURRENT_STUDENT_CLASS_ID,
  CURRENT_STUDENT_ID,
  submissionForStudentAndTest,
  testById,
} from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: testById(id)?.title ?? "Test" };
}

export default async function StudentTestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const test = testById(id);

  // Students only see published tests for their own class — a draft or a
  // test from another class doesn't exist as far as they're concerned.
  if (!test || test.classId !== CURRENT_STUDENT_CLASS_ID || test.status !== "published") {
    notFound();
  }

  const submission = submissionForStudentAndTest(CURRENT_STUDENT_ID, id) ?? null;

  return <TestAction test={test} submission={submission} />;
}
