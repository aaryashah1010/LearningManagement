import { useQuery } from "@tanstack/react-query";
import { fetchAdminStats, fetchTeacherStats } from "../services";

export function useAdminStats() {
  const { data: stats, error, isLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => fetchAdminStats(),
  });
  return { stats, error, isLoading };
}

export function useTeacherStats() {
  const { data: stats, error, isLoading } = useQuery({
    queryKey: ["teacherStats"],
    queryFn: () => fetchTeacherStats(),
  });
  return { stats, error, isLoading };
}
