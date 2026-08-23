import { SubmissionDetailView } from "@/features/submissions/component/submission-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeacherSubmissionDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SubmissionDetailView submissionId={Number(id)} />;
}
