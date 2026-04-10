import { useEffect, useState } from "react";
import { getSettings, updateSettings, type Currency } from "@/api/settings.api";
import { useAuth } from "./AuthContext";
import { CurrencyContext, CURRENCY_SYMBOLS } from "./currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>("EUR");

  useEffect(() => {
    if (!authenticated) return;
    getSettings().then((s) => setCurrencyState(s.currency)).catch(() => {});
  }, [authenticated]);

  async function setCurrency(newCurrency: Currency) {
    await updateSettings(newCurrency);
    setCurrencyState(newCurrency);
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencySymbol: CURRENCY_SYMBOLS[currency],
        setCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
