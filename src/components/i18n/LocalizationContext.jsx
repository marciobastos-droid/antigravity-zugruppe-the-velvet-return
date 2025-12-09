import React from "react";
import { translations } from "./translations";

const LocalizationContext = React.createContext();

export function LocalizationProvider({ children }) {
  const [locale, setLocale] = React.useState(() => {
    return localStorage.getItem("app_locale") || "pt";
  });
  
  const [currency, setCurrency] = React.useState(() => {
    return localStorage.getItem("app_currency") || "EUR";
  });

  const changeLocale = (newLocale) => {
    setLocale(newLocale);
    localStorage.setItem("app_locale", newLocale);
  };

  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem("app_currency", newCurrency);
  };

  const t = (key, params = {}) => {
    const keys = key.split(".");
    let value = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        return key;
      }
    }
    
    if (typeof value === "string") {
      return Object.entries(params).reduce((str, [key, val]) => {
        return str.replace(`{${key}}`, val);
      }, value);
    }
    
    return key;
  };

  const value = {
    locale,
    currency,
    changeLocale,
    changeCurrency,
    t
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = React.useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }
  return context;
}