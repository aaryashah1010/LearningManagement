import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DraftStudentRow } from "../types";
import { enrollStudentsBulk, fetchStudents } from "../services";

const LIST_LIMIT = 100;

export function useStudents() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => fetchStudents(null, LIST_LIMIT),
  });
  return {
    students: data?.data ?? [],
    hasMore: data?.pagination.has_next ?? false,
    error,
    isLoading,
  };
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
