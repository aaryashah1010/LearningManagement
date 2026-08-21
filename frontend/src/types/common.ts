import { z } from "zod";

// Mirrors app/models/teacher.py TeacherView — used by the auth feature (login)
// and the teachers feature (create).
export const TeacherViewSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["teacher", "admin"]),
});
export type TeacherView = z.infer<typeof TeacherViewSchema>;

// Mirrors app/models/student.py StudentView — used by the auth feature (login),
// the classes feature (roster) and the students feature (bulk-enroll results).
export const StudentViewSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});
export type StudentView = z.infer<typeof StudentViewSchema>;

// Mirrors app/utils/responses.py's paginated envelope: `pagination` sits
// alongside `data`, not nested inside it — see lib/api.ts requestPaginated.
export type Paginated<T> = {
  data: T[];
  pagination: { has_next: boolean; next_cursor: number | null };
};
