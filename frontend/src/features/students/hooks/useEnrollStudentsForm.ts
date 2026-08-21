"use client";

import { useState, type FormEvent } from "react";
import { useClasses } from "@/features/classes/hooks";
import { RequestError } from "@/lib/api";
import type { BulkEnrollResult, DraftStudentRow } from "../types";
import { useEnrollStudentsBulk } from "./index";

function emptyRow(): DraftStudentRow {
  return { id: crypto.randomUUID(), name: "", dateOfBirth: "", contact: "" };
}

export function useEnrollStudentsForm() {
  const { classes, isLoading: isLoadingClasses } = useClasses();
  const { enrollStudentsBulk, isEnrolling } = useEnrollStudentsBulk();

  const [classId, setClassId] = useState<number | null>(null);
  const [rows, setRows] = useState<DraftStudentRow[]>([emptyRow()]);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedClassId = classId ?? classes.at(0)?.id ?? null;

  function updateRow(id: string, field: keyof Omit<DraftStudentRow, "id">, value: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClassId) return;
    setError(null);
    try {
      const response = await enrollStudentsBulk({ classId: selectedClassId, rows });
      setResult(response);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not enroll these students.");
    }
  }

  function startNewBatch() {
    setRows([emptyRow()]);
    setResult(null);
    setError(null);
  }

  return {
    classes,
    isLoadingClasses,
    selectedClassId,
    setClassId,
    rows,
    result,
    error,
    isEnrolling,
    updateRow,
    addRow,
    removeRow,
    handleSubmit,
    startNewBatch,
  };
}
