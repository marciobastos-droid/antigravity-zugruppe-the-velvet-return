import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { opportunity_id } = await req.json();

    if (!opportunity_id) {
      return Response.json({ error: 'opportunity_id is required' }, { status: 400 });
    }

    // Get opportunity details
    const opportunities = await base44.asServiceRole.entities.Opportunity.filter({ 
      id: opportunity_id 
    });

    if (opportunities.length === 0) {
      return Response.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const opportunity = opportunities[0];

    // Only process won/closed opportunities
    if (opportunity.status !== 'won' && opportunity.status !== 'closed') {
      return Response.json({ 
        error: 'Only won or closed opportunities can generate commissions',
        status: opportunity.status 
      }, { status: 400 });
    }

    // Check if commission already exists for this opportunity
    const existingCommissions = await base44.asServiceRole.entities.Commission.filter({
      opportunity_id: opportunity_id
    });

    if (existingCommissions.length > 0) {
      return Response.json({ 
        message: 'Commission already exists for this opportunity',
        commission: existingCommissions[0]
      }, { status: 200 });
    }

    // Get assigned agent details
    if (!opportunity.assigned_to && !opportunity.assigned_agent_id) {
      return Response.json({ 
        error: 'No agent assigned to this opportunity' 
      }, { status: 400 });
    }

    const agentEmail = opportunity.assigned_to;
    const allUsers = await base44.asServiceRole.entities.User.list();
    const agent = allUsers.find(u => u.email === agentEmail);

    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get commission configuration
    const commissionConfig = agent.commission_config || {};
    const defaultCommissionPercentage = commissionConfig.default_commission_percentage || 3;
    const agentSplitPercentage = commissionConfig.default_split_percentage || 50;
    const companySplitPercentage = commissionConfig.company_split_percentage || 50;
    const autoGenerate = commissionConfig.auto_generate_commissions !== false;

    if (!autoGenerate) {
      return Response.json({ 
        message: 'Auto-generation disabled for this agent',
        agent_email: agentEmail
      }, { status: 200 });
    }

    // Get property details if available
    let property = null;
    let propertyTitle = opportunity.property_title || '';
    let propertyId = opportunity.property_id || null;

    if (opportunity.property_id) {
      const properties = await base44.asServiceRole.entities.Property.filter({
        id: opportunity.property_id
      });
      if (properties.length > 0) {
        property = properties[0];
        propertyTitle = property.title;
        propertyId = property.id;
      }
    }

    // Calculate values
    const dealValue = opportunity.estimated_value || property?.price || 0;
    
    if (dealValue === 0) {
      return Response.json({ 
        error: 'Deal value is 0 or not defined' 
      }, { status: 400 });
    }

    const commissionValue = (dealValue * defaultCommissionPercentage) / 100;
    const agentCommission = (commissionValue * agentSplitPercentage) / 100;
    const partnerCommission = (commissionValue * companySplitPercentage) / 100;

    // Get deal type
    let dealType = 'sale';
    if (property?.listing_type === 'rent') {
      dealType = 'rent';
    } else if (opportunity.lead_type?.includes('arrendamento') || opportunity.lead_type?.includes('rent')) {
      dealType = 'rent';
    }

    // Get client/owner info
    let clientName = opportunity.buyer_name || '';
    let clientEmail = opportunity.buyer_email || '';

    // Try to get owner info from property
    if (property) {
      if (property.owner_name) clientName = property.owner_name;
      if (property.owner_email) clientEmail = property.owner_email;
    }

    // Create commission record
    const commissionData = {
      opportunity_id: opportunity_id,
      property_id: propertyId,
      property_title: propertyTitle,
      deal_type: dealType,
      deal_value: dealValue,
      commission_percentage: defaultCommissionPercentage,
      commission_value: commissionValue,
      agent_email: agentEmail,
      agent_name: agent.display_name || agent.full_name || agentEmail,
      agent_split: agentSplitPercentage,
      agent_commission: agentCommission,
      partner_name: 'Empresa',
      partner_split: companySplitPercentage,
      partner_commission: partnerCommission,
      client_name: clientName,
      client_email: clientEmail,
      close_date: opportunity.actual_close_date || new Date().toISOString().split('T')[0],
      payment_status: 'pending',
      notes: `Comissão gerada automaticamente para oportunidade ${opportunity.ref_id || opportunity_id}`
    };

    const commission = await base44.asServiceRole.entities.Commission.create(commissionData);

    // Create notification for agent
    try {
      await base44.asServiceRole.entities.Notification.create({
        title: '💰 Nova Comissão Gerada',
        message: `Foi gerada uma comissão de €${commissionValue.toFixed(2)} para o negócio "${propertyTitle}". A sua parte: €${agentCommission.toFixed(2)}`,
        type: 'system',
        priority: 'medium',
        user_email: agentEmail,
        related_entity: 'Commission',
        related_entity_id: commission.id,
        is_read: false
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    return Response.json({
      success: true,
      commission: commission,
      calculation: {
        deal_value: dealValue,
        commission_percentage: defaultCommissionPercentage,
        total_commission: commissionValue,
        agent_split: agentSplitPercentage,
        agent_commission: agentCommission,
        company_split: companySplitPercentage,
        company_commission: partnerCommission
      }
    });

  } catch (error) {
    console.error('Error generating commission:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});