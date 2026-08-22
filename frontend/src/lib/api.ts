import {
  AUTH_TOKEN_COOKIE,
  AUTH_TOKEN_MAX_AGE_SECONDS,
  getCookie,
  REFRESH_TOKEN_COOKIE,
  removeCookie,
  setCookie,
  USER_COOKIE,
} from "@/lib/cookies";
import { API_BASE_URL } from "@/types/constant";

const REFRESH_ENDPOINT = "/auth/refresh-token";

// Dedupes concurrent refresh attempts — several requests can 401 at once
// right when the access token expires, and they should all wait on the same
// refresh call rather than each firing their own.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAuthToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = getCookie(REFRESH_TOKEN_COOKIE);
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}${REFRESH_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = (await response.json().catch(() => null)) as
      | ApiSuccess<{ auth_token: string }>
      | ApiError
      | null;
    if (!response.ok || !body || body.success === false || !body.data?.auth_token) return false;
    setCookie(AUTH_TOKEN_COOKIE, body.data.auth_token, { maxAgeSeconds: AUTH_TOKEN_MAX_AGE_SECONDS });
    return true;
  } catch {
    return false;
  }
}

// The refresh token itself is invalid/expired (or missing) — nothing left to
// do but sign the user out. A hard redirect (rather than router.push, which
// needs a component) is the simplest way to force this from a plain module
// that arbitrary services/hooks call into, and it re-hydrates AuthProvider
// cleanly from the now-cleared cookies on load.
function forceLogoutRedirect() {
  removeCookie(AUTH_TOKEN_COOKIE);
  removeCookie(REFRESH_TOKEN_COOKIE);
  removeCookie(USER_COOKIE);
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- no router available in a plain module; a hard reload also re-hydrates AuthProvider from the now-cleared cookies
    window.location.href = "/login";
  }
}

export class RequestError extends Error {
  code: number;
  statusCode: number;

  constructor(message: string, code: number, statusCode: number) {
    super(message);
    this.name = "RequestError";
    this.code = code;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RequestError);
    }
  }
}

// Matches app/utils/responses.py success_response()
type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  timestamp: string;
};

// Matches app/utils/responses.py error_response()
type ApiError = {
  success: false;
  error: { code: number; message: string };
  timestamp: string;
};

// Matches app/types/pagination.py PageInfo — cursor pagination, snake_case on the wire.
export type PageInfo = { has_next: boolean; next_cursor: number | null };

async function send<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetryAfterRefresh = false
): Promise<ApiSuccess<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getCookie(AUTH_TOKEN_COOKIE);
  // FormData bodies (file uploads) must let fetch set Content-Type itself —
  // it needs to add the multipart boundary, which a hardcoded json header would break.
  const isFormData = options.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(!isFormData && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  } catch {
    throw new RequestError("Could not reach the server", 0, 0);
  }

  // A 401 with a token attached means that token expired or was rejected —
  // try the refresh token once before giving up, rather than forcing a
  // re-login on every access-token expiry (they're short-lived by design).
  if (response.status === 401 && token && !isRetryAfterRefresh && endpoint !== REFRESH_ENDPOINT) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      return send<T>(endpoint, options, true);
    }
    forceLogoutRedirect();
    throw new RequestError("Your session expired — please sign in again.", 0, 401);
  }

  const body = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;

  if (!response.ok || !body || body.success === false) {
    const error = body && body.success === false ? body.error : null;
    throw new RequestError(error?.message ?? "Request failed", error?.code ?? 0, response.status);
  }

  return body;
}

export const apiClient = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const body = await send<T>(endpoint, options);
    return body.data;
  },

  // For endpoints that return app/utils/responses.py's paginated envelope
  // (a top-level `pagination` alongside `data`, not nested inside it).
  async requestPaginated<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T[]; pagination: PageInfo }> {
    const body = await send<T[]>(endpoint, options);
    return { data: body.data, pagination: (body as unknown as { pagination: PageInfo }).pagination };
  },

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  },
  getPaginated<T>(endpoint: string) {
    return this.requestPaginated<T>(endpoint);
  },
  post<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, { method: "POST", body: JSON.stringify(data) });
  },
  put<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, { method: "PUT", body: JSON.stringify(data) });
  },
  patch<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) });
  },
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  },
  postFile<T>(endpoint: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<T>(endpoint, { method: "POST", body: formData });
  },
};
