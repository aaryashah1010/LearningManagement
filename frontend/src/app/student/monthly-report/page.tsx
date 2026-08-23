import type { Metadata } from "next";
import { StudentMonthlyReportView } from "@/features/reports/component/student-monthly-report-view";

export const metadata: Metadata = { title: "Monthly Report" };

export default function StudentMonthlyReportPage() {
  return <StudentMonthlyReportView />;
}
