import { apiClient } from "@/lib/api";
import { StudentViewSchema, type StudentView } from "@/types/common";
import { BulkEnrollResultSchema, type BulkEnrollResult, type DraftStudentRow } from "../types";

export async function fetchStudents(cursor: number | null, limit: number, search?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", String(cursor));
  if (search) params.set("search", search);
  const result = await apiClient.getPaginated<StudentView>(`/accounts/students?${params}`);
  return { data: result.data.map((s) => StudentViewSchema.parse(s)), pagination: result.pagination };
}

function isEmail(contact: string): boolean {
  return contact.includes("@");
}

export async function enrollStudentsBulk(
  classId: number,
  rows: DraftStudentRow[]
): Promise<BulkEnrollResult> {
  const students = rows.map((row) => ({
    name: row.name,
    date_of_birth: row.dateOfBirth,
    email: isEmail(row.contact) ? row.contact : null,
    phone: isEmail(row.contact) ? null : row.contact,
  }));
  const result = await apiClient.post<BulkEnrollResult>("/accounts/students/bulk", {
    class_id: classId,
    students,
  });
  return BulkEnrollResultSchema.parse(result);
}
