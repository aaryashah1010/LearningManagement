import { apiClient } from "@/lib/api";
import {
  CurriculumChapterSchema,
  NcertBookSchema,
  QuestionPaperUploadResultSchema,
  QuestionSchema,
  QuestionWithNodeSchema,
  StudentTestSummarySchema,
  SubjectSchema,
  TestSchema,
  type CurriculumChapter,
  type NcertBook,
  type NewQuestionInput,
  type Question,
  type QuestionPaperUploadResult,
  type QuestionWithNode,
  type StudentTestSummary,
  type Subject,
  type Test,
  type TestSetupPath,
} from "../types";

export async function fetchSubjects(): Promise<Subject[]> {
  const result = await apiClient.get<Subject[]>("/subjects/");
  return result.map((s) => SubjectSchema.parse(s));
}

export async function fetchBooks(subjectId: number): Promise<NcertBook[]> {
  const result = await apiClient.get<NcertBook[]>(`/subjects/${subjectId}/books`);
  return result.map((b) => NcertBookSchema.parse(b));
}

export async function fetchCurriculum(bookId: number): Promise<CurriculumChapter[]> {
  const result = await apiClient.get<CurriculumChapter[]>(`/books/${bookId}/curriculum`);
  return result.map((c) => CurriculumChapterSchema.parse(c));
}

export async function createTest(
  classId: number,
  bookId: number,
  title: string,
  setupPath: TestSetupPath
): Promise<Test> {
  const result = await apiClient.post<Test>(`/classes/${classId}/tests`, {
    book_id: bookId,
    title,
    setup_path: setupPath,
  });
  return TestSchema.parse(result);
}

export async function fetchTestsForClass(classId: number): Promise<Test[]> {
  const result = await apiClient.get<Test[]>(`/classes/${classId}/tests`);
  return result.map((t) => TestSchema.parse(t));
}

export async function fetchTest(testId: number): Promise<Test> {
  const result = await apiClient.get<Test>(`/tests/${testId}`);
  return TestSchema.parse(result);
}

export async function uploadQuestionPaper(
  testId: number,
  file: File
): Promise<QuestionPaperUploadResult> {
  const result = await apiClient.postFile<QuestionPaperUploadResult>(
    `/tests/${testId}/questions/upload`,
    file
  );
  return QuestionPaperUploadResultSchema.parse(result);
}

export async function createQuestionsBulk(
  testId: number,
  questions: NewQuestionInput[]
): Promise<Question[]> {
  const result = await apiClient.post<Question[]>(`/tests/${testId}/questions/bulk`, { questions });
  return result.map((q) => QuestionSchema.parse(q));
}

export async function fetchQuestions(testId: number): Promise<QuestionWithNode[]> {
  const result = await apiClient.get<QuestionWithNode[]>(`/tests/${testId}/questions`);
  return result.map((q) => QuestionWithNodeSchema.parse(q));
}

export async function setQuestionNode(testId: number, questionId: number, nodeId: number): Promise<void> {
  await apiClient.put<null>(`/tests/${testId}/questions/${questionId}/node`, { node_id: nodeId });
}

export async function publishTest(testId: number): Promise<void> {
  await apiClient.post<null>(`/tests/${testId}/publish`, {});
}

export async function fetchStudentTests(studentId: number): Promise<StudentTestSummary[]> {
  const result = await apiClient.get<StudentTestSummary[]>(`/students/${studentId}/tests`);
  return result.map((t) => StudentTestSummarySchema.parse(t));
}
