import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PLAN_PRICES = {
  premium: 49,
  enterprise: 149
};

const BANK_DETAILS = {
  bank_name: "Bankinter",
  iban: "PT50 0269 0736 0020 9397 5683 6",
  swift: "BKBKPTPLXXX",
  account_holder: "Privileged Approach Unip Lda"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.user_type !== 'admin' && user.user_type !== 'gestor')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subscription_id } = await req.json();

    // Get subscription
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ id: subscription_id });
    const subscription = subscriptions[0];

    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Generate new reference
    const reference = `RNW-${subscription.user_email.split('@')[0].toUpperCase()}-${Date.now()}`;
    const amount = PLAN_PRICES[subscription.plan];

    // Update subscription to pending renewal
    await base44.asServiceRole.entities.Subscription.update(subscription_id, {
      status: 'pending_payment',
      payment_method: 'bank_transfer',
      payment_reference: reference,
      payment_details: BANK_DETAILS
    });

    // Send email with payment details
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: subscription.user_email,
      subject: `Renovação da Subscrição ${subscription.plan}`,
      body: `
        <h2>Renovação da Subscrição ${subscription.plan}</h2>
        <p>A sua subscrição está próxima do fim do período. Para renovar, efetue a transferência bancária:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Banco:</strong> ${BANK_DETAILS.bank_name}</p>
          <p><strong>IBAN:</strong> ${BANK_DETAILS.iban}</p>
          <p><strong>SWIFT/BIC:</strong> ${BANK_DETAILS.swift}</p>
          <p><strong>Titular:</strong> ${BANK_DETAILS.account_holder}</p>
          <p><strong>Montante:</strong> €${amount}</p>
          <p><strong>Referência:</strong> <span style="font-family: monospace; background: white; padding: 5px;">${reference}</span></p>
        </div>
        
        <p><strong>Importante:</strong> Inclua a referência na transferência para identificação do pagamento.</p>
        <p>Após confirmação (1-2 dias úteis), a sua subscrição será renovada automaticamente.</p>
      `
    });

    return Response.json({
      success: true,
      reference,
      amount
    });

  } catch (error) {
    console.error('[renewSubscription] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});