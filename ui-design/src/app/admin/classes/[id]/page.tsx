import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClassDetail } from "@/components/admin/ClassDetail";
import { MOCK_CLASSES, MOCK_TEACHERS } from "@/lib/mock-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const cls = MOCK_CLASSES.find((c) => c.id === id);
  return { title: cls?.name ?? "Class" };
}

export default async function AdminClassDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cls = MOCK_CLASSES.find((c) => c.id === id);
  if (!cls) notFound();

  return <ClassDetail cls={cls} teachers={MOCK_TEACHERS} />;
}
