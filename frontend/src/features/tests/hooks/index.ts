import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createQuestionsBulk,
  createTest,
  fetchBooks,
  fetchCurriculum,
  fetchQuestions,
  fetchStudentTests,
  fetchSubjects,
  fetchTest,
  fetchTestsForClass,
  publishTest,
  setQuestionNode,
  uploadQuestionPaper,
} from "../services";
import type { CurriculumChapter, CurriculumNodeOption, NewQuestionInput, TestSetupPath } from "../types";

const CURRICULUM_STALE_TIME = 6 * 60 * 60 * 1000; // curriculum taxonomy rarely changes

export function useSubjects() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
    staleTime: CURRICULUM_STALE_TIME,
  });
  return { subjects: data ?? [], error, isLoading };
}

export function useBooks(subjectId: number | null) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["books", subjectId],
    queryFn: () => fetchBooks(subjectId as number),
    enabled: !!subjectId,
    staleTime: CURRICULUM_STALE_TIME,
  });
  return { books: data ?? [], error, isLoading };
}

function flattenCurriculum(chapters: CurriculumChapter[]): CurriculumNodeOption[] {
  const options: CurriculumNodeOption[] = [];
  for (const chapter of chapters) {
    options.push({ id: chapter.id, path: chapter.name });
    for (const topic of chapter.topics) {
      const topicPath = `${chapter.name} > ${topic.name}`;
      options.push({ id: topic.id, path: topicPath });
      for (const subtopic of topic.subtopics) {
        options.push({ id: subtopic.id, path: `${topicPath} > ${subtopic.name}` });
      }
    }
  }
  return options;
}

export function useCurriculumOptions(bookId: number | null) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["curriculum", bookId],
    queryFn: () => fetchCurriculum(bookId as number),
    enabled: !!bookId,
    staleTime: CURRICULUM_STALE_TIME,
  });
  return { nodes: data ? flattenCurriculum(data) : [], error, isLoading };
}

export function useTestsForClass(classId: number | null) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["tests", classId],
    queryFn: () => fetchTestsForClass(classId as number),
    enabled: !!classId,
  });
  return { tests: data ?? [], error, isLoading };
}

export function useTest(testId: number) {
  const { data: test, error, isLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: () => fetchTest(testId),
    enabled: !!testId,
  });
  return { test, error, isLoading };
}

export function useCreateTest(classId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ bookId, title, setupPath }: { bookId: number; title: string; setupPath: TestSetupPath }) =>
      createTest(classId, bookId, title, setupPath),
    onSuccess: (created) => {
      queryClient.setQueryData(["tests", classId], (old: Awaited<ReturnType<typeof fetchTestsForClass>> = []) => [
        ...old,
        created,
      ]);
    },
  });
  return { createTest: mutateAsync, isCreating: isPending };
}

export function useUploadQuestionPaper(testId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (file: File) => uploadQuestionPaper(testId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", testId] });
    },
  });
  return { uploadQuestionPaper: mutateAsync, isUploading: isPending };
}

export function useCreateQuestionsBulk(testId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (questions: NewQuestionInput[]) => createQuestionsBulk(testId, questions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions", testId] });
    },
  });
  return { createQuestionsBulk: mutateAsync, isCreating: isPending };
}

export function useQuestions(testId: number) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["questions", testId],
    queryFn: () => fetchQuestions(testId),
    enabled: !!testId,
  });
  return { questions: data ?? [], error, isLoading };
}

export function useSetQuestionNode(testId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ questionId, nodeId, path }: { questionId: number; nodeId: number; path: string }) =>
      setQuestionNode(testId, questionId, nodeId).then(() => ({ questionId, nodeId, path })),
    onSuccess: ({ questionId, nodeId, path }) => {
      queryClient.setQueryData(
        ["questions", testId],
        (old: Awaited<ReturnType<typeof fetchQuestions>> = []) =>
          old.map((q) => (q.id === questionId ? { ...q, node: { id: nodeId, path } } : q))
      );
    },
  });
  return { setQuestionNode: mutateAsync, isSettingNode: isPending };
}

export function useStudentTests(studentId: number) {
  const { data, error, isLoading } = useQuery({
    queryKey: ["studentTests", studentId],
    queryFn: () => fetchStudentTests(studentId),
    enabled: !!studentId,
  });
  return { tests: data ?? [], error, isLoading };
}

export function usePublishTest(testId: number) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => publishTest(testId),
    onSuccess: () => {
      queryClient.setQueryData(["test", testId], (old: Awaited<ReturnType<typeof fetchTest>> | undefined) =>
        old ? { ...old, published_at: new Date().toISOString() } : old
      );
    },
  });
  return { publishTest: mutateAsync, isPublishing: isPending };
}
