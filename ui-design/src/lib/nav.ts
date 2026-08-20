import type { ComponentType, SVGProps } from "react";
import {
  ClassesIcon,
  DashboardIcon,
  ReportsIcon,
  StudentsIcon,
  SubmissionsIcon,
  TeachersIcon,
  TestsIcon,
} from "@/components/icons";

export type Role = "admin" | "teacher" | "student";

export interface NavItemConfig {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

// Admin and teacher are separate roles (teachers.role = 'admin' | 'teacher')
// with different permissions — see docs/accounts-and-roster.md § Tenancy
// Model — so they get separate nav sets, not a shared "staff" one.

const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/classes", label: "Classes", icon: ClassesIcon },
  { href: "/admin/teachers", label: "Teachers", icon: TeachersIcon },
  { href: "/admin/students", label: "Students", icon: StudentsIcon },
];

const TEACHER_NAV_ITEMS: NavItemConfig[] = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/teacher/classes", label: "Classes", icon: ClassesIcon },
  { href: "/teacher/tests", label: "Tests", icon: TestsIcon },
  { href: "/teacher/submissions", label: "Submissions", icon: SubmissionsIcon },
  { href: "/teacher/reports", label: "Reports", icon: ReportsIcon },
];

const STUDENT_NAV_ITEMS: NavItemConfig[] = [
  { href: "/student/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/student/tests", label: "Tests", icon: TestsIcon },
  { href: "/student/reports", label: "My Report", icon: ReportsIcon },
];

// Icon components are function values, which can't cross the Server->Client
// serialization boundary as props — so role layouts (Server Components) pass
// a plain `role` string, and this lookup happens inside the client sidebar.
export const NAV_ITEMS_BY_ROLE: Record<Role, NavItemConfig[]> = {
  admin: ADMIN_NAV_ITEMS,
  teacher: TEACHER_NAV_ITEMS,
  student: STUDENT_NAV_ITEMS,
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};
