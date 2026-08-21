"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROLE_HOME } from "@/lib/nav";
import { UserRole } from "@/types/auth";

type ShellRole = UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT;

interface RoleGuardProps {
  role: ShellRole;
  children: ReactNode;
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(ROLE_HOME[user.role as ShellRole]);
    }
  }, [isLoading, user, role, router]);

  if (isLoading || !user || user.role !== role) return null;

  return <>{children}</>;
}
