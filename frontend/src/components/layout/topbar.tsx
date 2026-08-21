"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS_BY_ROLE } from "@/lib/nav";
import { UserRole } from "@/types/auth";
import { ThemeToggle } from "./theme-toggle";

type ShellRole = UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT;

export function Topbar({ role }: { role: ShellRole }) {
  const pathname = usePathname();
  const navItems = NAV_ITEMS_BY_ROLE[role];
  const current = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink/8 px-8 dark:border-paper/10">
      <h1 className="font-display text-lg text-ink dark:text-paper">
        {current?.label ?? "Tangent"}
      </h1>
      <ThemeToggle />
    </header>
  );
}
