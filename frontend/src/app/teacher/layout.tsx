import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";
import { UserRole } from "@/types/auth";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={UserRole.TEACHER}>
      <AppShell role={UserRole.TEACHER}>{children}</AppShell>
    </RoleGuard>
  );
}
