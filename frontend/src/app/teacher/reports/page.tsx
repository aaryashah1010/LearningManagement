import type { Metadata } from "next";
import { ReportsView } from "@/features/reports/component/reports-view";

export const metadata: Metadata = { title: "Reports" };

export default function TeacherReportsPage() {
  return <ReportsView />;
}
