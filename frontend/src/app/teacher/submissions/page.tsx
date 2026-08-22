import type { Metadata } from "next";
import { SubmissionsQueue } from "@/features/submissions/component/submissions-queue";

export const metadata: Metadata = { title: "Submissions" };

interface PageProps {
  searchParams: Promise<{ test_id?: string }>;
}

export default async function TeacherSubmissionsPage({ searchParams }: PageProps) {
  const { test_id } = await searchParams;
  return <SubmissionsQueue initialTestId={test_id ? Number(test_id) : null} />;
}
