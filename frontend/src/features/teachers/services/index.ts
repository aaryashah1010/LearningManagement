import { apiClient } from "@/lib/api";
import { TeacherViewSchema, type TeacherView } from "@/types/common";

export async function createTeacher(name: string, email: string, password: string): Promise<TeacherView> {
  const result = await apiClient.post<TeacherView>("/accounts/teachers", { name, email, password });
  return TeacherViewSchema.parse(result);
}

export async function fetchTeachers(cursor: number | null, limit: number, search?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", String(cursor));
  if (search) params.set("search", search);
  const result = await apiClient.getPaginated<TeacherView>(`/accounts/teachers?${params}`);
  return { data: result.data.map((t) => TeacherViewSchema.parse(t)), pagination: result.pagination };
}
