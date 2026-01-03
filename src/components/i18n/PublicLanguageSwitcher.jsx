import React from "react";
import { useLocalization } from "./LocalizationContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe, Check } from "lucide-react";

const LANGUAGES = [
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" }
];

export default function PublicLanguageSwitcher() {
  const { locale, changeLocale } = useLocalization();
  const [open, setOpen] = React.useState(false);

  const currentLanguage = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            size="lg"
            className="rounded-full shadow-2xl bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 h-14 px-5 gap-2 hover:scale-105 transition-all"
          >
            <Globe className="w-5 h-5" />
            <span className="text-lg">{currentLanguage.flag}</span>
            <span className="font-semibold hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 mb-2" align="start" side="top">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3 px-2">Select Language</h4>
            <div className="space-y-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLocale(lang.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    locale === lang.code
                      ? "bg-blue-50 text-blue-900 border border-blue-200"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="flex-1 font-medium">{lang.name}</span>
                  {locale === lang.code && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}