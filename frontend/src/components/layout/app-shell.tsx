import type { ReactNode } from "react";
import type { UserRole } from "@/types/auth";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type ShellRole = UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT;

interface AppShellProps {
  children: ReactNode;
  role: ShellRole;
}

export function AppShell({ children, role }: AppShellProps) {
  return (
    <div className="flex min-h-dvh bg-paper text-ink dark:bg-slate dark:text-paper">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} />
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
