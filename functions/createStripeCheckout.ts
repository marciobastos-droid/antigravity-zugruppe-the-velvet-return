import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

const PLANS = {
  premium: {
    name: 'Premium',
    price: 4900, // €49.00 in cents
    features: {
      advanced_analytics: true,
      priority_support: true,
      early_access: true,
      market_reports: true,
      unlimited_properties: true,
      api_access: true
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 14900, // €149.00 in cents
    features: {
      advanced_analytics: true,
      priority_support: true,
      early_access: true,
      market_reports: true,
      unlimited_properties: true,
      api_access: true
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, user_email } = await req.json();

    if (!PLANS[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get or create Stripe customer
    const subscriptions = await base44.entities.Subscription.filter({ user_email });
    let customerId = subscriptions[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user_email,
        metadata: { user_email }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${PLANS[plan].name} Plan`,
              description: 'Subscrição mensal'
            },
            unit_amount: PLANS[plan].price,
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/Subscriptions?success=true`,
      cancel_url: `${req.headers.get('origin')}/Subscriptions?canceled=true`,
      metadata: {
        user_email,
        plan
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});