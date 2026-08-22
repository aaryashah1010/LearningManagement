"use client";

import { useState, type FormEvent } from "react";
import { RequestError } from "@/lib/api";
import type { TeacherView } from "@/types/common";
import { useCreateTeacher } from "./index";

export function useCreateTeacherForm() {
  const { createTeacher, isCreating } = useCreateTeacher();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<TeacherView | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const teacher = await createTeacher({ name, email, password });
      setLastCreated(teacher);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not create the teacher.");
    }
  }

  return {
    name,
    email,
    password,
    error,
    lastCreated,
    isCreating,
    setName,
    setEmail,
    setPassword,
    handleSubmit,
  };
}
