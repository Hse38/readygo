import { API_URL } from "../constants/config";

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body?.error ??
      body?.message ??
      (typeof body === "string" ? body : "Request failed");
    throw new Error(message);
  }

  return body as T;
}
