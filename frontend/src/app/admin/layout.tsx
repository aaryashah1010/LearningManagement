import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/components/layout/role-guard";
import { UserRole } from "@/types/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={UserRole.ADMIN}>
      <AppShell role={UserRole.ADMIN}>{children}</AppShell>
    </RoleGuard>
  );
}
