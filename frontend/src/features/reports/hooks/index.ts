import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchStudentReport, generateTestReport } from "../services";

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
