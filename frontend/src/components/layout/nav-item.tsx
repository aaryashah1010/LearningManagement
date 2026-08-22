"use client";

import { animate } from "animejs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import type { NavItemConfig } from "@/lib/nav";

interface NavItemProps extends NavItemConfig {
  collapsed: boolean;
}

export function NavItem({ href, label, icon: Icon, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const iconRef = useRef<HTMLSpanElement>(null);

  function handleEnter() {
    if (!iconRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(iconRef.current, {
      scale: [1, 1.22, 1],
      rotate: [0, -8, 0],
      duration: 420,
      ease: "outBack",
    });
  }

  return (
    <Link
      href={href}
      onMouseEnter={handleEnter}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
        active ? "text-paper" : "text-paper/55 hover:text-paper/90"
      }`}
    >
      <span
        ref={iconRef}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
          active
            ? "bg-correct/20 text-correct"
            : "bg-transparent text-paper/70 group-hover:bg-paper/10 group-hover:text-paper"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full border transition-colors duration-150 ${
              active
                ? "border-correct bg-correct"
                : "border-paper/20 bg-transparent"
            }`}
          />
        </>
      )}

      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 font-body text-xs font-medium text-paper opacity-0 shadow-lg ring-1 ring-paper/10 transition-opacity duration-150 group-hover:opacity-100"
        >
          {label}
        </span>
      )}
    </Link>
  );
}
