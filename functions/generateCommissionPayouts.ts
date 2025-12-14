import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commission_id } = await req.json();
    
    if (!commission_id) {
      return Response.json({ error: 'commission_id is required' }, { status: 400 });
    }

    // Fetch commission
    const commissions = await base44.asServiceRole.entities.Commission.filter({ id: commission_id });
    const commission = commissions[0];
    
    if (!commission) {
      return Response.json({ error: 'Commission not found' }, { status: 404 });
    }

    // Check if already has payouts
    const existingPayouts = await base44.asServiceRole.entities.Payout.filter({ commission_id });
    if (existingPayouts.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'Payouts already generated for this commission',
        payouts: existingPayouts 
      });
    }

    // Create batch
    const batch = await base44.asServiceRole.entities.PayoutBatch.create({
      batch_name: `Comissão ${commission.property_title || commission_id.substring(0, 8)}`,
      batch_date: new Date().toISOString().split('T')[0],
      total_amount: commission.commission_value || 0,
      status: 'pending',
      payment_method: 'bank_transfer',
      scheduled_date: new Date().toISOString().split('T')[0],
      notes: `Pagamentos automáticos da comissão ${commission.property_title || ''}`
    });

    const payouts = [];
    let totalPayouts = 0;

    // Agent payout
    if (commission.agent_email && commission.agent_commission > 0) {
      const agentPayout = await base44.asServiceRole.entities.Payout.create({
        commission_id,
        batch_id: batch.id,
        recipient_email: commission.agent_email,
        recipient_name: commission.agent_name || commission.agent_email,
        recipient_type: 'agent',
        amount: commission.agent_commission,
        currency: 'EUR',
        payment_method: 'bank_transfer',
        payment_status: 'pending',
        scheduled_date: new Date().toISOString().split('T')[0],
        property_title: commission.property_title,
        deal_value: commission.deal_value
      });
      payouts.push(agentPayout);
      totalPayouts++;
    }

    // Partner payout
    if (commission.partner_name && commission.partner_commission > 0) {
      const partnerPayout = await base44.asServiceRole.entities.Payout.create({
        commission_id,
        batch_id: batch.id,
        recipient_email: commission.client_email || '',
        recipient_name: commission.partner_name,
        recipient_type: 'partner',
        amount: commission.partner_commission,
        currency: 'EUR',
        payment_method: 'bank_transfer',
        payment_status: 'pending',
        scheduled_date: new Date().toISOString().split('T')[0],
        property_title: commission.property_title,
        deal_value: commission.deal_value
      });
      payouts.push(partnerPayout);
      totalPayouts++;
    }

    // Company/remaining payout (if any)
    const agentTotal = commission.agent_commission || 0;
    const partnerTotal = commission.partner_commission || 0;
    const remainingAmount = commission.commission_value - agentTotal - partnerTotal;

    if (remainingAmount > 0.01) {
      const companyPayout = await base44.asServiceRole.entities.Payout.create({
        commission_id,
        batch_id: batch.id,
        recipient_email: user.email,
        recipient_name: 'Empresa',
        recipient_type: 'company',
        amount: remainingAmount,
        currency: 'EUR',
        payment_method: 'bank_transfer',
        payment_status: 'pending',
        scheduled_date: new Date().toISOString().split('T')[0],
        property_title: commission.property_title,
        deal_value: commission.deal_value
      });
      payouts.push(companyPayout);
      totalPayouts++;
    }

    // Update batch with totals
    await base44.asServiceRole.entities.PayoutBatch.update(batch.id, {
      total_payouts: totalPayouts,
      payout_ids: payouts.map(p => p.id)
    });

    // Create notification
    await base44.asServiceRole.entities.Notification.create({
      title: 'Pagamentos Gerados',
      message: `${totalPayouts} pagamento(s) criado(s) para a comissão de ${commission.property_title || 'sem título'}`,
      type: 'system',
      user_email: user.email,
      related_id: batch.id,
      related_type: 'PayoutBatch'
    });

    return Response.json({
      success: true,
      batch,
      payouts,
      message: `${totalPayouts} pagamento(s) gerado(s) com sucesso`
    });

  } catch (error) {
    console.error('Error generating payouts:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});