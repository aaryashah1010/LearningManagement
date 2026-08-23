import type { Metadata } from "next";
import { TestsList } from "@/features/tests/component/tests-list";

export const metadata: Metadata = { title: "Tests" };

export default function TeacherTestsPage() {
  return <TestsList />;
}
