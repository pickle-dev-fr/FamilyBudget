const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  // NE PAS parser pour HEAD
  if (method !== "HEAD") {
    const contentType = response.headers.get("content-type");
    data =
      contentType && contentType.includes("application/json")
        ? await response.json()
        : null;
  }

  if (!response.ok) {
    throw {
      status: response.status,
      data,
    } as ApiError;
  }

  return data;
}


export const apiClient = {
  head: (path: string) => request("HEAD", path),
  get: (path: string) => request("GET", path),
  post: (path: string, body?: unknown) => request("POST", path, body),
  put: (path: string, body?: unknown) => request("PUT", path, body),
  delete: (path: string) => request("DELETE", path),
};
