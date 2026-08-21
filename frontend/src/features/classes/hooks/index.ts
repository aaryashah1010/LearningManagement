import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignTeacher,
  createClass,
  fetchClassDetail,
  fetchClasses,
  fetchClassTeachers,
  fetchEnrollments,
  removeEnrollment,
  transferEnrollment,
  unassignTeacher,
} from "../services";

const LIST_LIMIT = 100;

export function useClasses() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => fetchClasses(null, LIST_LIMIT),
  });
  return {
    classes: data?.data ?? [],
    hasMore: data?.pagination.has_next ?? false,
    error,
    isLoading,
  };
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (name: string) => createClass(name),
    onSuccess: (created) => {
      queryClient.setQueryData(["classes"], (old: Awaited<ReturnType<typeof fetchClasses>> | undefined) =>
        old ? { ...old, data: [...old.data, created] } : old
      );
    },
  });
  return { createClass: mutateAsync, isCreating: isPending };
}

export function useClassDetail(classId: number) {
  const { data: classDetail, error, isLoading } = useQuery({
    queryKey: ["class", classId],
    queryFn: () => fetchClassDetail(classId),
    enabled: !!classId,
  });
  return { classDetail, error, isLoading };
}

export function useClassEnrollments(classId: number) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["classEnrollments", classId],
    queryFn: () => fetchEnrollments(classId, null, LIST_LIMIT),
    enabled: !!classId,
  });
  return {
    students: data?.data ?? [],
    hasMore: data?.pagination.has_next ?? false,
    error,
    isLoading,
  };
}

export function useRemoveEnrollment(classId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (studentId: number) => removeEnrollment(classId, studentId),
    onSuccess: (_, studentId) => {
      queryClient.setQueryData(
        ["classEnrollments", classId],
        (old: Awaited<ReturnType<typeof fetchEnrollments>> | undefined) =>
          old ? { ...old, data: old.data.filter((s) => s.id !== studentId) } : old
      );
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
    },
  });
  return { removeEnrollment: mutateAsync, isRemoving: isPending };
}

export function useTransferEnrollment(classId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ studentId, newClassId }: { studentId: number; newClassId: number }) =>
      transferEnrollment(classId, studentId, newClassId),
    onSuccess: (_, { studentId }) => {
      queryClient.setQueryData(
        ["classEnrollments", classId],
        (old: Awaited<ReturnType<typeof fetchEnrollments>> | undefined) =>
          old ? { ...old, data: old.data.filter((s) => s.id !== studentId) } : old
      );
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
    },
  });
  return { transferEnrollment: mutateAsync, isTransferring: isPending };
}

export function useClassTeachers(classId: number) {
  const { data: teachers, error, isLoading } = useQuery({
    queryKey: ["classTeachers", classId],
    queryFn: () => fetchClassTeachers(classId),
    enabled: !!classId,
  });
  return { teachers: teachers ?? [], error, isLoading };
}

export function useAssignTeacher(classId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (teacherId: number) => assignTeacher(classId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classTeachers", classId] });
    },
  });
  return { assignTeacher: mutateAsync, isAssigning: isPending };
}

export function useUnassignTeacher(classId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (teacherId: number) => unassignTeacher(classId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classTeachers", classId] });
    },
  });
  return { unassignTeacher: mutateAsync, isUnassigning: isPending };
}
