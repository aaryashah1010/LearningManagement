import type { Metadata } from "next";
import { DashboardOverview } from "./dashboard-overview";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminDashboardPage() {
  return <DashboardOverview />;
}
