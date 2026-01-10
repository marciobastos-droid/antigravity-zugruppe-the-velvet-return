import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user || (user.role !== 'admin' && user.user_type?.toLowerCase() !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calcular datas de hoje e ontem
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Buscar todas as FacebookLeads não convertidas de ontem e hoje
    const allLeads = await base44.asServiceRole.entities.FacebookLead.list();
    const leadsToConvert = allLeads.filter(lead => {
      if (lead.status === 'converted') return false;
      const createdDate = new Date(lead.created_date);
      return createdDate >= yesterday;
    });

    console.log(`Found ${leadsToConvert.length} leads to convert`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const lead of leadsToConvert) {
      try {
        // Gerar ref_id para a oportunidade
        const refIdResponse = await base44.asServiceRole.functions.invoke('generateRefId', { 
          entity_type: 'Opportunity' 
        });
        const oppRefId = refIdResponse.data.ref_id;

        // Verificar se já existe contacto com este email
        let contactId = null;
        if (lead.email) {
          const existingContacts = await base44.asServiceRole.entities.ClientContact.filter({ 
            email: lead.email 
          });
          
          if (existingContacts && existingContacts.length > 0) {
            contactId = existingContacts[0].id;
          } else {
            // Gerar ref_id para o contacto
            const contactRefIdResponse = await base44.asServiceRole.functions.invoke('generateRefId', { 
              entity_type: 'ClientContact' 
            });
            
            // Criar novo contacto via bulkCreate (bypasses RLS)
            const [newContact] = await base44.asServiceRole.entities.ClientContact.bulkCreate([{
              ref_id: contactRefIdResponse.data.ref_id,
              full_name: lead.full_name,
              email: lead.email,
              phone: lead.phone,
              city: lead.location,
              contact_type: "client",
              source: "facebook_ads",
              notes: `Importado do Facebook Lead Ads\nCampanha: ${lead.campaign_name || lead.campaign_id}\n${lead.message || ''}`
            }]);
            contactId = newContact.id;
          }
        }

        // Criar oportunidade via bulkCreate (bypasses RLS)
        const [opportunity] = await base44.asServiceRole.entities.Opportunity.bulkCreate([{
          ref_id: oppRefId,
          lead_type: "comprador",
          contact_id: contactId || undefined,
          buyer_name: lead.full_name,
          buyer_email: lead.email,
          buyer_phone: lead.phone,
          location: lead.location,
          budget: lead.budget ? Number(lead.budget) : undefined,
          property_type_interest: lead.property_type,
          message: `Lead do Facebook (Campanha: ${lead.campaign_name || lead.campaign_id})\n\n${lead.message || ''}`,
          status: "new",
          priority: "high",
          lead_source: "facebook_ads",
          source_detail: lead.campaign_name || lead.campaign_id
        }]);

        // Atualizar FacebookLead
        await base44.asServiceRole.entities.FacebookLead.update(lead.id, {
          status: "converted",
          converted_to_opportunity_id: opportunity.id
        });

        successCount++;
        console.log(`Converted lead: ${lead.full_name} -> Opportunity ${oppRefId}`);
      } catch (error) {
        errorCount++;
        errors.push({
          lead_name: lead.full_name,
          lead_email: lead.email,
          error: error.message
        });
        console.error(`Failed to convert lead ${lead.full_name}:`, error);
      }
    }

    return Response.json({
      success: true,
      total_leads: leadsToConvert.length,
      converted: successCount,
      failed: errorCount,
      errors: errors
    });

  } catch (error) {
    console.error('Error promoting leads:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});