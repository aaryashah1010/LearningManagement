import type { Metadata } from "next";
import { BulkEnrollForm } from "@/features/students/component/bulk-enroll-form";
import { StudentsTable } from "@/features/students/component/students-table";

export const metadata: Metadata = { title: "Students" };

export default function AdminStudentsPage() {
  return (
    <div className="flex flex-col gap-10">
      <BulkEnrollForm />
      <div>
        <p className="mb-4 font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
          All students
        </p>
        <StudentsTable />
      </div>
    </div>
  );
}
