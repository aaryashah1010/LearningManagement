import { apiClient } from "@/lib/api";
import { loginResponseSchema, TeacherViewSchema } from "../types";

const TeacherLoginResponseSchema = loginResponseSchema(TeacherViewSchema);

// Handles both the "admin" and "teacher" roles — role is a column on
// `teachers`, not a separate account type, so one endpoint serves both.
export async function loginTeacher(email: string, password: string) {
  const result = await apiClient.post("/auth/teacher/login", { email, password });
  return TeacherLoginResponseSchema.parse(result);
}
