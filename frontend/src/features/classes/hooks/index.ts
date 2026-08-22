import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInfiniteList } from "@/hooks/use-infinite-list";
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

export function useClasses(search = "") {
  const { items, ...rest } = useInfiniteList(["classes", search], (cursor, limit) =>
    fetchClasses(cursor, limit, search)
  );
  return { classes: items, ...rest };
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (name: string) => createClass(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
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

export function useClassEnrollments(classId: number, search = "") {
  const { items, ...rest } = useInfiniteList(
    ["classEnrollments", classId, search],
    (cursor, limit) => fetchEnrollments(classId, cursor, limit, search),
    { enabled: !!classId }
  );
  return { students: items, ...rest };
}

export function useRemoveEnrollment(classId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (studentId: number) => removeEnrollment(classId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classEnrollments", classId] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classEnrollments", classId] });
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
