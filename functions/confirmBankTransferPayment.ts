import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Esta função deve ser chamada manualmente por um admin após confirmar o pagamento
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { subscription_id, user_email } = await req.json();

    // Buscar subscrição pendente
    let subscription;
    if (subscription_id) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ id: subscription_id });
      subscription = subs[0];
    } else if (user_email) {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ 
        user_email: user_email,
        status: 'pending_payment'
      });
      subscription = subs[0];
    }

    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Ativar subscrição
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    await base44.asServiceRole.entities.Subscription.update(subscription.id, {
      status: 'active',
      payment_confirmed_at: now.toISOString(),
      payment_confirmed_by: user.email,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString()
    });

    // Enviar email de confirmação
    await base44.asServiceRole.functions.invoke('sendResendEmail', {
      to: subscription.user_email,
      subject: 'Subscrição Ativada com Sucesso!',
      html: `
        <h2>A sua subscrição foi ativada!</h2>
        <p>Confirmámos o recebimento do seu pagamento.</p>
        <p><strong>Plano:</strong> ${subscription.plan}</p>
        <p><strong>Válido até:</strong> ${periodEnd.toLocaleDateString('pt-PT')}</p>
        <p>Obrigado por confiar em nós!</p>
      `
    });

    return Response.json({
      success: true,
      subscription_id: subscription.id,
      status: 'active',
      period_end: periodEnd.toISOString()
    });

  } catch (error) {
    console.error('[confirmBankTransferPayment] Error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});