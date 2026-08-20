import type { Role } from "@/lib/nav";

export type { Role };

interface RoleSelectProps {
  value: Role;
  onChange: (role: Role) => void;
}

const OPTIONS: {
  value: Role;
  letter: string;
  title: string;
  description: string;
}[] = [
  {
    value: "admin",
    letter: "A",
    title: "Admin",
    description: "Create teachers, students and classes",
  },
  {
    value: "teacher",
    letter: "B",
    title: "Teacher",
    description: "Manage your classes, tests and reports",
  },
  {
    value: "student",
    letter: "C",
    title: "Student",
    description: "Upload OMR sheets, check your reports",
  },
];

export function RoleSelect({ value, onChange }: RoleSelectProps) {
  return (
    <div role="radiogroup" aria-label="Sign in as" className="flex flex-col gap-3">
      {OPTIONS.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-correct has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper ${
              checked
                ? "border-correct bg-correct/[0.06]"
                : "border-ink/12 hover:border-ink/25"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 rounded-full border-2 transition-all duration-200 ${
                checked
                  ? "scale-110 border-correct bg-correct"
                  : "scale-100 border-ink/30 bg-transparent"
              }`}
            />
            <span aria-hidden className="font-utility text-xs font-semibold text-ink/35">
              {option.letter}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-ink">{option.title}</span>
              <span className="text-xs text-ink/55">{option.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
