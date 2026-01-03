import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId, newAgent } = await req.json();

    if (entityType === 'contact') {
      // Atualizar o agente no contacto e em todas as oportunidades relacionadas
      const contact = await base44.asServiceRole.entities.ClientContact.filter({ id: entityId });
      if (contact.length === 0) {
        return Response.json({ error: 'Contact not found' }, { status: 404 });
      }

      const linkedOpportunityIds = contact[0].linked_opportunity_ids || [];
      
      // Atualizar assigned_to em todas as oportunidades vinculadas
      for (const oppId of linkedOpportunityIds) {
        await base44.asServiceRole.entities.Opportunity.update(oppId, {
          assigned_to: newAgent || null,
          assigned_agent_name: newAgent ? (await base44.asServiceRole.entities.User.filter({ email: newAgent }))[0]?.full_name : null
        });
      }

      // Atualizar também oportunidades que têm o profile_id igual ao contacto
      const opportunitiesByProfile = await base44.asServiceRole.entities.Opportunity.filter({ profile_id: entityId });
      for (const opp of opportunitiesByProfile) {
        if (!linkedOpportunityIds.includes(opp.id)) {
          await base44.asServiceRole.entities.Opportunity.update(opp.id, {
            assigned_to: newAgent || null,
            assigned_agent_name: newAgent ? (await base44.asServiceRole.entities.User.filter({ email: newAgent }))[0]?.full_name : null
          });
        }
      }

      return Response.json({ 
        success: true, 
        updated: linkedOpportunityIds.length + opportunitiesByProfile.filter(o => !linkedOpportunityIds.includes(o.id)).length,
        message: 'Agente sincronizado com sucesso'
      });

    } else if (entityType === 'opportunity') {
      // Atualizar o agente na oportunidade e no contacto relacionado
      const opportunity = await base44.asServiceRole.entities.Opportunity.filter({ id: entityId });
      if (opportunity.length === 0) {
        return Response.json({ error: 'Opportunity not found' }, { status: 404 });
      }

      const opp = opportunity[0];
      const contactId = opp.profile_id || opp.contact_id;

      if (contactId) {
        // Atualizar assigned_agent no contacto
        await base44.asServiceRole.entities.ClientContact.update(contactId, {
          assigned_agent: newAgent || null
        });

        return Response.json({ 
          success: true, 
          message: 'Agente sincronizado com o contacto'
        });
      } else {
        return Response.json({ 
          success: true, 
          message: 'Oportunidade não tem contacto vinculado'
        });
      }
    }

    return Response.json({ error: 'Invalid entityType' }, { status: 400 });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});