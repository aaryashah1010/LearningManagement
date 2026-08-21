import { apiClient } from "@/lib/api";
import { StudentViewSchema, TeacherViewSchema, type StudentView, type TeacherView } from "@/types/common";
import { ClassDetailSchema, ClassSchema, type Class, type ClassDetail } from "../types";

export async function fetchClasses(cursor: number | null, limit: number) {
  const query = cursor ? `?cursor=${cursor}&limit=${limit}` : `?limit=${limit}`;
  const result = await apiClient.getPaginated<Class>(`/classes/${query}`);
  return { data: result.data.map((c) => ClassSchema.parse(c)), pagination: result.pagination };
}

export async function createClass(name: string): Promise<Class> {
  const result = await apiClient.post<Class>("/classes/", { name });
  return ClassSchema.parse(result);
}

export async function fetchClassDetail(classId: number): Promise<ClassDetail> {
  const result = await apiClient.get<ClassDetail>(`/classes/${classId}`);
  return ClassDetailSchema.parse(result);
}

export async function fetchEnrollments(classId: number, cursor: number | null, limit: number) {
  const query = cursor ? `?cursor=${cursor}&limit=${limit}` : `?limit=${limit}`;
  const result = await apiClient.getPaginated<StudentView>(`/classes/${classId}/enrollments${query}`);
  return { data: result.data.map((s) => StudentViewSchema.parse(s)), pagination: result.pagination };
}

export async function removeEnrollment(classId: number, studentId: number): Promise<void> {
  await apiClient.delete<null>(`/classes/${classId}/enrollments/${studentId}`);
}

export async function transferEnrollment(
  classId: number,
  studentId: number,
  newClassId: number
): Promise<void> {
  await apiClient.patch<null>(`/classes/${classId}/enrollments/${studentId}`, { new_class_id: newClassId });
}

export async function fetchClassTeachers(classId: number): Promise<TeacherView[]> {
  const result = await apiClient.get<TeacherView[]>(`/classes/${classId}/teachers`);
  return result.map((t) => TeacherViewSchema.parse(t));
}

export async function assignTeacher(classId: number, teacherId: number): Promise<void> {
  await apiClient.post<null>(`/classes/${classId}/teachers`, { teacher_id: teacherId });
}

export async function unassignTeacher(classId: number, teacherId: number): Promise<void> {
  await apiClient.delete<null>(`/classes/${classId}/teachers/${teacherId}`);
}
