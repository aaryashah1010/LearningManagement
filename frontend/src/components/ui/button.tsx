import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-body text-sm font-semibold tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "bg-correct text-ink hover:bg-correct-dark active:scale-[0.98] focus-visible:ring-correct focus-visible:ring-offset-paper dark:focus-visible:ring-offset-slate shadow-[0_1px_0_0_rgba(30,42,47,0.15)]",
    ghost:
      "bg-transparent text-ink hover:bg-ink/5 focus-visible:ring-ink/30 focus-visible:ring-offset-paper dark:text-paper dark:hover:bg-paper/10 dark:focus-visible:ring-paper/30 dark:focus-visible:ring-offset-slate",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
