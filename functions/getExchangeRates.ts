import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch live exchange rates from exchangerate-api.com (free tier)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();

    // Extract relevant currencies
    const rates = {
      EUR: 1,
      USD: data.rates.USD,
      GBP: data.rates.GBP,
      AED: data.rates.AED,
      AOA: data.rates.AOA,
      BRL: data.rates.BRL,
      CHF: data.rates.CHF,
      CAD: data.rates.CAD
    };

    return Response.json({
      success: true,
      rates,
      last_updated: data.date,
      base_currency: 'EUR'
    });

  } catch (error) {
    console.error('Exchange rates error:', error);
    
    // Fallback to static rates if API fails
    return Response.json({
      success: true,
      rates: {
        EUR: 1,
        USD: 1.10,
        GBP: 0.85,
        AED: 4.04,
        AOA: 913,
        BRL: 6.39,
        CHF: 0.93,
        CAD: 1.54
      },
      last_updated: new Date().toISOString().split('T')[0],
      base_currency: 'EUR',
      fallback: true
    });
  }
});