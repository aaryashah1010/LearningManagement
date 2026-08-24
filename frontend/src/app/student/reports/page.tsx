import type { Metadata } from "next";
import { StudentReportView } from "@/features/reports/component/student-report-view";

export const metadata: Metadata = { title: "My report" };

export default function StudentReportsPage() {
  return <StudentReportView />;
}
