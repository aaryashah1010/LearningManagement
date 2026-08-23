"use client";

import { useState } from "react";
import { RequestError } from "@/lib/api";
import { useCreateQuestionsBulk } from "./index";
import type { NewQuestionInput } from "../types";

const EMPTY_ROW: NewQuestionInput = {
  question_number: 1,
  question_text: "",
  correct_option: "A",
  max_marks: 1,
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
};

export function useInAppQuestionsForm(testId: number) {
  const [rows, setRows] = useState<NewQuestionInput[]>([{ ...EMPTY_ROW }]);
  const [error, setError] = useState<string | null>(null);
  const { createQuestionsBulk, isCreating } = useCreateQuestionsBulk(testId);

  function updateRow(index: number, field: keyof NewQuestionInput, value: string | number) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW, question_number: prev.length + 1 }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    try {
      await createQuestionsBulk(rows);
      setRows([{ ...EMPTY_ROW }]);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not save the questions.");
    }
  }

  return { rows, updateRow, addRow, removeRow, error, isCreating, handleSubmit };
}
