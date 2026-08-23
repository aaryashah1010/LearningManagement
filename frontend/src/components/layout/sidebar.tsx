"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { NAV_ITEMS_BY_ROLE, ROLE_HOME } from "@/lib/nav";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSidebarCollapsed, toggleSidebarCollapsed } from "@/store/slices/uiSlice";
import { UserRole } from "@/types/auth";
import { ChevronIcon, LogoutIcon } from "@/components/icons";
import { NavItem } from "./nav-item";

type ShellRole = UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT;

// Matches Tailwind's `md` breakpoint — below it the full-width sidebar leaves
// too little room for page content, so it auto-collapses to the icon rail.
const AUTO_COLLAPSE_QUERY = "(max-width: 767px)";

export function Sidebar({ role }: { role: ShellRole }) {
  const router = useRouter();
  const { logout } = useAuth();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const navItems = NAV_ITEMS_BY_ROLE[role];
  const homeHref = ROLE_HOME[role];

  useEffect(() => {
    const mql = window.matchMedia(AUTO_COLLAPSE_QUERY);
    const sync = (e: MediaQueryList | MediaQueryListEvent) => dispatch(setSidebarCollapsed(e.matches));
    sync(mql);
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [dispatch]);

  function handleLogout() {
    logout();
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
          onClick={() => dispatch(toggleSidebarCollapsed())}
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
