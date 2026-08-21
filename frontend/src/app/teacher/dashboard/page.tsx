import type { Metadata } from "next";
import { TeacherDashboardOverview } from "./dashboard-overview";

export const metadata: Metadata = { title: "Teacher dashboard" };

export default function TeacherDashboardPage() {
  return <TeacherDashboardOverview />;
}
