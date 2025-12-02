import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && user.user_type?.toLowerCase() !== 'admin' && user.user_type?.toLowerCase() !== 'gestor')) {
      return Response.json({ error: 'Unauthorized - Admin/Gestor only' }, { status: 401 });
    }

    // Buscar todos os contactos e oportunidades
    const [contacts, opportunities] = await Promise.all([
      base44.asServiceRole.entities.ClientContact.list(),
      base44.asServiceRole.entities.Opportunity.list()
    ]);

    // Criar mapa de email -> contacto
    const emailToContact = {};
    contacts.forEach(c => {
      if (c.email) {
        emailToContact[c.email.toLowerCase()] = c;
      }
    });

    // Criar mapa de opportunity_id -> contacto (pelos linked_opportunity_ids)
    const oppIdToContact = {};
    contacts.forEach(c => {
      if (c.linked_opportunity_ids?.length > 0) {
        c.linked_opportunity_ids.forEach(oppId => {
          oppIdToContact[oppId] = c;
        });
      }
    });

    let updatedOpportunities = 0;
    let updatedContacts = 0;
    const results = [];

    for (const opp of opportunities) {
      let contact = null;
      
      // 1. Primeiro, verificar se já tem contact_id válido
      if (opp.contact_id) {
        contact = contacts.find(c => c.id === opp.contact_id);
      }
      
      // 2. Se não, procurar pelo profile_id
      if (!contact && opp.profile_id) {
        contact = contacts.find(c => c.id === opp.profile_id);
      }
      
      // 3. Se não, procurar nos linked_opportunity_ids
      if (!contact) {
        contact = oppIdToContact[opp.id];
      }
      
      // 4. Se não, procurar pelo email
      if (!contact && opp.buyer_email) {
        contact = emailToContact[opp.buyer_email.toLowerCase()];
      }

      if (contact) {
        const updates = {};
        
        // Atualizar contact_id na oportunidade se necessário
        if (opp.contact_id !== contact.id) {
          updates.contact_id = contact.id;
        }
        
        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Opportunity.update(opp.id, updates);
          updatedOpportunities++;
          results.push({
            type: 'opportunity',
            id: opp.id,
            name: opp.buyer_name,
            linkedTo: contact.full_name
          });
        }

        // Garantir que o contact tem esta oportunidade nos linked_opportunity_ids
        const linkedIds = contact.linked_opportunity_ids || [];
        if (!linkedIds.includes(opp.id)) {
          await base44.asServiceRole.entities.ClientContact.update(contact.id, {
            linked_opportunity_ids: [...linkedIds, opp.id]
          });
          updatedContacts++;
          results.push({
            type: 'contact',
            id: contact.id,
            name: contact.full_name,
            linkedOpp: opp.buyer_name
          });
        }
      }
    }

    return Response.json({
      success: true,
      summary: {
        totalOpportunities: opportunities.length,
        totalContacts: contacts.length,
        updatedOpportunities,
        updatedContacts
      },
      results
    });

  } catch (error) {
    console.error('Error linking contacts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});