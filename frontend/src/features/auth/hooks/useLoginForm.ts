"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RequestError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/nav";
import { UserRole } from "@/types/auth";
import { useAuth } from "./useAuth";

type SelectableRole = UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT;

export function useLoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<SelectableRole>(UserRole.TEACHER);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleRoleChange(next: SelectableRole) {
    setRole(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login({ userType: role, identifier, password });
      router.push(ROLE_HOME[user.role as SelectableRole]);
    } catch (err) {
      setError(err instanceof RequestError ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return {
    role,
    identifier,
    password,
    showPassword,
    error,
    isSubmitting,
    setIdentifier,
    setPassword,
    setShowPassword,
    handleRoleChange,
    handleSubmit,
  };
}
