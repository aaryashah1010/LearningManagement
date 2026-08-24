import { StudentTestDetail } from "@/features/tests/component/student-test-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentTestDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <StudentTestDetail testId={Number(id)} />;
}
