import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import type { DraftStudentRow } from "../types";
import { enrollStudentsBulk, fetchStudents } from "../services";

export function useStudents(search = "") {
  const { items, ...rest } = useInfiniteList(["students", search], (cursor, limit) =>
    fetchStudents(cursor, limit, search)
  );
  return { students: items, ...rest };
}

export function useEnrollStudentsBulk() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ classId, rows }: { classId: number; rows: DraftStudentRow[] }) =>
      enrollStudentsBulk(classId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
  return { enrollStudentsBulk: mutateAsync, isEnrolling: isPending };
}
