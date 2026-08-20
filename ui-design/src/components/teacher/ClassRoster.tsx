"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { MockClass, MockStudent } from "@/lib/mock-data";

export function ClassRoster({
  cls,
  otherClasses,
}: {
  cls: MockClass;
  otherClasses: MockClass[];
}) {
  const [roster, setRoster] = useState<MockStudent[]>(cls.roster);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [targetClassId, setTargetClassId] = useState(otherClasses[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);

  function removeStudent(student: MockStudent) {
    setRoster((prev) => prev.filter((s) => s.id !== student.id));
    setNotice(`${student.name} removed from ${cls.name}`);
  }

  function confirmTransfer(student: MockStudent) {
    const target = otherClasses.find((c) => c.id === targetClassId);
    setRoster((prev) => prev.filter((s) => s.id !== student.id));
    setTransferringId(null);
    setNotice(`${student.name} moved to ${target?.name ?? "another class"}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg text-ink dark:text-paper">Roster</h3>
        <p className="text-sm text-ink/50 dark:text-paper/50">{roster.length} enrolled</p>
      </div>

      {notice && (
        <p className="rounded-lg bg-chart-green/10 px-3 py-2 text-sm text-ink dark:text-paper">
          {notice}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
        {roster.map((student) => (
          <li key={student.id} className="flex flex-col gap-2 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink dark:text-paper">{student.name}</p>
                <p className="font-utility text-xs text-ink/45 dark:text-paper/45">
                  {student.contact}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {otherClasses.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setTransferringId((id) => (id === student.id ? null : student.id))
                    }
                  >
                    Transfer
                  </Button>
                )}
                <Button variant="ghost" onClick={() => removeStudent(student)}>
                  Remove
                </Button>
              </div>
            </div>

            {transferringId === student.id && (
              <div className="flex items-center gap-2 rounded-lg bg-ink/[0.03] p-2 dark:bg-paper/[0.05]">
                <select
                  value={targetClassId}
                  onChange={(event) => setTargetClassId(event.target.value)}
                  className="flex-1 rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1.5 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
                >
                  {otherClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button onClick={() => confirmTransfer(student)}>Move</Button>
              </div>
            )}
          </li>
        ))}

        {roster.length === 0 && (
          <li className="py-6 text-center text-sm text-ink/45 dark:text-paper/45">
            No students left on this roster.
          </li>
        )}
      </ul>
    </div>
  );
}
