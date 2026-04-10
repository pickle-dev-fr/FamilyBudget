import { createContext, useContext } from "react";
import type { Currency } from "@/api/settings.api";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "Fr.",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
};

export type CurrencyContextType = {
  currency: Currency;
  currencySymbol: string;
  setCurrency: (currency: Currency) => Promise<void>;
};

export const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }
  return ctx;
}
