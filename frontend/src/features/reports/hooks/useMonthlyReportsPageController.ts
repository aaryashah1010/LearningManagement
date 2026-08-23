"use client";

import { useState } from "react";
import { useClasses } from "@/features/classes/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useClassCumulativeReport, useCumulativeReportsForClass } from "./index";
import { useSubjectBookMonthPicker } from "./useSubjectBookMonthPicker";

export type MonthlyReportTab = "class" | "student";

export function useMonthlyReportsPageController() {
  const [classSearchInput, setClassSearchInput] = useState("");
  const classSearch = useDebouncedValue(classSearchInput);
  const {
    classes,
    isLoading: isClassesLoading,
    isFetchingNextPage: isFetchingMoreClasses,
    hasNextPage: hasMoreClasses,
    fetchNextPage: fetchMoreClasses,
  } = useClasses(classSearch);
  const [classId, setClassId] = useState<number | null>(null);

  const picker = useSubjectBookMonthPicker();
  const { bookId, year, month } = picker;

  const [activeTab, setActiveTab] = useState<MonthlyReportTab>("class");

  const resolvedClassId = classId ?? classes.at(0)?.id ?? null;

  const { report: classCumulativeReport, isLoading: isClassLoading } = useClassCumulativeReport(
    resolvedClassId,
    bookId,
    year,
    month,
    activeTab === "class"
  );
  const { reports: studentCumulativeReports, isLoading: isStudentsLoading } = useCumulativeReportsForClass(
    resolvedClassId,
    bookId,
    year,
    month,
    activeTab === "student"
  );

  return {
    classes,
    isClassesLoading,
    classSearch: classSearchInput,
    setClassSearch: setClassSearchInput,
    isFetchingMoreClasses,
    hasMoreClasses,
    fetchMoreClasses,
    classId: resolvedClassId,
    setClassId,
    ...picker,
    activeTab,
    setActiveTab,
    classCumulativeReport,
    isClassLoading,
    studentCumulativeReports,
    isStudentsLoading,
  };
}
