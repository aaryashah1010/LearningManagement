import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <AppShell role="student">{children}</AppShell>;
}
