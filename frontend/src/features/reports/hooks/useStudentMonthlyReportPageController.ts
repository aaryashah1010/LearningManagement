"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCumulativeReport } from "./index";
import { useSubjectBookMonthPicker } from "./useSubjectBookMonthPicker";

export function useStudentMonthlyReportPageController() {
  const { user } = useAuth();
  const studentId = user?.id ?? 0;

  const picker = useSubjectBookMonthPicker();
  const { bookId, year, month } = picker;

  const { report, isLoading } = useCumulativeReport(studentId, bookId, year, month);

  return {
    ...picker,
    report,
    isLoading,
  };
}
