"use client";

import { useState, type FormEvent } from "react";
import { RequestError } from "@/lib/api";
import { useCreateClass } from "./index";

export function useCreateClassForm() {
  const { createClass, isCreating } = useCreateClass();
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await createClass(name);
      setJustCreated(name);
      setName("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Could not create the class.");
    }
  }

  return {
    name,
    setName,
    showForm,
    setShowForm,
    error,
    justCreated,
    isCreating,
    handleSubmit,
  };
}
