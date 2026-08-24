import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";
import { UserRole } from "@/types/auth";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={UserRole.STUDENT}>
      <AppShell role={UserRole.STUDENT}>{children}</AppShell>
    </RoleGuard>
  );
}
