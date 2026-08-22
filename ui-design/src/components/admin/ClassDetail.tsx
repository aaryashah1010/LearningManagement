"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { MockClass, MockTeacher } from "@/lib/mock-data";

const ROSTER_PREVIEW_COUNT = 6;

export function ClassDetail({
  cls,
  teachers,
}: {
  cls: MockClass;
  teachers: MockTeacher[];
}) {
  const [teacherId, setTeacherId] = useState(cls.teacherId);
  const [showAssign, setShowAssign] = useState(false);
  const [pickerValue, setPickerValue] = useState(teachers[0]?.id ?? "");

  const assignedTeacher = teachers.find((t) => t.id === teacherId) ?? null;
  const hiddenCount = Math.max(0, cls.enrolled - Math.min(cls.roster.length, ROSTER_PREVIEW_COUNT));

  function handleAssign() {
    setTeacherId(pickerValue);
    setShowAssign(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin/classes"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
      >
        <span aria-hidden>←</span> All classes
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <div>
            <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
              Teacher
            </p>
            {assignedTeacher ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink dark:text-paper">
                    {assignedTeacher.name}
                  </p>
                  <p className="text-sm text-ink/55 dark:text-paper/55">
                    {assignedTeacher.email}
                  </p>
                </div>
                <Button variant="ghost" onClick={() => setTeacherId(null)}>
                  Unassign
                </Button>
              </div>
            ) : (
              <p className="mt-2 font-medium text-mark">No teacher assigned</p>
            )}
          </div>

          {showAssign ? (
            <div className="flex items-center gap-2">
              <select
                value={pickerValue}
                onChange={(event) => setPickerValue(event.target.value)}
                className="flex-1 rounded-lg border-b-2 border-ink/15 bg-transparent pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <Button onClick={handleAssign}>Assign</Button>
            </div>
          ) : (
            <Button variant="ghost" className="self-start" onClick={() => setShowAssign(true)}>
              {assignedTeacher ? "Reassign" : "Assign a teacher"}
            </Button>
          )}
        </div>

        <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <div className="flex items-baseline justify-between">
            <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
              Roster
            </p>
            <p className="text-sm text-ink/50 dark:text-paper/50">
              {cls.enrolled} enrolled
            </p>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {cls.roster.slice(0, ROSTER_PREVIEW_COUNT).map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink dark:text-paper">{student.name}</span>
                <span className="font-utility text-xs text-ink/45 dark:text-paper/45">
                  {student.contact}
                </span>
              </li>
            ))}
          </ul>

          {hiddenCount > 0 && (
            <p className="mt-4 font-utility text-xs text-ink/40 dark:text-paper/40">
              +{hiddenCount} more — paginated via the roster endpoint
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
