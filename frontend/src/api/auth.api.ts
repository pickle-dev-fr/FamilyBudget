import { apiClient } from "./client";
import { getToken } from "./token";

export type AuthPayload = {
  username: string;
  password: string;
};

export type AuthResponse = {
  access_token: string;
};

export function login(payload: AuthPayload): Promise<AuthResponse> {
  return apiClient.post("/auth/login", payload);
}

export function register(payload: AuthPayload): Promise<AuthResponse> {
  return apiClient.post("/auth/register", payload);
}

export function me(silent = false): Promise<void> {
  return apiClient.head("/auth/me", undefined, silent);
}

export async function passwordChange(password: string): Promise<void> {
  await me(true);
  return apiClient.post("/auth/change", { access_token: getToken(), password });
}

export function deleteAccount(): Promise<void> {
  return apiClient.delete("/auth/me");
}
