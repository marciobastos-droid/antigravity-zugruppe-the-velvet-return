import { EXCHANGE_RATES, CURRENCY_SYMBOLS } from "./currencyConverter";

/**
 * Formata o preço na moeda especificada, com conversão automática para a moeda preferida do usuário
 */
export function formatPriceWithPreference(amount, propertyCurrency, userCurrency, showConversion = true) {
  if (!amount) return "N/A";
  
  const symbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  
  // Se a moeda do imóvel for igual à moeda preferida do usuário, mostrar direto
  if (propertyCurrency === userCurrency) {
    return `${symbol}${amount.toLocaleString()}`;
  }
  
  // Converter para a moeda preferida
  const convertedAmount = convertBetweenCurrencies(amount, propertyCurrency, userCurrency);
  
  if (!convertedAmount) {
    // Fallback: mostrar na moeda original
    const originalSymbol = CURRENCY_SYMBOLS[propertyCurrency] || propertyCurrency;
    return `${originalSymbol}${amount.toLocaleString()}`;
  }
  
  // Mostrar na moeda preferida
  const result = `${symbol}${convertedAmount.toLocaleString()}`;
  
  // Se showConversion, adicionar valor original entre parênteses
  if (showConversion && propertyCurrency !== userCurrency) {
    const originalSymbol = CURRENCY_SYMBOLS[propertyCurrency] || propertyCurrency;
    return `${result} (${originalSymbol}${amount.toLocaleString()})`;
  }
  
  return result;
}

/**
 * Converte um valor entre duas moedas
 */
export function convertBetweenCurrencies(amount, fromCurrency, toCurrency) {
  if (!amount || !fromCurrency || !toCurrency) return null;
  if (fromCurrency === toCurrency) return amount;
  
  // Primeiro converter para EUR (moeda base)
  const rateFrom = EXCHANGE_RATES[fromCurrency];
  if (!rateFrom) return null;
  
  const eurAmount = amount * rateFrom;
  
  // Depois converter de EUR para moeda de destino
  const rateTo = EXCHANGE_RATES[toCurrency];
  if (!rateTo) return null;
  
  return Math.round(eurAmount / rateTo);
}

/**
 * Obtem o símbolo da moeda
 */
export function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Formata o preço para exibição com a moeda do usuário
 */
export function formatPrice(amount, currency, userCurrency, showOriginal = false) {
  if (!amount) return "N/A";
  
  if (currency === userCurrency || !userCurrency) {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  }
  
  const converted = convertBetweenCurrencies(amount, currency, userCurrency);
  if (!converted) {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  }
  
  const userSymbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  const result = `${userSymbol}${converted.toLocaleString()}`;
  
  if (showOriginal) {
    const originalSymbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${result} (${originalSymbol}${amount.toLocaleString()})`;
  }
  
  return result;
}