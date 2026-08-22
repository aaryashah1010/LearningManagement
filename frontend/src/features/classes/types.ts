import { z } from "zod";

// Mirrors app/models/class_.py Class
export const ClassSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});
export type Class = z.infer<typeof ClassSchema>;

// Mirrors app/models/class_.py ClassDetail
export const ClassDetailSchema = ClassSchema.extend({
  enrollment_count: z.number(),
});
export type ClassDetail = z.infer<typeof ClassDetailSchema>;
