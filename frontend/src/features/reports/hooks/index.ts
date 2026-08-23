import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClassCumulativeReport,
  fetchClassReport,
  fetchCumulativeReport,
  fetchCumulativeReportsForClass,
  fetchStudentReport,
  fetchStudentReports,
  generateTestReport,
} from "../services";

export function useGenerateTestReport() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (testId: number) => generateTestReport(testId),
    onSuccess: () => {
      // Generating a test's report also (re)computes its class/student cumulative
      // reports server-side — broad prefix invalidation over exact keys since this
      // hook doesn't know which class/book/month those queries are cached under.
      queryClient.invalidateQueries({ queryKey: ["classReport"] });
      queryClient.invalidateQueries({ queryKey: ["studentReports"] });
      queryClient.invalidateQueries({ queryKey: ["classCumulativeReport"] });
      queryClient.invalidateQueries({ queryKey: ["cumulativeReport"] });
    },
  });
  return { generateReport: mutateAsync, isGenerating: isPending, error };
}

export function useClassReport(testId: number | null, enabled = true) {
  const { data: report, error, isLoading } = useQuery({
    queryKey: ["classReport", testId],
    queryFn: () => fetchClassReport(testId as number),
    enabled: !!testId && enabled,
  });
  return { report, error, isLoading };
}

export function useStudentReports(testId: number | null, enabled = true) {
  const { data: reports, error, isLoading } = useQuery({
    queryKey: ["studentReports", testId],
    queryFn: () => fetchStudentReports(testId as number),
    enabled: !!testId && enabled,
  });
  return { reports: reports ?? [], error, isLoading };
}

export function useStudentReport(testId: number | null, studentId: number) {
  const { data: report, error, isLoading } = useQuery({
    queryKey: ["studentReport", testId, studentId],
    queryFn: () => fetchStudentReport(testId as number, studentId),
    enabled: !!testId && !!studentId,
  });
  return { report, error, isLoading };
}

export function useCumulativeReport(
  studentId: number,
  bookId: number | null,
  year: number,
  month: number
) {
  const { data: report, error, isLoading } = useQuery({
    queryKey: ["cumulativeReport", studentId, bookId, year, month],
    queryFn: () => fetchCumulativeReport(studentId, bookId as number, year, month),
    enabled: !!studentId && !!bookId,
  });
  return { report, error, isLoading };
}

export function useClassCumulativeReport(
  classId: number | null,
  bookId: number | null,
  year: number,
  month: number,
  enabled = true
) {
  const { data: report, error, isLoading } = useQuery({
    queryKey: ["classCumulativeReport", classId, bookId, year, month],
    queryFn: () => fetchClassCumulativeReport(classId as number, bookId as number, year, month),
    enabled: !!classId && !!bookId && enabled,
  });
  return { report, error, isLoading };
}

export function useCumulativeReportsForClass(
  classId: number | null,
  bookId: number | null,
  year: number,
  month: number,
  enabled = true
) {
  const { data: reports, error, isLoading } = useQuery({
    queryKey: ["cumulativeReportsForClass", classId, bookId, year, month],
    queryFn: () => fetchCumulativeReportsForClass(classId as number, bookId as number, year, month),
    enabled: !!classId && !!bookId && enabled,
  });
  return { reports: reports ?? [], error, isLoading };
}
