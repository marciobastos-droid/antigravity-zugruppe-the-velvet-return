// Taxas de câmbio aproximadas para EUR (atualizadas periodicamente)
export const EXCHANGE_RATES = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  AED: 0.25,
  AOA: 0.0011,
  BRL: 0.19,
  CHF: 1.06,
  CAD: 0.67
};

export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  AED: 'د.إ',
  AOA: 'Kz',
  BRL: 'R$',
  CHF: 'CHF',
  CAD: 'C$'
};

/**
 * Converte um valor de uma moeda para euros
 */
export function convertToEUR(amount, fromCurrency) {
  if (!amount || !fromCurrency) return null;
  if (fromCurrency === 'EUR') return amount;
  
  const rate = EXCHANGE_RATES[fromCurrency];
  if (!rate) return null;
  
  return Math.round(amount * rate);
}

/**
 * Formata o preço com símbolo da moeda
 */
export function formatPrice(amount, currency = 'EUR', showConversion = false) {
  if (!amount) return 'N/A';
  
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedAmount = amount.toLocaleString();
  
  let result = `${symbol}${formattedAmount}`;
  
  // Adicionar conversão para EUR se moeda diferente e showConversion ativo
  if (showConversion && currency !== 'EUR') {
    const eurValue = convertToEUR(amount, currency);
    if (eurValue) {
      result += ` (≈ €${eurValue.toLocaleString()})`;
    }
  }
  
  return result;
}

/**
 * Componente React para exibir preço com conversão
 */
export function PriceDisplay({ amount, currency = 'EUR', className = '', showConversion = true }) {
  if (!amount) return <span className={className}>N/A</span>;
  
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedAmount = amount.toLocaleString();
  const eurValue = currency !== 'EUR' ? convertToEUR(amount, currency) : null;
  
  return (
    <span className={className}>
      {symbol}{formattedAmount}
      {showConversion && eurValue && (
        <span className="text-sm text-slate-500 ml-2">
          (≈ €{eurValue.toLocaleString()})
        </span>
      )}
    </span>
  );
}