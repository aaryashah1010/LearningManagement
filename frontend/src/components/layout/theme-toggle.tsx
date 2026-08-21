"use client";

import { animate } from "animejs";
import { useEffect, useRef, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

const STORAGE_KEY = "tangent-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // One-time client-only read of the class the inline theme script set
    // before hydration — can't know this during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");

    if (
      iconRef.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      animate(iconRef.current, {
        rotate: [0, next ? -140 : 140],
        scale: [1, 0.4, 1],
        duration: 420,
        ease: "inOutQuad",
      });
    }
  }

  if (!mounted) {
    return <div className="h-10 w-10" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/12 text-ink/70 transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-correct focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:border-paper/15 dark:text-paper/70 dark:hover:bg-paper/10 dark:focus-visible:ring-offset-slate"
    >
      <span ref={iconRef} className="flex">
        {dark ? (
          <SunIcon className="h-[18px] w-[18px]" />
        ) : (
          <MoonIcon className="h-[18px] w-[18px]" />
        )}
      </span>
    </button>
  );
}
