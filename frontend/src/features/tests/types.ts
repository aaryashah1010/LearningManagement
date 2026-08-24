import { z } from "zod";
import { SubmissionStatusSchema } from "@/types/common";

// Mirrors app/models/subject.py Subject
export const SubjectSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type Subject = z.infer<typeof SubjectSchema>;

// Mirrors app/models/subject.py NcertBook
export const NcertBookSchema = z.object({
  id: z.number(),
  subject_id: z.number(),
  title: z.string(),
  grade: z.string().nullable(),
  edition_year: z.number().nullable(),
  pdf_url: z.string().nullable(),
  created_at: z.string(),
});
export type NcertBook = z.infer<typeof NcertBookSchema>;

// Mirrors app/models/curriculum_node.py NodeLevel/SubtopicNode/TopicNode/ChapterNode
export const CurriculumSubtopicSchema = z.object({
  id: z.number(),
  name: z.string(),
  page_start: z.number().nullable(),
  page_end: z.number().nullable(),
});
export const CurriculumTopicSchema = CurriculumSubtopicSchema.extend({
  subtopics: z.array(CurriculumSubtopicSchema),
});
export const CurriculumChapterSchema = CurriculumSubtopicSchema.extend({
  topics: z.array(CurriculumTopicSchema),
});
export type CurriculumChapter = z.infer<typeof CurriculumChapterSchema>;

// Flattened curriculum node for node-picker dropdowns — {id, path} where path is
// "Chapter > Topic[ > Subtopic]", built client-side from the tree above.
export type CurriculumNodeOption = { id: number; path: string };

export const TestSetupPathSchema = z.enum(["in_app", "uploaded_pdf"]);
export type TestSetupPath = z.infer<typeof TestSetupPathSchema>;

// Mirrors app/models/test.py Test
export const TestSchema = z.object({
  id: z.number(),
  class_id: z.number(),
  book_id: z.number(),
  title: z.string(),
  setup_path: TestSetupPathSchema,
  source_pdf_url: z.string().nullable(),
  published_at: z.string().nullable(),
  created_at: z.string(),
});
export type Test = z.infer<typeof TestSchema>;

// Mirrors app/models/question.py Question
export const QuestionSchema = z.object({
  id: z.number(),
  test_id: z.number(),
  question_number: z.number(),
  question_text: z.string(),
  max_marks: z.number(),
  correct_option: z.string(),
  option_a: z.string().nullable(),
  option_b: z.string().nullable(),
  option_c: z.string().nullable(),
  option_d: z.string().nullable(),
  image_url: z.string().nullable(),
});
export type Question = z.infer<typeof QuestionSchema>;

// GET /tests/{id}/questions adds the proposed curriculum-node mapping per question
export const QuestionWithNodeSchema = QuestionSchema.extend({
  node: z.object({ id: z.number().nullable(), path: z.string().nullable() }).nullable(),
});
export type QuestionWithNode = z.infer<typeof QuestionWithNodeSchema>;

// Input to POST /tests/{id}/questions/bulk (in_app setup path) — matches
// app/models/question.py CreateQuestionData, not a Zod schema since it's input, not output.
export type NewQuestionInput = {
  question_number: number;
  question_text: string;
  correct_option: string;
  max_marks: number;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
};

export const QuestionPaperUploadResultSchema = z.object({
  questions: z.array(QuestionSchema),
  unparsed_question_numbers: z.array(z.number()),
});
export type QuestionPaperUploadResult = z.infer<typeof QuestionPaperUploadResultSchema>;

// Mirrors app/models/test.py StudentTestSummary — GET /students/{id}/tests
export const StudentTestSummarySchema = z.object({
  id: z.number(),
  class_id: z.number(),
  book_id: z.number(),
  title: z.string(),
  published_at: z.string(),
  submission_id: z.number().nullable(),
  submission_status: SubmissionStatusSchema.nullable(),
  correct_count: z.number().nullable(),
  total_count: z.number().nullable(),
});
export type StudentTestSummary = z.infer<typeof StudentTestSummarySchema>;
