import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    if (subscription.status !== 'pending_payment') {
      return Response.json({ error: 'Subscription is not pending payment' }, { status: 400 });
    }

    const amount = subscription.plan === 'premium' ? 49 : subscription.plan === 'enterprise' ? 149 : 0;
    const bankDetails = subscription.payment_details;

    // Send reminder email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: subscription.user_email,
      subject: `Lembrete: Pagamento Pendente - Subscrição ${subscription.plan}`,
      body: `
        <h2>Lembrete de Pagamento</h2>
        <p>A sua subscrição ${subscription.plan} está aguardando confirmação de pagamento.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Banco:</strong> ${bankDetails.bank_name}</p>
          <p><strong>IBAN:</strong> ${bankDetails.iban}</p>
          <p><strong>SWIFT/BIC:</strong> ${bankDetails.swift}</p>
          <p><strong>Titular:</strong> ${bankDetails.account_holder}</p>
          <p><strong>Montante:</strong> €${amount}</p>
          <p><strong>Referência:</strong> <span style="font-family: monospace; background: white; padding: 5px;">${subscription.payment_reference}</span></p>
        </div>
        
        <p><strong>Importante:</strong> Inclua a referência para identificarmos o seu pagamento.</p>
        <p>Se já efetuou o pagamento, por favor ignore este email. Processaremos assim que recebermos a confirmação bancária.</p>
      `
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('[sendPaymentReminder] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});