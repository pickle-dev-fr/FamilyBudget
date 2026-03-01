const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
console.log(API_URL)

export type ApiError = {
    status: number;
    data: any;
};

async function request(
  method: string,
  path: string,
  body?: unknown
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
    throw {
      status: response.status,
      data,
    };
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
    head: (path: string, query?: Record<string, any>) =>
        request("HEAD", buildUrl(path, query)),

    get: (path: string, query?: Record<string, any>) =>
        request("GET", buildUrl(path, query)),

    post: (path: string, body?: unknown) =>
        request("POST", path, body),

    put: (path: string, body?: unknown) =>
        request("PUT", path, body),

    delete: (path: string) =>
        request("DELETE", path),
};
