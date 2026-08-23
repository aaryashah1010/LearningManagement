"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInfiniteScrollSentinel } from "@/hooks/use-infinite-scroll-sentinel";
import { useTeachers } from "../hooks";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeachersTable() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const { teachers, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading } = useTeachers(true, search);
  useInfiniteScrollSentinel(fetchNextPage, hasNextPage);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search teachers…"
        className="w-full max-w-xs rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-sm text-ink placeholder:text-ink/35 focus:border-correct focus:outline-none dark:border-paper/20 dark:text-paper dark:placeholder:text-paper/35"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-ink/5 dark:bg-paper/5" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-ink/50 dark:text-paper/50">
          {search ? "No teachers match your search." : "No teachers yet — create one above."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-ink/10 dark:border-paper/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-xs uppercase tracking-wide text-ink/45 dark:border-paper/10 dark:bg-paper/[0.03] dark:text-paper/45">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-ink/8 last:border-0 dark:border-paper/8">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/8 font-utility text-xs font-medium text-ink/60 dark:bg-paper/10 dark:text-paper/70">
                          {initials(teacher.name)}
                        </span>
                        <span className="font-medium text-ink dark:text-paper">{teacher.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60">{teacher.email}</td>
                    <td className="px-5 py-3.5 text-ink/60 dark:text-paper/60 capitalize">{teacher.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasNextPage && isFetchingNextPage && (
            <div className="py-1 text-center font-utility text-xs text-ink/40 dark:text-paper/40">
              Loading more…
            </div>
          )}
        </>
      )}
    </div>
  );
}
