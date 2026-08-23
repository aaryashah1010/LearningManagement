"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  AUTH_TOKEN_COOKIE,
  AUTH_TOKEN_MAX_AGE_SECONDS,
  getCookie,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  removeCookie,
  setCookie,
  USER_COOKIE,
} from "@/lib/cookies";
import { UserRole, type LoginCredentials } from "@/types/auth";
import { loginStudent } from "../services/student";
import { loginTeacher } from "../services/teacher";
import type { AuthUser } from "../types";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  login: async () => {
    throw new Error("AuthProvider is missing");
  },
  logout: () => {},
});

function persistSession(user: AuthUser, authToken: string, refreshToken: string) {
  setCookie(AUTH_TOKEN_COOKIE, authToken, { maxAgeSeconds: AUTH_TOKEN_MAX_AGE_SECONDS });
  setCookie(REFRESH_TOKEN_COOKIE, refreshToken, { maxAgeSeconds: REFRESH_TOKEN_MAX_AGE_SECONDS });
  setCookie(USER_COOKIE, JSON.stringify(user), { maxAgeSeconds: REFRESH_TOKEN_MAX_AGE_SECONDS });
}

function clearSession() {
  removeCookie(AUTH_TOKEN_COOKIE);
  removeCookie(REFRESH_TOKEN_COOKIE);
  removeCookie(USER_COOKIE);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // One-time client-only hydration from cookies — can't read them during
    // SSR, so this can't be a lazy useState initializer.
    const token = getCookie(AUTH_TOKEN_COOKIE);
    const storedUser = getCookie(USER_COOKIE);
    if (token && storedUser) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        clearSession();
      }
    }
    setIsLoading(false);
  }, []);

  async function login(credentials: LoginCredentials): Promise<AuthUser> {
    let authUser: AuthUser;
    if (credentials.userType === UserRole.STUDENT) {
      const result = await loginStudent(credentials.identifier, credentials.password);
      authUser = { role: "student", ...result.user };
      persistSession(authUser, result.auth_token, result.refresh_token);
    } else {
      const result = await loginTeacher(credentials.identifier, credentials.password);
      authUser = { ...result.user, role: result.user.role };
      persistSession(authUser, result.auth_token, result.refresh_token);
    }
    setUser(authUser);
    return authUser;
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
