import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { createTeacher, fetchTeachers } from "../services";

export function useTeachers(enabled = true, search = "") {
  const { items, ...rest } = useInfiniteList(
    ["teachers", search],
    (cursor, limit) => fetchTeachers(cursor, limit, search),
    { enabled }
  );
  return { teachers: items, ...rest };
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) =>
      createTeacher(name, email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
  return { createTeacher: mutateAsync, isCreating: isPending };
}
