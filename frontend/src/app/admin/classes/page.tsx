import type { Metadata } from "next";
import { ClassesGrid } from "@/features/classes/component/classes-grid";

export const metadata: Metadata = { title: "Classes" };

export default function AdminClassesPage() {
  return <ClassesGrid basePath="/admin/classes" />;
}
