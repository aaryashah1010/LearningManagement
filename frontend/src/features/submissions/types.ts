import { z } from "zod";
import { SubmissionStatusSchema } from "@/types/common";

export { SubmissionStatusSchema };
export type { SubmissionStatus } from "@/types/common";

// Mirrors app/models/submission.py Submission
export const SubmissionSchema = z.object({
  id: z.number(),
  test_id: z.number(),
  student_id: z.number().nullable(),
  image_url: z.string(),
  raw_extracted_name: z.string().nullable(),
  status: SubmissionStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

// Mirrors app/models/submission.py Answer — returned as-is by PUT .../answers/{q_id}
export const AnswerSchema = z.object({
  id: z.number(),
  submission_id: z.number(),
  question_id: z.number(),
  extracted_answer: z.string().nullable(),
  is_correct: z.boolean().nullable(),
  needs_review: z.boolean(),
  reviewed_by_teacher: z.boolean(),
});
export type Answer = z.infer<typeof AnswerSchema>;

// Answer plus the question_number/correct_option GET /submissions/{id} joins in for display.
export const SubmissionAnswerSchema = AnswerSchema.extend({
  question_number: z.number().nullable(),
  correct_option: z.string().nullable(),
});
export type SubmissionAnswer = z.infer<typeof SubmissionAnswerSchema>;

export const SubmissionDetailSchema = SubmissionSchema.extend({
  answers: z.array(SubmissionAnswerSchema),
});
export type SubmissionDetail = z.infer<typeof SubmissionDetailSchema>;

export const BulkUploadResultSchema = z.object({ pages_processed: z.number() });
export type BulkUploadResult = z.infer<typeof BulkUploadResultSchema>;

// Mirrors app/repositories/submission_repository.py save_pending_for_test's return —
// counts of how each pending submission was finalized.
export const SaveSubmissionsResultSchema = z.object({
  saved: z.number(),
  processed: z.number(),
  needs_review: z.number(),
});
export type SaveSubmissionsResult = z.infer<typeof SaveSubmissionsResultSchema>;
