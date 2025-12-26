import React from "react";
import { useExchangeRates } from "../i18n/useExchangeRates";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe, TrendingUp } from "lucide-react";

export default function MultiCurrencyPrice({ 
  price, 
  currency = "EUR", 
  listingType = "sale",
  showAlternatives = true,
  variant = "default" // "default", "compact", "full"
}) {
  const { rates, convertPrice, formatPrice, isFallback, lastUpdated } = useExchangeRates();

  const alternativeCurrencies = ['USD', 'GBP', 'AED', 'BRL'];
  
  const convertedPrices = React.useMemo(() => {
    if (!rates || Object.keys(rates).length === 0) return [];
    
    return alternativeCurrencies
      .filter(c => c !== currency)
      .map(targetCurrency => ({
        currency: targetCurrency,
        amount: convertPrice(price, currency, targetCurrency)
      }))
      .filter(p => p.amount);
  }, [price, currency, rates, convertPrice]);

  const symbols = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    AED: 'AED',
    AOA: 'AOA',
    BRL: 'R$',
    CHF: 'CHF',
    CAD: 'C$'
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold text-slate-900">
          {symbols[currency]}{price?.toLocaleString()}
          {listingType === 'rent' && <span className="text-sm font-normal text-slate-500">/mês</span>}
        </div>
        {showAlternatives && convertedPrices.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                +{convertedPrices.length} moedas
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b">
                  <span>Conversões em tempo real</span>
                  {isFallback && <Badge variant="outline" className="text-xs">Estimado</Badge>}
                </div>
                {convertedPrices.map(({ currency: curr, amount }) => (
                  <div key={curr} className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">{curr}</span>
                    <span className="font-semibold text-slate-900">{formatPrice(amount, curr)}</span>
                  </div>
                ))}
                {lastUpdated && (
                  <div className="text-xs text-slate-400 pt-2 border-t">
                    Atualizado: {lastUpdated}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-3xl md:text-4xl font-bold text-slate-900">
        {symbols[currency]}{price?.toLocaleString()}
        {listingType === 'rent' && <span className="text-lg font-normal text-slate-500">/mês</span>}
      </div>
      
      {showAlternatives && convertedPrices.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">Preços noutras moedas</span>
            {isFallback && <Badge variant="outline" className="text-[10px]">Estimativa</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {convertedPrices.map(({ currency: curr, amount }) => (
              <div key={curr} className="flex justify-between items-center px-2 py-1.5 bg-slate-50 rounded-md">
                <span className="text-xs text-slate-600 font-medium">{curr}</span>
                <span className="text-xs font-semibold text-slate-900">{formatPrice(amount, curr)}</span>
              </div>
            ))}
          </div>
          {lastUpdated && (
            <div className="text-[10px] text-slate-400">
              Taxa de câmbio atualizada: {lastUpdated}
            </div>
          )}
        </div>
      )}
    </div>
  );
}