import { router } from "expo-router";

import { API_URL } from "../constants/config";
import { clearAll } from "./storage";

function isUserNotFoundMessage(body: unknown): boolean {
  const errorMessage =
    typeof body === "object" && body !== null
      ? (body as { error?: string; message?: string }).error ??
        (body as { error?: string; message?: string }).message
      : typeof body === "string"
        ? body
        : "";

  return typeof errorMessage === "string" && errorMessage.toLowerCase().includes("user not found");
}

async function handleInvalidSession(): Promise<void> {
  await clearAll();
  if (router.canDismiss?.()) {
    router.dismissAll();
  }
  router.replace("/auth");
}

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

  if (response.status === 401 || isUserNotFoundMessage(body)) {
    await handleInvalidSession();
    throw new Error("AUTH_SESSION_INVALID");
  }

  if (!response.ok) {
    const message =
      body?.error ??
      body?.message ??
      (typeof body === "string" ? body : "Request failed");
    throw new Error(message);
  }

  return body as T;
}
