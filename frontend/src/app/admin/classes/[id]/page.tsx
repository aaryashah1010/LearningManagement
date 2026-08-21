import { ClassDetailView } from "@/features/classes/component/class-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminClassDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ClassDetailView classId={Number(id)} />;
}
