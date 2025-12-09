import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.10.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const PLAN_FEATURES = {
  premium: {
    advanced_analytics: true,
    priority_support: true,
    early_access: true,
    market_reports: true,
    unlimited_properties: true,
    api_access: true
  },
  enterprise: {
    advanced_analytics: true,
    priority_support: true,
    early_access: true,
    market_reports: true,
    unlimited_properties: true,
    api_access: true
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_email, plan } = session.metadata;

        // Create or update subscription
        const existing = await base44.asServiceRole.entities.Subscription.filter({ user_email });
        
        if (existing.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, {
            plan,
            status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            features: PLAN_FEATURES[plan] || {}
          });
        } else {
          await base44.asServiceRole.entities.Subscription.create({
            user_email,
            plan,
            status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            features: PLAN_FEATURES[plan] || {}
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_subscription_id: subscription.id 
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: subscription.status === 'active' ? 'active' : 
                    subscription.status === 'canceled' ? 'cancelled' : 'expired',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_subscription_id: subscription.id 
        });

        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: 'cancelled',
            plan: 'free',
            features: {}
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subs = await base44.asServiceRole.entities.Subscription.filter({ 
          stripe_customer_id: invoice.customer 
        });

        if (subs.length > 0) {
          const payment_history = subs[0].payment_history || [];
          payment_history.push({
            date: new Date().toISOString(),
            amount: invoice.amount_paid / 100,
            status: 'paid',
            invoice_url: invoice.hosted_invoice_url
          });

          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            payment_history
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});