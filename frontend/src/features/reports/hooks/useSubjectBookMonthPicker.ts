"use client";

import { useState } from "react";
import { useBooks, useSubjects } from "@/features/tests/hooks";

const now = new Date();

// Shared by any page that lets someone pick a subject/book and a calendar month to
// view a cumulative report for — currently the teacher's Monthly Reports page and the
// student's own Monthly Report page.
export function useSubjectBookMonthPicker() {
  const { subjects } = useSubjects();
  const [subjectId, setSubjectIdState] = useState<number | null>(null);
  const { books } = useBooks(subjectId);
  const [bookId, setBookId] = useState<number | null>(null);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  function setSubjectId(id: number | null) {
    setSubjectIdState(id);
    setBookId(null);
  }

  function setMonthInput(value: string) {
    // <input type="month"> gives "YYYY-MM"
    const [y, m] = value.split("-").map(Number);
    if (y && m) {
      setYear(y);
      setMonth(m);
    }
  }

  return {
    subjects,
    subjectId,
    setSubjectId,
    books,
    bookId,
    setBookId,
    year,
    month,
    monthInputValue: `${year}-${String(month).padStart(2, "0")}`,
    setMonthInput,
  };
}
