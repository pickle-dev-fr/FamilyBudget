import { useEffect, useState } from "react";
import i18n from "i18next";
import { getSettings, updateSettings, type Currency, type Language, type Theme } from "@/api/settings.api";
import { useAuth } from "./AuthContext";
import { CurrencyContext, CURRENCY_SYMBOLS, LANGUAGE_I18N } from "./currency";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme === "DARK" ? "dark" : "light");
  localStorage.setItem("theme", theme === "DARK" ? "dark" : "light");
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>("EUR");
  const [language, setLanguageState] = useState<Language>("FR");
  const [theme, setThemeState] = useState<Theme>("DARK");

  useEffect(() => {
    if (!authenticated) return;
    getSettings().then((s) => {
      setCurrencyState(s.currency);
      setLanguageState(s.language);
      setThemeState(s.theme);
      i18n.changeLanguage(LANGUAGE_I18N[s.language]);
      applyTheme(s.theme);
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

  async function setTheme(newTheme: Theme) {
    await updateSettings({ theme: newTheme });
    setThemeState(newTheme);
    applyTheme(newTheme);
  }

  return (
    <CurrencyContext.Provider
      value={{ currency, currencySymbol: CURRENCY_SYMBOLS[currency], language, theme, setCurrency, setLanguage, setTheme }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
