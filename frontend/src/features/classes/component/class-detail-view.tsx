"use client";

import Link from "next/link";
import { useState } from "react";
import { XIcon } from "@/components/icons";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTeachers } from "@/features/teachers/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel";
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
  const { user } = useAuth();
  // Assign/unassign (POST|DELETE /api/classes/{id}/teachers) are admin-only
  // — a teacher viewing their own class sees this card read-only.
  const canManage = user?.role === "admin";

  const { teachers: assigned, isLoading } = useClassTeachers(classId);
  const [teacherSearchInput, setTeacherSearchInput] = useState("");
  const teacherSearch = useDebouncedValue(teacherSearchInput);
  const {
    teachers: allTeachers,
    isLoading: isTeachersLoading,
    isFetchingNextPage: isFetchingMoreTeachers,
    hasNextPage: hasMoreTeachers,
    fetchNextPage: fetchMoreTeachers,
  } = useTeachers(canManage, teacherSearch);
  const { assignTeacher, isAssigning } = useAssignTeacher(classId);
  const { unassignTeacher, isUnassigning } = useUnassignTeacher(classId);
  const [showAssign, setShowAssign] = useState(false);
  const [picked, setPicked] = useState<{ id: number; label: string } | null>(null);

  const assignedIds = new Set(assigned.map((t) => t.id));
  const availableTeachers = allTeachers.filter((t) => !assignedIds.has(t.id));

  async function handleAssign() {
    if (!picked) return;
    await assignTeacher(picked.id);
    setPicked(null);
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
              {canManage && (
                <Button
                  variant="ghost"
                  onClick={() => unassignTeacher(teacher.id)}
                  disabled={isUnassigning}
                >
                  Unassign
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!canManage ? null : showAssign ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Combobox
              value={picked?.id ?? null}
              onChange={(id) => {
                const item = availableTeachers.find((t) => t.id === id);
                if (item) setPicked({ id: item.id, label: item.name });
              }}
              items={availableTeachers.map((t) => ({ id: t.id, label: t.name, sublabel: t.email }))}
              search={teacherSearchInput}
              onSearchChange={setTeacherSearchInput}
              isLoading={isTeachersLoading}
              isFetchingNextPage={isFetchingMoreTeachers}
              hasNextPage={hasMoreTeachers}
              onLoadMore={fetchMoreTeachers}
              placeholder="Search teachers…"
              selectedLabel={picked?.label ?? null}
            />
          </div>
          <Button onClick={handleAssign} disabled={!picked || isAssigning}>
            Assign
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className="self-start" onClick={() => setShowAssign(true)}>
          {assigned.length > 0 ? "Assign another teacher" : "Assign a teacher"}
        </Button>
      )}
    </div>
  );
}

function MoveToClassPicker({
  currentClassId,
  onConfirm,
  onCancel,
  isTransferring,
}: {
  currentClassId: number;
  onConfirm: (newClassId: number) => void;
  onCancel: () => void;
  isTransferring: boolean;
}) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const { classes, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useClasses(search);
  const otherClasses = classes.filter((c) => c.id !== currentClassId);
  const [picked, setPicked] = useState<{ id: number; label: string } | null>(null);

  return (
    <>
      <div className="w-48">
        <Combobox
          value={picked?.id ?? null}
          onChange={(id) => {
            const item = otherClasses.find((c) => c.id === id);
            if (item) setPicked({ id: item.id, label: item.name });
          }}
          items={otherClasses.map((c) => ({ id: c.id, label: c.name }))}
          search={searchInput}
          onSearchChange={setSearchInput}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onLoadMore={fetchNextPage}
          placeholder="Move to…"
          selectedLabel={picked?.label ?? null}
        />
      </div>
      <Button
        variant="ghost"
        onClick={() => picked && onConfirm(picked.id)}
        disabled={!picked || isTransferring}
      >
        Confirm
      </Button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel move"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink/40 hover:bg-ink/5 dark:text-paper/40 dark:hover:bg-paper/10"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </>
  );
}

export function ClassDetailView({ classId, basePath }: { classId: number; basePath: string }) {
  const { user } = useAuth();
  const { classDetail, isLoading: isDetailLoading, error: detailError } = useClassDetail(classId);
  const [rosterSearchInput, setRosterSearchInput] = useState("");
  const rosterSearch = useDebouncedValue(rosterSearchInput);
  const {
    students,
    isLoading: isRosterLoading,
    isFetchingNextPage: isFetchingMoreStudents,
    hasNextPage: hasMoreStudents,
    fetchNextPage: fetchMoreStudents,
  } = useClassEnrollments(classId, rosterSearch);
  useInfiniteScrollSentinel(fetchMoreStudents, hasMoreStudents);
  const { removeEnrollment, isRemoving } = useRemoveEnrollment(classId);
  const { transferEnrollment, isTransferring } = useTransferEnrollment(classId);
  const [movingStudentId, setMovingStudentId] = useState<number | null>(null);

  async function handleMove(studentId: number, newClassId: number) {
    await transferEnrollment({ studentId, newClassId });
    setMovingStudentId(null);
  }

  if (detailError) {
    return <p className="text-sm text-mark">{detailError.message}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={basePath}
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
          <div className="flex items-center justify-between gap-3">
            <p className="font-utility text-xs font-medium uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
              Roster
            </p>
            <input
              type="text"
              value={rosterSearchInput}
              onChange={(e) => setRosterSearchInput(e.target.value)}
              placeholder="Search roster…"
              className="w-40 rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-1.5 text-sm text-ink placeholder:text-ink/35 focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper dark:placeholder:text-paper/35"
            />
          </div>

          {isRosterLoading ? (
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <RosterRowSkeleton key={i} />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="mt-4 text-sm text-ink/50 dark:text-paper/50">
              {rosterSearch
                ? "No students match your search."
                : user?.role === "admin"
                  ? "No students enrolled yet — add them from the Students page."
                  : "No students enrolled yet."}
            </p>
          ) : (
            <>
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
                        <MoveToClassPicker
                          currentClassId={classId}
                          onConfirm={(newClassId) => handleMove(student.id, newClassId)}
                          onCancel={() => setMovingStudentId(null)}
                          isTransferring={isTransferring}
                        />
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
              {hasMoreStudents && isFetchingMoreStudents && (
                <div className="pt-2 text-center font-utility text-xs text-ink/40 dark:text-paper/40">
                  Loading more…
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
