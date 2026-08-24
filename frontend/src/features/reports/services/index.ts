import { apiClient } from "@/lib/api";
import {
  ClassCumulativeReportSchema,
  CumulativeReportSchema,
  StudentReportSchema,
  TestReportResponseSchema,
  type ClassCumulativeReport,
  type CumulativeReport,
  type StudentReport,
  type TestReportResponse,
} from "../types";

export async function generateTestReport(testId: number): Promise<TestReportResponse> {
  const result = await apiClient.post<TestReportResponse>(`/tests/${testId}/report/generate`, {});
  return TestReportResponseSchema.parse(result);
}

export async function fetchStudentReport(testId: number, studentId: number): Promise<StudentReport> {
  const result = await apiClient.get<StudentReport>(`/tests/${testId}/report/students/${studentId}`);
  return StudentReportSchema.parse(result);
}

export async function fetchCumulativeReport(
  studentId: number,
  bookId: number,
  year: number,
  month: number
): Promise<CumulativeReport> {
  const params = new URLSearchParams({ book_id: String(bookId), year: String(year), month: String(month) });
  const result = await apiClient.get<CumulativeReport>(`/students/${studentId}/report/cumulative?${params}`);
  return CumulativeReportSchema.parse(result);
}

export async function fetchClassCumulativeReport(
  classId: number,
  bookId: number,
  year: number,
  month: number
): Promise<ClassCumulativeReport> {
  const params = new URLSearchParams({ book_id: String(bookId), year: String(year), month: String(month) });
  const result = await apiClient.get<ClassCumulativeReport>(`/classes/${classId}/report/cumulative?${params}`);
  return ClassCumulativeReportSchema.parse(result);
}
