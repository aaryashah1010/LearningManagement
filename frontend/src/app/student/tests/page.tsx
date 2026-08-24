import type { Metadata } from "next";
import { StudentTestsList } from "@/features/tests/component/student-tests-list";

export const metadata: Metadata = { title: "Tests" };

export default function StudentTestsPage() {
  return <StudentTestsList />;
}
