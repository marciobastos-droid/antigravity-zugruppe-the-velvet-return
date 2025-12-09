import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check premium access
    const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
    const hasPremium = subscriptions[0]?.features?.advanced_analytics;

    if (!hasPremium) {
      return Response.json({ error: 'Premium subscription required' }, { status: 403 });
    }

    const { property_id } = await req.json();

    // Get property
    const properties = await base44.entities.Property.filter({ id: property_id });
    const property = properties[0];

    if (!property) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    // Generate mock analytics (replace with real data/calculations)
    const daysOnMarket = Math.floor((new Date() - new Date(property.created_date)) / (1000 * 60 * 60 * 24));
    
    const analytics = {
      views: Math.floor(Math.random() * 500) + 100,
      favorites: Math.floor(Math.random() * 50) + 10,
      market_value: Math.floor(property.price * (0.95 + Math.random() * 0.1)),
      days_on_market: daysOnMarket,
      avg_days_on_market: 45,
      price_competitiveness: '5%',
      area_growth: '8%',
      estimated_sale_days: '30-45',
      views_trend: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
        views: Math.floor(Math.random() * 20) + 5
      })),
      price_comparison: [
        { name: 'Este Imóvel', value: property.price },
        { name: 'Média Área', value: Math.floor(property.price * 0.95) },
        { name: 'Similares', value: Math.floor(property.price * 1.05) }
      ]
    };

    return Response.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});