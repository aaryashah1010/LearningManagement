import { apiClient } from "@/lib/api";
import { loginResponseSchema, StudentViewSchema } from "../types";

const StudentLoginResponseSchema = loginResponseSchema(StudentViewSchema);

export async function loginStudent(identifier: string, password: string) {
  const result = await apiClient.post("/auth/student/login", { identifier, password });
  return StudentLoginResponseSchema.parse(result);
}
