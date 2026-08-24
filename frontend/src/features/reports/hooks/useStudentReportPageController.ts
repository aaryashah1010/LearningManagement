"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useStudentTests } from "@/features/tests/hooks";
import { useStudentReport } from "./index";

export function useStudentReportPageController() {
  const { user } = useAuth();
  const studentId = user?.id ?? 0;
  const { tests, isLoading: isTestsLoading } = useStudentTests(studentId);
  const gradedTests = tests.filter((t) => t.submission_status === "processed");

  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const testId =
    selectedTestId !== null && gradedTests.some((t) => t.id === selectedTestId)
      ? selectedTestId
      : (gradedTests.at(0)?.id ?? null);

  const { report, isLoading: isReportLoading, error } = useStudentReport(testId, studentId);

  return {
    hasAnyTests: tests.length > 0,
    isTestsLoading,
    gradedTests,
    testId,
    setTestId: setSelectedTestId,
    report,
    isReportLoading,
    error,
  };
}
