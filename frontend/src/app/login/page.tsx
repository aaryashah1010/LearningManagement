import type { Metadata } from "next";
import { LoginScreen } from "@/features/auth/component/login-screen";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return <LoginScreen />;
}
