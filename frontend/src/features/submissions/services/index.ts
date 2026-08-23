import { apiClient } from "@/lib/api";
import {
  AnswerSchema,
  BulkUploadResultSchema,
  SaveSubmissionsResultSchema,
  SubmissionDetailSchema,
  SubmissionSchema,
  type Answer,
  type BulkUploadResult,
  type SaveSubmissionsResult,
  type Submission,
  type SubmissionDetail,
  type SubmissionStatus,
} from "../types";

export async function uploadBulkSubmissions(testId: number, file: File): Promise<BulkUploadResult> {
  const result = await apiClient.postFile<BulkUploadResult>(`/tests/${testId}/submissions/bulk`, file);
  return BulkUploadResultSchema.parse(result);
}

export async function fetchSubmissions(
  testId: number,
  status: SubmissionStatus | null
): Promise<Submission[]> {
  const query = status ? `?status=${status}` : "";
  const result = await apiClient.get<Submission[]>(`/tests/${testId}/submissions${query}`);
  return result.map((s) => SubmissionSchema.parse(s));
}

export async function fetchSubmissionDetail(submissionId: number): Promise<SubmissionDetail> {
  const result = await apiClient.get<SubmissionDetail>(`/submissions/${submissionId}`);
  return SubmissionDetailSchema.parse(result);
}

export async function updateSubmissionAnswer(
  submissionId: number,
  questionId: number,
  selectedOption: string | null
): Promise<Answer> {
  const result = await apiClient.put<Answer>(`/submissions/${submissionId}/answers/${questionId}`, {
    selected_option: selectedOption,
  });
  return AnswerSchema.parse(result);
}

export async function assignSubmissionStudent(
  submissionId: number,
  studentId: number,
  rawExtractedName?: string
): Promise<Submission> {
  const result = await apiClient.patch<Submission>(`/submissions/${submissionId}/student`, {
    student_id: studentId,
    ...(rawExtractedName !== undefined && { raw_extracted_name: rawExtractedName }),
  });
  return SubmissionSchema.parse(result);
}

export async function saveSubmissions(testId: number): Promise<SaveSubmissionsResult> {
  const result = await apiClient.post<SaveSubmissionsResult>(`/tests/${testId}/submissions/save`, {});
  return SaveSubmissionsResultSchema.parse(result);
}
