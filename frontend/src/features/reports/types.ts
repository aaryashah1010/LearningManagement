import { z } from "zod";

// Mirrors app/models/curriculum_node.py NodeLevel
export const NodeLevelSchema = z.enum(["chapter", "topic", "subtopic"]);

// Mirrors app/models/report.py NodeVerdict
export const NodeVerdictSchema = z.enum(["strong", "needs_practice", "weak", "insufficient_data"]);
export type NodeVerdict = z.infer<typeof NodeVerdictSchema>;

// Mirrors app/models/report.py NodeAccuracy
export const NodeAccuracySchema = z.object({
  node_id: z.number(),
  name: z.string(),
  level: NodeLevelSchema,
  path: z.string(),
  correct_count: z.number(),
  total_count: z.number(),
  accuracy: z.number().nullable(),
  verdict: NodeVerdictSchema,
  page_start: z.number().nullable(),
  page_end: z.number().nullable(),
});
export type NodeAccuracy = z.infer<typeof NodeAccuracySchema>;

// Mirrors app/models/report.py StudentNodeBucket
export const StudentNodeBucketSchema = z.object({
  node_id: z.number(),
  name: z.string(),
  path: z.string(),
  strong_count: z.number(),
  needs_practice_count: z.number(),
  weak_count: z.number(),
  insufficient_data_count: z.number(),
});
export type StudentNodeBucket = z.infer<typeof StudentNodeBucketSchema>;

// Mirrors app/models/report.py StudentReport
export const StudentReportSchema = z.object({
  student_id: z.number(),
  student_name: z.string(),
  test_id: z.number(),
  score_correct: z.number(),
  score_total: z.number(),
  score_percent: z.number().nullable(),
  node_accuracies: z.array(NodeAccuracySchema),
  weak_nodes: z.array(NodeAccuracySchema),
  summary: z.string().nullable(),
});
export type StudentReport = z.infer<typeof StudentReportSchema>;

// Mirrors app/models/report.py ClassReport
export const ClassReportSchema = z.object({
  class_id: z.number(),
  test_id: z.number(),
  students_evaluated: z.number(),
  average_score_percent: z.number().nullable(),
  node_accuracies: z.array(NodeAccuracySchema),
  node_student_buckets: z.array(StudentNodeBucketSchema),
  summary: z.string().nullable(),
});
export type ClassReport = z.infer<typeof ClassReportSchema>;

// Mirrors app/models/report.py TestReportResponse
export const TestReportResponseSchema = z.object({
  class_report: ClassReportSchema,
  student_reports: z.array(StudentReportSchema),
});
export type TestReportResponse = z.infer<typeof TestReportResponseSchema>;
