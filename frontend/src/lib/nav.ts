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
import { UserRole } from "@/types/auth";

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
  { href: "/teacher/monthly-reports", label: "Monthly Reports", icon: ReportsIcon },
];

const STUDENT_NAV_ITEMS: NavItemConfig[] = [
  { href: "/student/tests", label: "Tests", icon: TestsIcon },
  { href: "/student/reports", label: "My Report", icon: ReportsIcon },
  { href: "/student/monthly-report", label: "Monthly Report", icon: ReportsIcon },
];

// Icon components are function values, which can't cross the Server->Client
// serialization boundary as props — so role layouts (Server Components) pass
// a plain `role` string, and this lookup happens inside the client sidebar.
export const NAV_ITEMS_BY_ROLE: Record<UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT, NavItemConfig[]> = {
  [UserRole.ADMIN]: ADMIN_NAV_ITEMS,
  [UserRole.TEACHER]: TEACHER_NAV_ITEMS,
  [UserRole.STUDENT]: STUDENT_NAV_ITEMS,
};

export const ROLE_HOME: Record<UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT, string> = {
  [UserRole.ADMIN]: "/admin/dashboard",
  [UserRole.TEACHER]: "/teacher/dashboard",
  [UserRole.STUDENT]: "/student/tests",
};
