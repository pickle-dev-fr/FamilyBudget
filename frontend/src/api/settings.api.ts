import { apiClient } from "./client";

export type Currency = "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD";
export type Language = "FR" | "EN";

export type UserSettings = {
  currency: Currency;
  language: Language;
};

export function getSettings(): Promise<UserSettings> {
  return apiClient.get("/auth/settings");
}

export function updateSettings(patch: Partial<Pick<UserSettings, "currency" | "language">>): Promise<UserSettings> {
  return apiClient.patch("/auth/settings", patch);
}
