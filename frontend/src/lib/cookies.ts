// Small client-side cookie helper — the backend returns tokens in the JSON
// body (not Set-Cookie), so the frontend is the one writing them to cookies
// instead of localStorage. Not httpOnly (JS has to set/read them), but still
// keeps tokens out of localStorage's XSS-readable, tab-shared storage.

export const AUTH_TOKEN_COOKIE = "auth_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const USER_COOKIE = "auth_user";

// Matches JWT_AUTH_TOKEN_EXPIRE_MINUTES / JWT_REFRESH_TOKEN_EXPIRE_DAYS
// defaults in backend/app/config/settings.py.
export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface SetCookieOptions {
  maxAgeSeconds: number;
}

export function setCookie(name: string, value: string, { maxAgeSeconds }: SetCookieOptions): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
