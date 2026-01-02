import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PLAN_PRICES = {
  free: 0,
  premium: 49,
  enterprise: 149
};

const PLAN_CONFIG = {
  free: {
    features: {
      unlimited_properties: false,
      advanced_analytics: false,
      priority_support: false,
      early_access: false,
      market_reports: false,
      api_access: false
    },
    tools_access: {
      importProperties: true,
      importLeads: true,
      importContacts: true,
      exportProperties: true,
      dataExporter: true,
      calendar: true,
      description: true,
      creditSimulator: true,
      deedCosts: true
    }
  },
  premium: {
    features: {
      unlimited_properties: true,
      advanced_analytics: true,
      priority_support: true,
      early_access: true,
      market_reports: true,
      api_access: true
    },
    tools_access: {
      importProperties: true,
      importLeads: true,
      importContacts: true,
      importOpportunities: true,
      exportProperties: true,
      dataExporter: true,
      reportsExporter: true,
      bulkScore: true,
      crmSync: true,
      duplicateChecker: true,
      duplicateClients: true,
      inconsistencyChecker: true,
      linkContacts: true,
      imageValidator: true,
      emailHub: true,
      video: true,
      description: true,
      listingOptimizer: true,
      calendar: true,
      aiMatching: true,
      autoMatching: true,
      autoMatchingDashboard: true,
      marketIntelligence: true,
      propertyPerformance: true,
      pricing: true,
      creditSimulator: true,
      deedCosts: true,
      documents: true,
      notificationsDashboard: true,
      tagManager: true,
      marketingHub: true,
      socialMedia: true,
      portalIntegrations: true,
      propertyFeeds: true,
      seoAnalytics: true,
      facebookLeads: true,
      leadManagement: true
    }
  },
  enterprise: {
    features: {
      unlimited_properties: true,
      advanced_analytics: true,
      priority_support: true,
      early_access: true,
      market_reports: true,
      api_access: true,
      unlimited_users: true,
      white_label: true,
      dedicated_account_manager: true
    },
    tools_access: {
      importProperties: true,
      importLeads: true,
      importContacts: true,
      importOpportunities: true,
      exportProperties: true,
      dataExporter: true,
      reportsExporter: true,
      bulkScore: true,
      crmSync: true,
      duplicateChecker: true,
      duplicateClients: true,
      inconsistencyChecker: true,
      orphanCleaner: true,
      linkContacts: true,
      imageValidator: true,
      emailHub: true,
      gmailSync: true,
      gmailLinker: true,
      video: true,
      description: true,
      listingOptimizer: true,
      calendar: true,
      aiMatching: true,
      autoMatching: true,
      autoMatchingDashboard: true,
      marketIntelligence: true,
      propertyPerformance: true,
      pricing: true,
      creditSimulator: true,
      deedCosts: true,
      commissions: true,
      invoices: true,
      investorKeys: true,
      investorProperties: true,
      contractAutomation: true,
      documents: true,
      notificationsDashboard: true,
      smtpConfig: true,
      devNotes: true,
      tagManager: true,
      backupManager: true,
      auditLog: true,
      marketingHub: true,
      marketingCampaigns: true,
      landingPages: true,
      dynamicForms: true,
      seoManager: true,
      socialMedia: true,
      socialAdCreator: true,
      apiPublish: true,
      apiIntegrations: true,
      portalIntegrations: true,
      whatsapp: true,
      integrations: true,
      imageExtractor: true,
      excelImport: true,
      crmIntegrations: true,
      seoAnalytics: true,
      facebookCampaigns: true,
      facebookLeads: true,
      facebookForms: true,
      leadManagement: true,
      leadNurturing: true,
      jsonProcessor: true,
      propertyFeeds: true,
      externalSync: true,
      casafariSync: true
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.user_type !== 'admin' && user.user_type !== 'gestor')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subscription_id, new_plan } = await req.json();

    if (!PLAN_PRICES.hasOwnProperty(new_plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get subscription
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ id: subscription_id });
    const subscription = subscriptions[0];

    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const oldPrice = PLAN_PRICES[subscription.plan];
    const newPrice = PLAN_PRICES[new_plan];
    
    // Calculate prorated amount
    let proratedAmount = 0;
    let proratedDays = 0;
    
    if (subscription.current_period_end) {
      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      const daysRemaining = Math.max(0, Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24)));
      const daysInPeriod = 30;
      
      // Credit from old plan
      const creditAmount = (oldPrice / daysInPeriod) * daysRemaining;
      
      // Charge for new plan
      const chargeAmount = newPrice;
      
      proratedAmount = Math.max(0, chargeAmount - creditAmount);
      proratedDays = daysRemaining;
    } else {
      proratedAmount = newPrice;
    }

    // Get plan configuration
    const planConfig = PLAN_CONFIG[new_plan];

    // Update subscription
    await base44.asServiceRole.entities.Subscription.update(subscription_id, {
      plan: new_plan,
      features: planConfig.features,
      tools_access: planConfig.tools_access
    });

    // Send confirmation email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: subscription.user_email,
      subject: `Plano alterado para ${new_plan}`,
      body: `
        <h2>Plano Atualizado</h2>
        <p>O seu plano foi alterado de <strong>${subscription.plan}</strong> para <strong>${new_plan}</strong>.</p>
        
        ${proratedAmount > 0 ? `
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p><strong>Valor Proporcional a Pagar:</strong> €${proratedAmount.toFixed(2)}</p>
            <p style="font-size: 14px; color: #64748b;">
              Calculado com base nos ${proratedDays} dias restantes do período atual.
            </p>
          </div>
          
          <p>Para continuar com o novo plano, efetue a transferência:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Banco:</strong> ${BANK_DETAILS.bank_name}</p>
            <p><strong>IBAN:</strong> ${BANK_DETAILS.iban}</p>
            <p><strong>SWIFT/BIC:</strong> ${BANK_DETAILS.swift}</p>
            <p><strong>Titular:</strong> ${BANK_DETAILS.account_holder}</p>
            <p><strong>Montante:</strong> €${proratedAmount.toFixed(2)}</p>
          </div>
        ` : `
          <p>As novas funcionalidades estão disponíveis imediatamente!</p>
        `}
      `
    });

    return Response.json({
      success: true,
      prorated_amount: proratedAmount,
      days_remaining: proratedDays,
      old_plan: subscription.plan,
      new_plan: new_plan
    });

  } catch (error) {
    console.error('[changePlanProrated] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});