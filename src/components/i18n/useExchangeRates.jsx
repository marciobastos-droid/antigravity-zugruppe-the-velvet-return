import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook para obter taxas de câmbio em tempo real
 */
export function useExchangeRates() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getExchangeRates');
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    cacheTime: 1000 * 60 * 60 * 24, // 24 horas
    refetchInterval: 1000 * 60 * 60 * 6 // Atualizar a cada 6 horas
  });

  const convertPrice = React.useCallback((amount, fromCurrency, toCurrency) => {
    if (!data?.rates || !amount) return null;
    if (fromCurrency === toCurrency) return amount;

    // Converter para EUR primeiro, depois para moeda destino
    const amountInEUR = fromCurrency === 'EUR' 
      ? amount 
      : amount / data.rates[fromCurrency];
    
    const convertedAmount = toCurrency === 'EUR'
      ? amountInEUR
      : amountInEUR * data.rates[toCurrency];

    return Math.round(convertedAmount);
  }, [data?.rates]);

  const formatPrice = React.useCallback((amount, currency = 'EUR') => {
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

    return `${symbols[currency] || currency}${amount?.toLocaleString() || 0}`;
  }, []);

  return {
    rates: data?.rates || {},
    lastUpdated: data?.last_updated,
    isLoading,
    error,
    isFallback: data?.fallback || false,
    convertPrice,
    formatPrice
  };
}