export enum UserRole {
  ADMIN = "admin",
  TEACHER = "teacher",
  STUDENT = "student",
  UNKNOWN = "unknown",
}

// Admin and teacher both sign in through the same "staff" form and endpoint —
// role is a column on `teachers`, not a separate identity — so this is the
// value the role selector on the login screen offers, not what comes back
// from the API (see app/middleware/auth.py TokenData.role).
export type StaffRole = UserRole.ADMIN | UserRole.TEACHER;

export interface LoginCredentials {
  userType: UserRole.ADMIN | UserRole.TEACHER | UserRole.STUDENT;
  identifier: string;
  password: string;
}
