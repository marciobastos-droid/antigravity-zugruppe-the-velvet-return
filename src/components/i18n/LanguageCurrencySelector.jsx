import React from "react";
import { useLocalization } from "./LocalizationContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe, ChevronDown, Check } from "lucide-react";
import { CURRENCY_SYMBOLS } from "../utils/currencyConverter";

const LANGUAGES = [
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" }
];

const CURRENCIES = [
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" }
];

export default function LanguageCurrencySelector({ variant = "default" }) {
  const { locale, currency, changeLocale, changeCurrency } = useLocalization();
  const [open, setOpen] = React.useState(false);

  const currentLanguage = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];
  const currentCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  if (variant === "compact") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden md:inline">{currentLanguage.flag} {currentLanguage.code.toUpperCase()}</span>
            <span className="md:hidden">{currentLanguage.flag}</span>
            <span className="text-slate-400">|</span>
            <span>{currentCurrency.symbol}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-4 space-y-4">
            {/* Languages */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Language</h4>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLocale(lang.code);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                      locale === lang.code
                        ? "bg-blue-50 border-blue-500 text-blue-900"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm font-medium flex-1">{lang.name}</span>
                    {locale === lang.code && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Currencies */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Currency</h4>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => {
                      changeCurrency(curr.code);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                      currency === curr.code
                        ? "bg-blue-50 border-blue-500 text-blue-900"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg">{curr.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{curr.code}</div>
                      <div className="text-xs text-slate-500">{curr.symbol}</div>
                    </div>
                    {currency === curr.code && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Globe className="w-4 h-4" />
            {currentLanguage.flag} {currentLanguage.name}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="space-y-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLocale(lang.code)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  locale === lang.code
                    ? "bg-blue-50 text-blue-900"
                    : "hover:bg-slate-100"
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1 font-medium">{lang.name}</span>
                {locale === lang.code && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {currentCurrency.flag} {currentCurrency.symbol}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="space-y-1">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                onClick={() => changeCurrency(curr.code)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currency === curr.code
                    ? "bg-blue-50 text-blue-900"
                    : "hover:bg-slate-100"
                }`}
              >
                <span className="text-xl">{curr.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{curr.name}</div>
                  <div className="text-xs text-slate-500">{curr.code} - {curr.symbol}</div>
                </div>
                {currency === curr.code && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}