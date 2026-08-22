import { z } from "zod";
import { StudentViewSchema } from "@/types/common";

// Input to the bulk-enroll form — not API response data, so a plain type
// per the guide (Zod schemas are for validating what the server returns).
export type DraftStudentRow = {
  id: string;
  name: string;
  dateOfBirth: string;
  contact: string;
};

const FailedRowSchema = z.object({
  name: z.string(),
  code: z.number(),
  message: z.string(),
});

// Mirrors the {created, failed} shape built in app/routers/accounts_router.py create_students_bulk
export const BulkEnrollResultSchema = z.object({
  created: z.array(StudentViewSchema),
  failed: z.array(FailedRowSchema),
});
export type BulkEnrollResult = z.infer<typeof BulkEnrollResultSchema>;
