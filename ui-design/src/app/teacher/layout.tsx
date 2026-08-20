import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <AppShell role="teacher">{children}</AppShell>;
}
