"use client";

import { useState } from "react";
import { useClasses } from "@/features/classes/hooks";
import { useTest, useTestsForClass } from "@/features/tests/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSaveSubmissions, useSubmissions } from "./index";
import type { SubmissionStatus } from "../types";

const STATUS_TABS: (SubmissionStatus | "all")[] = ["pending", "needs_review", "processed", "all"];
export { STATUS_TABS };

export function useSubmissionsQueueController(initialTestId: number | null) {
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
  const [selectedTestId, setSelectedTestId] = useState<number | null>(initialTestId);
  const [statusTab, setStatusTab] = useState<SubmissionStatus | "all">("pending");

  // The "review the queue" link from a test's upload panel only carries a test
  // id, not its class — resolve the initial test's class to seed the picker.
  const { test: initialTest } = useTest(initialTestId ?? 0);
  const classId = selectedClassId ?? initialTest?.class_id ?? classes.at(0)?.id ?? null;

  const { tests } = useTestsForClass(classId);
  const publishedTests = tests.filter((t) => t.published_at !== null);
  const testId =
    selectedTestId !== null && publishedTests.some((t) => t.id === selectedTestId)
      ? selectedTestId
      : (publishedTests.at(0)?.id ?? null);

  function handleClassChange(id: number) {
    setSelectedClassId(id);
    setSelectedTestId(null);
  }

  const { submissions, isLoading: isSubmissionsLoading } = useSubmissions(
    testId ?? 0,
    statusTab === "all" ? null : statusTab
  );
  const { saveSubmissions, isSaving } = useSaveSubmissions(testId ?? 0);

  return {
    classes,
    isClassesLoading,
    classSearch: classSearchInput,
    setClassSearch: setClassSearchInput,
    isFetchingMoreClasses,
    hasMoreClasses,
    fetchMoreClasses,
    classId,
    setClassId: handleClassChange,
    publishedTests,
    testId,
    setTestId: setSelectedTestId,
    statusTab,
    setStatusTab,
    submissions,
    isSubmissionsLoading,
    saveSubmissions,
    isSaving,
  };
}
