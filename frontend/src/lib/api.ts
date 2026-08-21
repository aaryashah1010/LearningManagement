import { getCookie } from "@/lib/cookies";
import { API_BASE_URL } from "@/types/constant";

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

async function send<T>(endpoint: string, options: RequestInit = {}): Promise<ApiSuccess<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getCookie("auth_token");

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  } catch {
    throw new RequestError("Could not reach the server", 0, 0);
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
  patch<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) });
  },
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  },
};
