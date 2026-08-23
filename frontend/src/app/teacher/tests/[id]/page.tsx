import { TestDetailView } from "@/features/tests/component/test-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeacherTestDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <TestDetailView testId={Number(id)} />;
}
