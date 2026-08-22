"use client";

import { useState, type FormEvent } from "react";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { classesForTeacher, MOCK_TEACHERS, type MockTeacher } from "@/lib/mock-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<MockTeacher[]>(MOCK_TEACHERS);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeachers((prev) => [...prev, { id: `t-${Date.now()}`, name, email }]);
    setName("");
    setEmail("");
    setPassword("");
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-ink/60 dark:text-paper/60">
          Admin-only. Each teacher gets their password set directly here — unlike
          students, there&rsquo;s no default-password flow for teacher accounts.
        </p>
        <Button onClick={() => setShowForm((v) => !v)} className="shrink-0">
          <PlusIcon
            className={`h-4 w-4 transition-transform duration-200 ${showForm ? "rotate-45" : ""}`}
          />
          {showForm ? "Cancel" : "Add teacher"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex max-w-lg flex-col gap-6 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate"
        >
          <FormField
            index={1}
            id="teacher-name"
            label="Full name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Priya Nair"
          />
          <FormField
            index={2}
            id="teacher-email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="priya.nair@tuition.in"
          />
          <FormField
            index={3}
            id="teacher-password"
            label="Password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helper="Set directly — communicate it to the teacher yourself."
          />
          <Button type="submit" className="self-start">
            Create teacher
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Assigned classes</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => {
              const assigned = classesForTeacher(teacher.id);
              return (
                <tr
                  key={teacher.id}
                  className="border-b border-ink/8 last:border-0 dark:border-paper/8"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/8 font-utility text-xs font-medium text-ink/60 dark:bg-paper/10 dark:text-paper/70">
                        {initials(teacher.name)}
                      </span>
                      <span className="font-medium text-ink dark:text-paper">
                        {teacher.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60">
                    {teacher.email}
                  </td>
                  <td className="px-5 py-3.5">
                    {assigned.length === 0 ? (
                      <span className="font-medium text-mark">Unassigned</span>
                    ) : (
                      <span className="text-ink/60 dark:text-paper/60">
                        {assigned.map((c) => c.name).join(", ")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
