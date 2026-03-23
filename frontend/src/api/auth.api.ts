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

export function me(): Promise<void> {
  return apiClient.head("/auth/me");
}

export async function passwordChange(password: string): Promise<void> {
  try {
    await me();
    console.log(getToken())
    return apiClient.post("/auth/change", { access_token: getToken(), password })
  } catch {
    // TODO alertes + log security error
  }

}
