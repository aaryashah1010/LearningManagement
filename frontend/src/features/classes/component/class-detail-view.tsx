"use client";

import Link from "next/link";
import { useState } from "react";
import { XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useTeachers } from "@/features/teachers/hooks";
import { formatDate } from "@/lib/format-date";
import {
  useAssignTeacher,
  useClassDetail,
  useClassEnrollments,
  useClasses,
  useClassTeachers,
  useRemoveEnrollment,
  useTransferEnrollment,
  useUnassignTeacher,
} from "../hooks";

function RosterRowSkeleton() {
  return <div className="h-10 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />;
}

function TeacherCard({ classId }: { classId: number }) {
  const { teachers: assigned, isLoading } = useClassTeachers(classId);
  const { teachers: allTeachers } = useTeachers();
  const { assignTeacher, isAssigning } = useAssignTeacher(classId);
  const { unassignTeacher, isUnassigning } = useUnassignTeacher(classId);
  const [showAssign, setShowAssign] = useState(false);
  const [pickerId, setPickerId] = useState<number | null>(null);

  const assignedIds = new Set(assigned.map((t) => t.id));
  const availableTeachers = allTeachers.filter((t) => !assignedIds.has(t.id));

  async function handleAssign() {
    if (!pickerId) return;
    await assignTeacher(pickerId);
    setPickerId(null);
    setShowAssign(false);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
      <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
        Teacher
      </p>

      {isLoading ? (
        <div className="h-10 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />
      ) : assigned.length === 0 ? (
        <p className="font-medium text-mark">No teacher assigned</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {assigned.map((teacher) => (
            <li key={teacher.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink dark:text-paper">{teacher.name}</p>
                <p className="text-sm text-ink/55 dark:text-paper/55">{teacher.email}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => unassignTeacher(teacher.id)}
                disabled={isUnassigning}
              >
                Unassign
              </Button>
            </li>
          ))}
        </ul>
      )}

      {showAssign ? (
        availableTeachers.length === 0 ? (
          <p className="text-sm text-ink/50 dark:text-paper/50">
            Every teacher is already assigned to this class.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={pickerId ?? ""}
              onChange={(event) => setPickerId(Number(event.target.value) || null)}
              className="flex-1 rounded-lg border-b-2 border-ink/15 bg-transparent pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
            >
              <option value="">Choose a teacher…</option>
              {availableTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button onClick={handleAssign} disabled={!pickerId || isAssigning}>
              Assign
            </Button>
          </div>
        )
      ) : (
        <Button variant="ghost" className="self-start" onClick={() => setShowAssign(true)}>
          {assigned.length > 0 ? "Assign another teacher" : "Assign a teacher"}
        </Button>
      )}
    </div>
  );
}

export function ClassDetailView({ classId }: { classId: number }) {
  const { classDetail, isLoading: isDetailLoading, error: detailError } = useClassDetail(classId);
  const { students, isLoading: isRosterLoading } = useClassEnrollments(classId);
  const { classes } = useClasses();
  const { removeEnrollment, isRemoving } = useRemoveEnrollment(classId);
  const { transferEnrollment, isTransferring } = useTransferEnrollment(classId);
  const [movingStudentId, setMovingStudentId] = useState<number | null>(null);
  const [destinationClassId, setDestinationClassId] = useState<number | null>(null);

  const otherClasses = classes.filter((c) => c.id !== classId);

  async function handleMove(studentId: number) {
    if (!destinationClassId) return;
    await transferEnrollment({ studentId, newClassId: destinationClassId });
    setMovingStudentId(null);
    setDestinationClassId(null);
  }

  if (detailError) {
    return <p className="text-sm text-mark">{detailError.message}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/admin/classes"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
      >
        <span aria-hidden>←</span> All classes
      </Link>

      {isDetailLoading || !classDetail ? (
        <div className="h-8 w-48 animate-pulse rounded bg-ink/10 dark:bg-paper/10" />
      ) : (
        <div>
          <h2 className="font-display text-3xl text-ink dark:text-paper">{classDetail.name}</h2>
          <p className="mt-1 text-sm text-ink/55 dark:text-paper/55">
            Created {formatDate(classDetail.created_at)} · {classDetail.enrollment_count} enrolled
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <TeacherCard classId={classId} />

        <div className="rounded-2xl border border-ink/10 bg-paper p-6 dark:border-paper/10 dark:bg-slate">
          <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
            Roster
          </p>

          {isRosterLoading ? (
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <RosterRowSkeleton key={i} />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="mt-4 text-sm text-ink/50 dark:text-paper/50">
              No students enrolled yet — add them from the Students page.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-ink/8 dark:divide-paper/8">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-ink dark:text-paper">{student.name}</p>
                    <p className="font-utility text-xs text-ink/45 dark:text-paper/45">
                      {student.email ?? student.phone ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {movingStudentId === student.id ? (
                      <>
                        <select
                          value={destinationClassId ?? ""}
                          onChange={(event) => setDestinationClassId(Number(event.target.value) || null)}
                          className="rounded-lg border-b-2 border-ink/15 bg-transparent pb-2 text-sm text-ink focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper"
                        >
                          <option value="">Move to…</option>
                          {otherClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          onClick={() => handleMove(student.id)}
                          disabled={!destinationClassId || isTransferring}
                        >
                          Confirm
                        </Button>
                        <button
                          type="button"
                          onClick={() => setMovingStudentId(null)}
                          aria-label="Cancel move"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/40 hover:bg-ink/5 dark:text-paper/40 dark:hover:bg-paper/10"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => setMovingStudentId(student.id)}>
                          Move
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => removeEnrollment(student.id)}
                          disabled={isRemoving}
                          className="text-mark hover:bg-mark/10"
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
