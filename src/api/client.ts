import { getTransport } from "./transport";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type Query = Readonly<Record<string, unknown>>;

/** The API's `{"detail": {"code", "message", "retryable"}}` error, with the HTTP status. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(input: { code: string; message: string; retryable: boolean; status: number }) {
    super(input.message);
    this.name = "ApiError";
    this.code = input.code;
    this.status = input.status;
    this.retryable = input.retryable;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isAbortError(value: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && value instanceof DOMException && value.name === "AbortError") ||
    (value instanceof Error && value.name === "AbortError")
  );
}

export function describeError(value: unknown): string {
  if (isApiError(value)) return value.message;
  if (value instanceof Error && value.message) return value.message;
  return "Something went wrong.";
}

export function errorCode(value: unknown): string | null {
  return isApiError(value) ? value.code : null;
}

export function buildQueryString(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        params.append(key, String(value));
      }
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export interface ApiRequestInput {
  method?: HttpMethod;
  path: string;
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

interface ErrorBody {
  code: string;
  message: string;
  retryable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readErrorBody(response: Response): Promise<ErrorBody> {
  const fallback: ErrorBody = {
    code: `http_${response.status}`,
    message: response.statusText || `The request failed (${response.status}).`,
    retryable: response.status >= 500,
  };
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return fallback;
  }
  const detail = isRecord(payload) ? payload.detail : undefined;
  if (isRecord(detail)) {
    return {
      code: typeof detail.code === "string" ? detail.code : fallback.code,
      message: typeof detail.message === "string" ? detail.message : fallback.message,
      retryable: typeof detail.retryable === "boolean" ? detail.retryable : fallback.retryable,
    };
  }
  if (Array.isArray(detail)) {
    const messages = detail.map((entry) => {
      if (!isRecord(entry)) return "invalid value";
      const location = Array.isArray(entry.loc)
        ? entry.loc.filter((part) => part !== "body").join(".")
        : "";
      const message = typeof entry.msg === "string" ? entry.msg : "invalid value";
      return location ? `${location}: ${message}` : message;
    });
    return {
      code: "validation_error",
      message: messages.join("; ") || "The request was not valid.",
      retryable: false,
    };
  }
  if (typeof detail === "string") return { ...fallback, message: detail };
  return fallback;
}

/** One JSON request to the Hunch API through the active transport. */
export async function apiRequest<T>(input: ApiRequestInput): Promise<T> {
  const method = input.method ?? "GET";
  const headers = new Headers({ accept: "application/json" });
  const hasBody = input.body !== undefined && method !== "GET";
  if (hasBody) headers.set("content-type", "application/json");
  let response: Response;
  try {
    response = await getTransport().fetch(`${input.path}${buildQueryString(input.query)}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(input.body) : undefined,
      signal: input.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError({
      code: "network_error",
      message: "The Hunch API could not be reached.",
      retryable: true,
      status: 0,
    });
  }
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new ApiError({ ...body, status: response.status });
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
