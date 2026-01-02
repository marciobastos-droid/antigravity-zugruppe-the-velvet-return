import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BANK_DETAILS = {
  bank_name: "Banco Exemplo",
  iban: "PT50 0000 0000 0000 0000 0000 0",
  swift: "ABCDPTPL",
  account_holder: "Zugruppe Unipessoal Lda"
};

const PLAN_PRICES = {
  premium: 49,
  enterprise: 149
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!PLAN_PRICES[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    const reference = `SUB-${user.email.split('@')[0].toUpperCase()}-${Date.now()}`;

    // Criar registo pendente de subscrição
    await base44.asServiceRole.entities.Subscription.create({
      user_email: user.email,
      plan: plan,
      status: 'pending_payment',
      payment_method: 'bank_transfer',
      amount: amount,
      transfer_reference: reference,
      transfer_created_at: new Date().toISOString(),
      transfer_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
    });

    // Enviar email com detalhes
    await base44.asServiceRole.functions.invoke('sendResendEmail', {
      to: user.email,
      subject: `Detalhes de Pagamento - Subscrição ${plan}`,
      html: `
        <h2>Obrigado pelo seu interesse no plano ${plan}!</h2>
        <p>Para ativar a sua subscrição, por favor efetue a transferência bancária com os seguintes dados:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Banco:</strong> ${BANK_DETAILS.bank_name}</p>
          <p><strong>IBAN:</strong> ${BANK_DETAILS.iban}</p>
          <p><strong>SWIFT/BIC:</strong> ${BANK_DETAILS.swift}</p>
          <p><strong>Titular:</strong> ${BANK_DETAILS.account_holder}</p>
          <p><strong>Montante:</strong> €${amount}</p>
          <p><strong>Referência:</strong> <span style="font-family: monospace; background: white; padding: 5px;">${reference}</span></p>
        </div>
        
        <p><strong>Importante:</strong> Por favor inclua a referência na sua transferência para que possamos identificar o pagamento.</p>
        <p>Após recebermos a confirmação do pagamento (normalmente 1-2 dias úteis), a sua subscrição será ativada automaticamente.</p>
        <p>A referência é válida por 7 dias.</p>
        
        <p>Se tiver alguma dúvida, não hesite em contactar-nos.</p>
      `
    });

    return Response.json({
      success: true,
      bank_details: BANK_DETAILS,
      amount: amount,
      reference: reference,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('[createBankTransferSubscription] Error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});