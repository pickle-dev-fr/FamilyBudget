import { apiClient } from "./client";

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

export function me(): Promise<void> {
  return apiClient.head("/auth/me");
}
