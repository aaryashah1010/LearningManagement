import { UserRole } from "@/types/auth";

type SelectableRole = UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT;

interface RoleSelectProps {
  value: SelectableRole;
  onChange: (role: SelectableRole) => void;
}

const OPTIONS: {
  value: SelectableRole;
  letter: string;
  title: string;
  description: string;
}[] = [
  {
    value: UserRole.ADMIN,
    letter: "A",
    title: "Admin",
    description: "Create teachers, students and classes",
  },
  {
    value: UserRole.TEACHER,
    letter: "B",
    title: "Teacher",
    description: "Manage your classes, tests and reports",
  },
  {
    value: UserRole.STUDENT,
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
            className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-correct has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper dark:has-[:focus-visible]:ring-offset-slate ${
              checked
                ? "border-correct bg-correct/[0.06]"
                : "border-ink/12 hover:border-ink/25 dark:border-paper/15 dark:hover:border-paper/30"
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
                  : "scale-100 border-ink/30 bg-transparent dark:border-paper/30"
              }`}
            />
            <span aria-hidden className="font-utility text-xs font-semibold text-ink/35 dark:text-paper/35">
              {option.letter}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-ink dark:text-paper">{option.title}</span>
              <span className="text-xs text-ink/55 dark:text-paper/55">{option.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
