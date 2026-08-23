"use client";

import { CheckIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useCreateTeacherForm } from "../hooks/useCreateTeacherForm";

export function CreateTeacherForm() {
  const {
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
  } = useCreateTeacherForm();

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
        Admin-only. Each teacher gets their password set directly here — unlike students,
        there&rsquo;s no default-password flow for teacher accounts.
      </p>

      {lastCreated && (
        <div className="flex items-center gap-3 rounded-xl border border-chart-green/30 bg-chart-green/[0.06] px-4 py-3 text-sm text-ink dark:text-paper">
          <CheckIcon className="h-4 w-4 shrink-0 text-chart-green" />
          <span>
            <strong className="font-semibold">{lastCreated.name}</strong> created — {lastCreated.email}
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex max-w-lg flex-col gap-6 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate"
      >
        <FormField
          index={1}
          id="teacher-name"
          label="Full name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Priya Nair"
        />
        <FormField
          index={2}
          id="teacher-email"
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="priya.nair@tuition.in"
        />
        <FormField
          index={3}
          id="teacher-password"
          label="Password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          helper="Set directly — communicate it to the teacher yourself."
          error={error ?? undefined}
        />
        <Button type="submit" className="self-start" disabled={isCreating}>
          {isCreating ? "Creating…" : "Create teacher"}
        </Button>
      </form>
    </div>
  );
}
