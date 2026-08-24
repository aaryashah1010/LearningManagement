"use client";

import { useState } from "react";
import { useClasses } from "@/features/classes/hooks";
import { useTestsForClass } from "@/features/tests/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RequestError } from "@/lib/api";
import { useClassReport, useGenerateTestReport, useStudentReports } from "./index";

export type ReportTab = "class" | "student";

export function useReportsPageController() {
  const [classSearchInput, setClassSearchInput] = useState("");
  const classSearch = useDebouncedValue(classSearchInput);
  const {
    classes,
    isLoading: isClassesLoading,
    isFetchingNextPage: isFetchingMoreClasses,
    hasNextPage: hasMoreClasses,
    fetchNextPage: fetchMoreClasses,
  } = useClasses(classSearch);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const classId = selectedClassId ?? classes.at(0)?.id ?? null;
  const { tests } = useTestsForClass(classId);
  const publishedTests = tests.filter((t) => t.published_at !== null);
  const testId =
    selectedTestId !== null && publishedTests.some((t) => t.id === selectedTestId)
      ? selectedTestId
      : (publishedTests.at(0)?.id ?? null);

  const [activeTab, setActiveTab] = useState<ReportTab>("class");

  const { generateReport, isGenerating } = useGenerateTestReport();
  const { report: classReport, isLoading: isClassReportLoading } = useClassReport(
    testId,
    activeTab === "class"
  );
  const { reports: studentReports, isLoading: isStudentReportsLoading } = useStudentReports(
    testId,
    activeTab === "student"
  );

  function setClassId(id: number) {
    setSelectedClassId(id);
    setSelectedTestId(null);
  }

  async function handleGenerate() {
    if (!testId) return;
    setError(null);
    try {
      await generateReport(testId);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not generate the report.");
    }
  }

  return {
    classes,
    isClassesLoading,
    classSearch: classSearchInput,
    setClassSearch: setClassSearchInput,
    isFetchingMoreClasses,
    hasMoreClasses,
    fetchMoreClasses,
    classId,
    setClassId,
    publishedTests,
    testId,
    setTestId: setSelectedTestId,
    classReport,
    isClassReportLoading,
    studentReports,
    isStudentReportsLoading,
    isGenerating,
    error,
    handleGenerate,
    activeTab,
    setActiveTab,
  };
}
