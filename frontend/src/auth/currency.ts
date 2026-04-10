import { createContext, useContext } from "react";
import type { Currency, Language, Theme } from "@/api/settings.api";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "Fr.",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export const LANGUAGE_I18N: Record<Language, string> = {
  FR: "fr",
  EN: "en",
};

export type CurrencyContextType = {
  currency: Currency;
  currencySymbol: string;
  language: Language;
  theme: Theme;
  setCurrency: (currency: Currency) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
};

export const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }
  return ctx;
}
