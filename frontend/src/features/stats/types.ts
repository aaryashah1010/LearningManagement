import { z } from "zod";

// Mirrors app/models/stats.py EnrollmentTrendPoint
export const EnrollmentTrendPointSchema = z.object({
  label: z.string(),
  count: z.number(),
});
export type EnrollmentTrendPoint = z.infer<typeof EnrollmentTrendPointSchema>;

// Mirrors app/models/stats.py ClassRosterRow
export const ClassRosterRowSchema = z.object({
  class_id: z.number(),
  name: z.string(),
  teacher_names: z.array(z.string()),
  enrolled_count: z.number(),
});
export type ClassRosterRow = z.infer<typeof ClassRosterRowSchema>;

// Mirrors app/models/stats.py AdminStats
export const AdminStatsSchema = z.object({
  teachers_count: z.number(),
  students_count: z.number(),
  classes_count: z.number(),
  unassigned_classes_count: z.number(),
  enrollment_trend: z.array(EnrollmentTrendPointSchema),
  class_roster: z.array(ClassRosterRowSchema),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

// Mirrors app/models/stats.py TeacherStats
export const TeacherStatsSchema = z.object({
  classes_count: z.number(),
  published_tests_count: z.number(),
  needs_review_submissions_count: z.number(),
  average_accuracy_percent: z.number().nullable(),
});
export type TeacherStats = z.infer<typeof TeacherStatsSchema>;
