"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BubbleField } from "@/components/auth/bubble-field";
import { RoleSelect } from "@/components/auth/role-select";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROLE_HOME } from "@/lib/nav";
import { UserRole } from "@/types/auth";
import { useLoginForm } from "../hooks/useLoginForm";

const ROLE_SUBTEXT: Record<UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT, string> = {
  [UserRole.ADMIN]: "Create accounts and set up your classes.",
  [UserRole.TEACHER]: "Manage your classes, tests and reports.",
  [UserRole.STUDENT]: "Upload today's OMR and check your weak spots.",
};

export function LoginScreen() {
  const {
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
  } = useLoginForm();

  // Already signed in — don't show the login form, send them straight to
  // their own home page instead (mirrors RoleGuard's redirect the other way).
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace(ROLE_HOME[user.role as UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT]);
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading || user) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-paper dark:bg-slate lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink bg-chalk-dust px-12 py-14 lg:flex">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-correct" />
            <span className="font-display text-lg italic text-paper">
              Tangent
            </span>
          </div>

          <p className="mt-16 font-utility text-xs font-medium uppercase tracking-[0.2em] text-paper/45">
            OMR grading · topic analytics
          </p>
          <h1 className="mt-4 max-w-md font-display text-5xl leading-[1.05] text-paper">
            Mark the sheet.
            <br />
            Meet the gap.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-paper/60">
            Every OMR upload rolls straight up the syllabus — Chapter, Topic,
            Subtopic — so you know exactly what to re-teach next, not just
            who scored what.
          </p>
        </div>

        <div className="flex items-end justify-between gap-8">
          <BubbleField />
          <p className="hidden font-utility text-[11px] leading-relaxed text-paper/35 xl:block">
            Classes 8–10
            <br />
            Maths · Science
            <br />
            Social Science · English
          </p>
        </div>
      </aside>

      <section className="bg-paper-rule relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="h-2.5 w-2.5 rounded-full bg-correct" />
            <span className="font-display text-lg italic text-ink dark:text-paper">
              Tangent
            </span>
          </div>

          <p className="font-utility text-xs font-medium uppercase tracking-[0.2em] text-mark">
            Sign in
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink dark:text-paper">
            Welcome back.
          </h2>
          <p className="mt-2 text-[15px] text-ink/60 dark:text-paper/60">{ROLE_SUBTEXT[role]}</p>

          <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
                I am signing in as
              </p>
              <RoleSelect value={role} onChange={handleRoleChange} />
            </div>

            <div className="flex flex-col gap-6">
              <FormField
                index={1}
                id="identifier"
                label={role === UserRole.STUDENT ? "Email or phone" : "Email"}
                type={role === UserRole.STUDENT ? "text" : "email"}
                placeholder={
                  role === UserRole.STUDENT ? "Email or phone number" : "you@tuition.in"
                }
                autoComplete="username"
                required
                writingCursor
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />

              <FormField
                index={2}
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                writingCursor
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                helper={
                  role === UserRole.STUDENT
                    ? "First login? Your password is your date of birth — DDMMYYYY."
                    : undefined
                }
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="shrink-0 rounded p-1 text-ink/40 transition-colors hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct dark:text-paper/40 dark:hover:text-paper/70"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-[18px] w-[18px]" />
                    ) : (
                      <EyeIcon className="h-[18px] w-[18px]" />
                    )}
                  </button>
                }
              />
            </div>

            {error && (
              <p role="alert" className="-mt-4 text-sm font-medium text-mark">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
              {!isSubmitting && <span aria-hidden>→</span>}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-ink/45 dark:text-paper/45">
            No account? Accounts are created by your class admin — there&rsquo;s
            no self-service signup or password recovery.
          </p>
        </div>
      </section>
    </div>
  );
}
