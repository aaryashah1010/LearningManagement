import { z } from "zod";
import { StudentViewSchema, TeacherViewSchema, type StudentView, type TeacherView } from "@/types/common";

// Mirrors app/types/auth_response.py LoginResponse
export function loginResponseSchema<T extends z.ZodTypeAny>(userSchema: T) {
  return z.object({
    user: userSchema,
    auth_token: z.string(),
    refresh_token: z.string(),
  });
}

export { StudentViewSchema, TeacherViewSchema };

export type AuthUser =
  | ({ role: "admin" | "teacher" } & Omit<TeacherView, "role">)
  | ({ role: "student" } & StudentView);
