import { apiClient } from "@/lib/api";
import { AdminStatsSchema, TeacherStatsSchema, type AdminStats, type TeacherStats } from "../types";

export async function fetchAdminStats(): Promise<AdminStats> {
  const result = await apiClient.get<AdminStats>("/stats/admin");
  return AdminStatsSchema.parse(result);
}

export async function fetchTeacherStats(): Promise<TeacherStats> {
  const result = await apiClient.get<TeacherStats>("/stats/teacher");
  return TeacherStatsSchema.parse(result);
}
