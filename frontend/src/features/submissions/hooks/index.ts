import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignSubmissionStudent,
  fetchSubmissionDetail,
  fetchSubmissions,
  saveSubmissions,
  updateSubmissionAnswer,
  uploadBulkSubmissions,
} from "../services";
import type { SubmissionStatus } from "../types";

export function useUploadBulkSubmissions(testId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (file: File) => uploadBulkSubmissions(testId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", testId] });
    },
  });
  return { uploadBulkSubmissions: mutateAsync, isUploading: isPending };
}

export function useSubmissions(testId: number, status: SubmissionStatus | null) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["submissions", testId, status],
    queryFn: () => fetchSubmissions(testId, status),
    enabled: !!testId,
  });
  return { submissions: data ?? [], error, isLoading };
}

export function useSubmissionDetail(submissionId: number) {
  const { data: submission, error, isLoading } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => fetchSubmissionDetail(submissionId),
    enabled: !!submissionId,
  });
  return { submission, error, isLoading };
}

export function useUpdateSubmissionAnswer(submissionId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ questionId, selectedOption }: { questionId: number; selectedOption: string | null }) =>
      updateSubmissionAnswer(submissionId, questionId, selectedOption),
    onSuccess: (updatedAnswer) => {
      queryClient.setQueryData(
        ["submission", submissionId],
        (old: Awaited<ReturnType<typeof fetchSubmissionDetail>> | undefined) =>
          old
            ? {
                ...old,
                answers: old.answers.map((a) =>
                  a.question_id === updatedAnswer.question_id ? { ...a, ...updatedAnswer } : a
                ),
              }
            : old
      );
      // Fixing a flagged answer can flip the submission's overall status
      // server-side too (see _compute_status) — the queue list caches status
      // per test, so it needs invalidating alongside the detail cache above.
      const testId = queryClient.getQueryData<Awaited<ReturnType<typeof fetchSubmissionDetail>>>([
        "submission",
        submissionId,
      ])?.test_id;
      if (testId) queryClient.invalidateQueries({ queryKey: ["submissions", testId] });
    },
  });
  return { updateAnswer: mutateAsync, isUpdating: isPending };
}

export function useAssignSubmissionStudent(submissionId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ studentId, rawExtractedName }: { studentId: number; rawExtractedName?: string }) =>
      assignSubmissionStudent(submissionId, studentId, rawExtractedName),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["submission", submissionId],
        (old: Awaited<ReturnType<typeof fetchSubmissionDetail>> | undefined) =>
          old ? { ...old, ...updated } : old
      );
      // The queue list (features/submissions/component/submissions-queue.tsx)
      // caches submissions per test/status separately from this detail cache —
      // without this it keeps showing the pre-assignment "Unmatched" row.
      queryClient.invalidateQueries({ queryKey: ["submissions", updated.test_id] });
    },
  });
  return { assignStudent: mutateAsync, isAssigning: isPending };
}

export function useSaveSubmissions(testId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => saveSubmissions(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", testId] });
    },
  });
  return { saveSubmissions: mutateAsync, isSaving: isPending };
}
