import { apiClient } from "@/lib/api";
import { TeacherViewSchema, type TeacherView } from "@/types/common";

export async function createTeacher(name: string, email: string, password: string): Promise<TeacherView> {
  const result = await apiClient.post<TeacherView>("/accounts/teachers", { name, email, password });
  return TeacherViewSchema.parse(result);
}

export async function fetchTeachers(cursor: number | null, limit: number) {
  const query = cursor ? `?cursor=${cursor}&limit=${limit}` : `?limit=${limit}`;
  const result = await apiClient.getPaginated<TeacherView>(`/accounts/teachers${query}`);
  return { data: result.data.map((t) => TeacherViewSchema.parse(t)), pagination: result.pagination };
}
