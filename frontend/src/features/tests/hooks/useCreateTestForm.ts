"use client";

import { useState, type FormEvent } from "react";
import { RequestError } from "@/lib/api";
import { useBooks, useCreateTest, useSubjects } from "./index";
import type { TestSetupPath } from "../types";

export function useCreateTestForm(classId: number | null) {
  const { subjects } = useSubjects();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const { books } = useBooks(subjectId);
  const [bookId, setBookId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [setupPath, setSetupPath] = useState<TestSetupPath>("uploaded_pdf");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<number | null>(null);

  const { createTest, isCreating } = useCreateTest(classId ?? 0);

  function handleSubjectChange(value: number | null) {
    setSubjectId(value);
    setBookId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!classId || !bookId || !title.trim()) {
      setError("Choose a book and enter a title.");
      return;
    }
    try {
      const created = await createTest({ bookId, title: title.trim(), setupPath });
      setJustCreated(created.id);
      setTitle("");
      setSubjectId(null);
      setBookId(null);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not create the test.");
    }
  }

  return {
    subjects,
    subjectId,
    setSubjectId: handleSubjectChange,
    books,
    bookId,
    setBookId,
    title,
    setTitle,
    setupPath,
    setSetupPath,
    showForm,
    setShowForm,
    error,
    justCreated,
    isCreating,
    handleSubmit,
  };
}
