import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchClassCumulativeReport,
  fetchCumulativeReport,
  fetchStudentReport,
  generateTestReport,
} from "../services";

export function useGenerateTestReport() {
  const { mutateAsync, data, isPending, error } = useMutation({
    mutationFn: (testId: number) => generateTestReport(testId),
  });
  return { generateReport: mutateAsync, report: data, isGenerating: isPending, error };
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
  month: number
) {
  const { data: report, error, isLoading } = useQuery({
    queryKey: ["classCumulativeReport", classId, bookId, year, month],
    queryFn: () => fetchClassCumulativeReport(classId as number, bookId as number, year, month),
    enabled: !!classId && !!bookId,
  });
  return { report, error, isLoading };
}
