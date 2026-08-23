import type { Metadata } from "next";
import { CreateTeacherForm } from "@/features/teachers/component/create-teacher-form";
import { TeachersTable } from "@/features/teachers/component/teachers-table";

export const metadata: Metadata = { title: "Teachers" };

export default function AdminTeachersPage() {
  return (
    <div className="flex flex-col gap-8">
      <CreateTeacherForm />
      <TeachersTable />
    </div>
  );
}
