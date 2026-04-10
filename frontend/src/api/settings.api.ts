import { apiClient } from "./client";

export type Currency = "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD";
export type Language = "FR" | "EN";
export type Theme = "DARK" | "LIGHT";

export type UserSettings = {
  currency: Currency;
  language: Language;
  theme: Theme;
};

export function getSettings(): Promise<UserSettings> {
  return apiClient.get("/auth/settings");
}

export function updateSettings(patch: Partial<Pick<UserSettings, "currency" | "language" | "theme">>): Promise<UserSettings> {
  return apiClient.patch("/auth/settings", patch);
}
