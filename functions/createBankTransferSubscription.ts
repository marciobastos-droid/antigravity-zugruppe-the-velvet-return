import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BANK_DETAILS = {
  bank_name: "Bankinter",
  iban: "PT50 0269 0736 0020 9397 5683 6",
  swift: "BKBKPTPLXXX",
  account_holder: "Privileged Approach Unip Lda"
};

const PLAN_PRICES = {
  premium: 49,
  enterprise: 149
};

// Definir ferramentas e features por plano
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

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!PLAN_PRICES[plan]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];
    const reference = `SUB-${user.email.split('@')[0].toUpperCase()}-${Date.now()}`;
    const planConfig = PLAN_CONFIG[plan];

    // Criar registo pendente de subscrição com features e tools
    await base44.asServiceRole.entities.Subscription.create({
      user_email: user.email,
      plan: plan,
      status: 'pending_payment',
      payment_method: 'bank_transfer',
      payment_reference: reference,
      payment_details: BANK_DETAILS,
      features: planConfig.features,
      tools_access: planConfig.tools_access,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Enviar email com detalhes usando Core.SendEmail
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `Detalhes de Pagamento - Subscrição ${plan}`,
      body: `
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