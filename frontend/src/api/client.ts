/**
 * Fetch wrapper for the MediDeck API.
 * - Base URL from VITE_API_URL environment variable.
 * - Automatically includes credentials (cookies) on all requests.
 * - Sends X-CSRF-Token on state-changing requests (POST, PUT, PATCH, DELETE).
 * - Automatic retry with backoff and server wake-up notification for network failures/timeouts.
 * - Parses JSON responses and handles 204 No Content.
 * - On 401 (excluding login and verify), redirects to /login?expired=true.
 * - On HTTP error, throws { detail: "...", status: number }.
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface ApiError {
  detail: string;
  status?: number;
  isNetworkError?: boolean;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "detail" in err &&
    typeof (err as Record<string, unknown>).detail === "string"
  );
}

export function getErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred."
): string {
  if (isApiError(err)) return err.detail;
  if (err instanceof Error) return err.message;
  return fallback;
}

type ServerWakeupListener = (isWakingUp: boolean) => void;
const wakeupListeners = new Set<ServerWakeupListener>();

export function onServerWakeupChange(
  listener: ServerWakeupListener
): () => void {
  wakeupListeners.add(listener);
  return () => {
    wakeupListeners.delete(listener);
  };
}

let activeWakeupCount = 0;
function setServerWakeup(wakingUp: boolean) {
  if (wakingUp) {
    activeWakeupCount++;
    if (activeWakeupCount === 1) {
      wakeupListeners.forEach((fn) => fn(true));
    }
  } else {
    activeWakeupCount = Math.max(0, activeWakeupCount - 1);
    if (activeWakeupCount === 0) {
      wakeupListeners.forEach((fn) => fn(false));
    }
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken && !headers["X-CSRF-Token"]) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  const maxRetries = 3;
  let attempt = 0;
  let didNotifyWakeup = false;

  while (true) {
    let resp: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        resp = await fetch(`${API_BASE}${path}`, {
          ...init,
          signal: init?.signal || controller.signal,
          credentials: "include",
          headers,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: unknown) {
      if (init?.signal?.aborted) {
        throw err;
      }

      attempt++;
      if (attempt <= maxRetries) {
        if (!didNotifyWakeup) {
          didNotifyWakeup = true;
          setServerWakeup(true);
        }
        await sleep(attempt * 1000);
        continue;
      }

      if (didNotifyWakeup) {
        setServerWakeup(false);
      }
      throw {
        detail:
          "Cannot reach the server. Please check your network connection.",
        isNetworkError: true,
      } satisfies ApiError;
    }

    if (didNotifyWakeup) {
      setServerWakeup(false);
      didNotifyWakeup = false;
    }

    // Handle 401 token expiry on authenticated endpoints (excluding login and verify)
    if (resp.status === 401) {
      const isAuthEndpoint =
        path.includes("/api/auth/login") || path.includes("/api/auth/verify");
      if (!isAuthEndpoint && typeof window !== "undefined") {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login?expired=true";
        }
      }
    }

    // 204 No Content — no body to parse
    if (resp.status === 204) {
      return undefined as T;
    }

    let data: unknown;
    try {
      data = await resp.json();
    } catch {
      if (!resp.ok) {
        throw { detail: resp.statusText, status: resp.status } satisfies ApiError;
      }
      return undefined as T;
    }

    if (!resp.ok) {
      const detail =
        (data as Record<string, unknown>)?.detail ?? resp.statusText;
      throw { detail: String(detail), status: resp.status } satisfies ApiError;
    }

    return data as T;
  }
}
