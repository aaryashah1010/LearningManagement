import type { Metadata } from "next";
import { ClassesGrid } from "@/features/classes/component/classes-grid";

export const metadata: Metadata = { title: "Classes" };

export default function TeacherClassesPage() {
  return <ClassesGrid canCreate={false} basePath="/teacher/classes" />;
}
