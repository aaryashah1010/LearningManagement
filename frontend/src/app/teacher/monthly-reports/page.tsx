import type { Metadata } from "next";
import { MonthlyReportsView } from "@/features/reports/component/monthly-reports-view";

export const metadata: Metadata = { title: "Monthly Reports" };

export default function TeacherMonthlyReportsPage() {
  return <MonthlyReportsView />;
}
