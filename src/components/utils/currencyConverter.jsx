// Taxas de câmbio para EUR (atualizadas em 08/12/2025)
export const EXCHANGE_RATES = {
  EUR: 1,
  USD: 0.94,      // 1 USD = ~0.94 EUR
  GBP: 1.19,      // 1 GBP = ~1.19 EUR
  AED: 0.256,     // 1 AED = ~0.256 EUR
  AOA: 0.00114,   // 1 AOA = ~0.00114 EUR
  BRL: 0.186,     // 1 BRL = ~0.186 EUR
  CHF: 1.07,      // 1 CHF = ~1.07 EUR
  CAD: 0.68       // 1 CAD = ~0.68 EUR
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