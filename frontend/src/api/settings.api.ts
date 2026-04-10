import { apiClient } from "./client";

export type Currency = "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD";

export type UserSettings = {
  currency: Currency;
};

export function getSettings(): Promise<UserSettings> {
  return apiClient.get("/auth/settings");
}

export function updateSettings(currency: Currency): Promise<UserSettings> {
  return apiClient.patch("/auth/settings", { currency });
}
