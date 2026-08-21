import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTeacher, fetchTeachers } from "../services";

const LIST_LIMIT = 100;

export function useTeachers() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => fetchTeachers(null, LIST_LIMIT),
  });
  return {
    teachers: data?.data ?? [],
    hasMore: data?.pagination.has_next ?? false,
    error,
    isLoading,
  };
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) =>
      createTeacher(name, email, password),
    onSuccess: (created) => {
      queryClient.setQueryData(["teachers"], (old: Awaited<ReturnType<typeof fetchTeachers>> | undefined) =>
        old ? { ...old, data: [...old.data, created] } : old
      );
    },
  });
  return { createTeacher: mutateAsync, isCreating: isPending };
}
