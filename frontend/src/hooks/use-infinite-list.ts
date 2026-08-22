import { useInfiniteQuery } from "@tanstack/react-query";
import type { Paginated } from "@/types/common";

// Shared cursor-pagination wrapper for every "list of things" endpoint in the
// app (classes, class enrollments, teachers, students) — they all return the
// same { data, pagination: { has_next, next_cursor } } envelope, so this is
// the one place that knows how to walk it page by page instead of each
// feature re-implementing its own infinite-scroll plumbing.
export function useInfiniteList<T>(
  queryKey: readonly unknown[],
  fetchPage: (cursor: number | null, limit: number) => Promise<Paginated<T>>,
  options?: { limit?: number; enabled?: boolean }
) {
  const limit = options?.limit ?? 20;
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam, limit),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => (lastPage.pagination.has_next ? lastPage.pagination.next_cursor : undefined),
    enabled: options?.enabled ?? true,
  });

  return {
    items: query.data?.pages.flatMap((page) => page.data) ?? [],
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
