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
        console.log(`[CONVERT] Starting conversion for: ${lead.full_name}`);
        
        // Gerar ref_id simples para a oportunidade
        const allOpportunities = await base44.asServiceRole.entities.Opportunity.list();
        const maxOppNumber = Math.max(0, ...allOpportunities.map(o => {
          const match = o.ref_id?.match(/OPO-(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }));
        const oppRefId = `OPO-${String(maxOppNumber + 1).padStart(5, '0')}`;
        console.log(`[CONVERT] Generated Opportunity ref_id: ${oppRefId}`);

        // Verificar se já existe contacto com este email
        let contactId = null;
        if (lead.email) {
          console.log(`[CONVERT] Checking for existing contact with email: ${lead.email}`);
          const existingContacts = await base44.asServiceRole.entities.ClientContact.filter({ 
            email: lead.email 
          });
          
          if (existingContacts && existingContacts.length > 0) {
            contactId = existingContacts[0].id;
            console.log(`[CONVERT] Found existing contact: ${contactId}`);
          } else {
            // Gerar ref_id simples para o contacto
            const allContacts = await base44.asServiceRole.entities.ClientContact.list();
            const maxContactNumber = Math.max(0, ...allContacts.map(c => {
              const match = c.ref_id?.match(/CLI-(\d+)/);
              return match ? parseInt(match[1]) : 0;
            }));
            const contactRefId = `CLI-${String(maxContactNumber + 1).padStart(5, '0')}`;
            console.log(`[CONVERT] Generated ClientContact ref_id: ${contactRefId}`);
            
            // Criar novo contacto usando create_entity_records tool
            console.log(`[CONVERT] Creating new ClientContact using tool...`);
            const newContacts = await base44.asServiceRole.tools.createEntityRecords('ClientContact', [{
              ref_id: contactRefId,
              full_name: lead.full_name,
              email: lead.email,
              phone: lead.phone,
              city: lead.location,
              contact_type: "client",
              source: "facebook_ads",
              notes: `Importado do Facebook Lead Ads\nCampanha: ${lead.campaign_name || lead.campaign_id}\n${lead.message || ''}`
            }]);
            contactId = newContacts[0].id;
            console.log(`[CONVERT] Created ClientContact: ${contactId}`);
          }
        }

        // Criar oportunidade usando create_entity_records tool
        console.log(`[CONVERT] Creating Opportunity using tool...`);
        const opportunities = await base44.asServiceRole.tools.createEntityRecords('Opportunity', [{
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
        const opportunity = opportunities[0];
        console.log(`[CONVERT] Created Opportunity: ${opportunity.id}`);

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