import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_email } = await req.json();

    const subscriptions = await base44.entities.Subscription.filter({ user_email });
    const customerId = subscriptions[0]?.stripe_customer_id;

    if (!customerId) {
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.get('origin')}/Subscriptions`
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe portal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});