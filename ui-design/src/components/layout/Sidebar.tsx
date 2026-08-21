"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronIcon, LogoutIcon } from "@/components/icons";
import { NAV_ITEMS_BY_ROLE, ROLE_HOME, type Role } from "@/lib/nav";
import { NavItem } from "./NavItem";

const STORAGE_KEY = "tangent-sidebar-collapsed";

export function Sidebar({ role }: { role: Role }) {
  const router = useRouter();
  const navItems = NAV_ITEMS_BY_ROLE[role];
  const homeHref = ROLE_HOME[role];
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // One-time client-only hydration from localStorage — can't read it during
    // SSR, so this can't be a lazy useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function handleLogout() {
    // No backend wired yet — this just routes back to the sign-in screen.
    router.push("/login");
  }

  return (
    <aside
      className={`bg-chalk-dust flex h-dvh shrink-0 flex-col justify-between border-r border-paper/10 bg-ink transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex flex-col gap-8 overflow-hidden px-4 py-6">
        <Link
          href={homeHref}
          className="flex items-center gap-2 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-correct" />
          {!collapsed && (
            <span className="font-display text-lg italic text-paper">
              Tangent
            </span>
          )}
        </Link>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-paper/10 px-4 py-4">
        {!collapsed && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-paper/55 transition-colors hover:bg-paper/10 hover:text-paper/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <LogoutIcon className="h-[18px] w-[18px]" />
            </span>
            <span>Log out</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-pressed={collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : undefined}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-paper/55 transition-colors hover:bg-paper/10 hover:text-paper/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <ChevronIcon
              className={`h-[18px] w-[18px] transition-transform duration-200 ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
