import { useEffect, useState } from "react";
import i18n from "i18next";
import { getSettings, updateSettings, type Currency, type Language } from "@/api/settings.api";
import { useAuth } from "./AuthContext";
import { CurrencyContext, CURRENCY_SYMBOLS, LANGUAGE_I18N } from "./currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [language, setLanguageState] = useState<Language>("FR");

  useEffect(() => {
    if (!authenticated) return;
    getSettings().then((s) => {
      setCurrencyState(s.currency);
      setLanguageState(s.language);
      i18n.changeLanguage(LANGUAGE_I18N[s.language]);
    }).catch(() => {});
  }, [authenticated]);

  async function setCurrency(newCurrency: Currency) {
    await updateSettings({ currency: newCurrency });
    setCurrencyState(newCurrency);
  }

  async function setLanguage(newLanguage: Language) {
    await updateSettings({ language: newLanguage });
    setLanguageState(newLanguage);
    i18n.changeLanguage(LANGUAGE_I18N[newLanguage]);
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencySymbol: CURRENCY_SYMBOLS[currency],
        language,
        setCurrency,
        setLanguage,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
