import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Função para processar a retenção de dados conforme RGPD
 * Identifica e arquiva/anonimiza dados que excedam o período de retenção
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { retention_days = 1095 } = await req.json(); // Padrão: 3 anos

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention_days);

    // Contactos sem consentimento e sem atividade recente
    const oldContacts = await base44.asServiceRole.entities.ClientContact.filter({
      rgpd_consent: false
    });

    const contactsToAnonymize = oldContacts.filter(c => {
      const lastActivity = c.last_contact_date || c.updated_date || c.created_date;
      return new Date(lastActivity) < cutoffDate;
    });

    let anonymizedCount = 0;

    for (const contact of contactsToAnonymize) {
      // Verificar se tem oportunidades ou contratos ativos
      const activeOpportunities = await base44.asServiceRole.entities.Opportunity.filter({
        buyer_email: contact.email,
        status: { $in: ['new', 'contacted', 'qualified', 'visit_scheduled', 'proposal', 'negotiation'] }
      });

      const activeContracts = await base44.asServiceRole.entities.Contract.filter({
        $or: [
          { party_a_email: contact.email },
          { party_b_email: contact.email }
        ],
        status: { $in: ['active', 'pending_signature'] }
      });

      // Só anonimizar se não tiver nada ativo
      if (activeOpportunities.length === 0 && activeContracts.length === 0) {
        await base44.asServiceRole.entities.ClientContact.update(contact.id, {
          full_name: "DADOS RETIDOS - ANONIMIZADO",
          first_name: "RETIDO",
          last_name: "ANONIMIZADO",
          email: `retention_${contact.id}@rgpd.anonymized`,
          phone: "",
          secondary_phone: "",
          address: "",
          nif: "",
          notes: `Anonimizado automaticamente - retenção de dados excedida (${retention_days} dias)`,
          rgpd_consent_revoked: true,
          rgpd_consent_revoked_date: new Date().toISOString()
        });

        // Registar no log
        await base44.asServiceRole.entities.GDPRLog.create({
          contact_id: contact.id,
          contact_email: contact.email,
          action_type: "data_anonymized",
          description: `Dados anonimizados automaticamente após ${retention_days} dias sem consentimento e sem atividade`,
          performed_by: "system",
          performed_by_name: "Sistema Automático",
          legal_basis: "legal_obligation",
          request_status: "completed",
          completion_date: new Date().toISOString()
        });

        anonymizedCount++;
      }
    }

    return Response.json({
      success: true,
      processed: contactsToAnonymize.length,
      anonymized: anonymizedCount,
      retention_days,
      cutoff_date: cutoffDate.toISOString()
    });

  } catch (error) {
    console.error("Error processing data retention:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});