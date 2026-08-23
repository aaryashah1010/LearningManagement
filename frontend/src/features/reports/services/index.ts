import { apiClient } from "@/lib/api";
import { StudentReportSchema, TestReportResponseSchema, type StudentReport, type TestReportResponse } from "../types";

export async function generateTestReport(testId: number): Promise<TestReportResponse> {
  const result = await apiClient.post<TestReportResponse>(`/tests/${testId}/report/generate`, {});
  return TestReportResponseSchema.parse(result);
}

export async function fetchStudentReport(testId: number, studentId: number): Promise<StudentReport> {
  const result = await apiClient.get<StudentReport>(`/tests/${testId}/report/students/${studentId}`);
  return StudentReportSchema.parse(result);
}
