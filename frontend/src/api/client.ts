import { toast } from "@/lib/toast";
import i18n from "@/i18n";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export type ApiError = {
    status: number;
    data: any;
};

async function request(
  method: string,
  path: string,
  body?: unknown,
  silent = false,
) {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body && method !== "HEAD" ? JSON.stringify(body) : undefined,
  });

  let data = null;

  if (method !== "HEAD") {
    const text = await response.text();

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    if (!silent) {
      const detail: string | undefined = data?.detail;

      if (response.status === 401) {
        toast.error(i18n.t("toast.error.unauthorized"));
      } else if (response.status >= 500) {
        toast.error(i18n.t("toast.error.server"));
      } else if (detail) {
        toast.warning(detail);
      } else {
        toast.error(i18n.t("toast.error.unknown"));
      }
    }

    throw { status: response.status, data } as ApiError;
  }

  return data;
}


function buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
): string {
    if (!query) {
        return path;
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
            params.append(key, String(value));
        }
    }

    const qs = params.toString();
    return qs.length > 0 ? `${path}?${qs}` : path;
}


export const apiClient = {
    head: (path: string, query?: Record<string, any>, silent = false) =>
        request("HEAD", buildUrl(path, query), undefined, silent),

    get: (path: string, query?: Record<string, any>) =>
        request("GET", buildUrl(path, query)),

    post: (path: string, body?: unknown) =>
        request("POST", path, body),

    put: (path: string, body?: unknown) =>
        request("PUT", path, body),

    patch: (path: string, body?: unknown) =>
        request("PATCH", path, body),

    delete: (path: string) =>
        request("DELETE", path),
};
