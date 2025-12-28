import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { 
      name, 
      email, 
      phone, 
      message, 
      property_id, 
      property_title,
      interest_type,
      source_page,
      wants_appointment,
      location,
      budget
    } = body;

    // Validar dados obrigatórios
    if (!name || !email || !message) {
      return Response.json({ 
        success: false, 
        error: 'Dados incompletos' 
      }, { status: 400 });
    }

    // 1. Criar/Atualizar Contacto no CRM
    let contactId = null;
    let contact = null;

    try {
      // Procurar contacto existente por email
      const existingContacts = await base44.asServiceRole.entities.ClientContact.filter({ 
        email: email.toLowerCase() 
      });

      if (existingContacts.length > 0) {
        // Contacto existe - atualizar última interação
        contact = existingContacts[0];
        contactId = contact.id;
        
        await base44.asServiceRole.entities.ClientContact.update(contactId, {
          last_interaction_date: new Date().toISOString(),
          interaction_count: (contact.interaction_count || 0) + 1
        });
      } else {
        // Criar novo contacto
        const { data: refData } = await base44.asServiceRole.functions.invoke('generateRefId', { 
          entity_type: 'ClientContact' 
        });

        contact = await base44.asServiceRole.entities.ClientContact.create({
          ref_id: refData.ref_id,
          full_name: name,
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || '',
          email: email.toLowerCase(),
          phone: phone || '',
          contact_type: 'client',
          source: source_page === 'property' ? 'website' : 'direct_contact',
          status: 'active',
          interaction_count: 1,
          last_interaction_date: new Date().toISOString()
        });
        
        contactId = contact.id;
      }
    } catch (error) {
      console.error('Error managing contact:', error);
    }

    // 2. Criar/Atualizar Oportunidade
    let opportunityId = null;

    try {
      // Procurar oportunidade existente
      const existingOpportunities = await base44.asServiceRole.entities.Opportunity.filter({
        buyer_email: email.toLowerCase(),
        status: { $in: ['new', 'contacted', 'qualified', 'visit_scheduled'] }
      });

      if (existingOpportunities.length > 0) {
        // Atualizar oportunidade existente
        const opp = existingOpportunities[0];
        opportunityId = opp.id;

        const quickNotes = opp.quick_notes || [];
        quickNotes.push({
          text: `💬 Nova mensagem via ${source_page === 'property' ? 'página de imóvel' : 'website'}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
          date: new Date().toISOString(),
          by: 'website_form'
        });

        await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
          last_contact_date: new Date().toISOString(),
          engagement_score: (opp.engagement_score || 0) + 15,
          quick_notes: quickNotes.slice(-20),
          ...(property_id && !opp.property_id && { property_id, property_title })
        });

        // Se pediu visita, atualizar status
        if (wants_appointment && opp.status === 'new') {
          await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
            status: 'contacted'
          });
        }
      } else {
        // Criar nova oportunidade
        const { data: refData } = await base44.asServiceRole.functions.invoke('generateRefId', { 
          entity_type: 'Opportunity' 
        });

        const newOpp = await base44.asServiceRole.entities.Opportunity.create({
          ref_id: refData.ref_id,
          lead_type: 'comprador',
          buyer_name: name,
          buyer_email: email.toLowerCase(),
          buyer_phone: phone || '',
          message: message,
          property_id: property_id || null,
          property_title: property_title || '',
          location: location || '',
          budget: budget ? Number(budget) : null,
          status: wants_appointment ? 'contacted' : 'new',
          priority: interest_type === 'visit' ? 'high' : 'medium',
          lead_source: source_page === 'property' ? 'website' : 'direct_contact',
          source_detail: interest_type || 'contact_form',
          contact_id: contactId,
          profile_id: contactId,
          engagement_score: 15,
          last_contact_date: new Date().toISOString(),
          quick_notes: [{
            text: `📧 Primeiro contacto via ${source_page === 'property' ? 'página de imóvel' : 'website'}: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
            date: new Date().toISOString(),
            by: 'website_form'
          }]
        });

        opportunityId = newOpp.id;

        // Vincular ao contacto
        if (contactId) {
          const linkedIds = contact.linked_opportunity_ids || [];
          await base44.asServiceRole.entities.ClientContact.update(contactId, {
            linked_opportunity_ids: [...linkedIds, opportunityId]
          });
        }
      }
    } catch (error) {
      console.error('Error managing opportunity:', error);
    }

    // 3. Criar registo de comunicação
    try {
      if (contactId) {
        await base44.asServiceRole.entities.CommunicationLog.create({
          contact_id: contactId,
          opportunity_id: opportunityId,
          type: 'inbound',
          channel: 'website_form',
          subject: interest_type === 'visit' ? 'Pedido de Visita' :
                   interest_type === 'financing' ? 'Pedido de Financiamento' :
                   interest_type === 'info' ? 'Pedido de Informações' : 'Contacto Website',
          message: message,
          from_email: email,
          from_name: name,
          status: 'received',
          metadata: {
            property_id,
            property_title,
            interest_type,
            wants_appointment,
            source_page
          }
        });
      }
    } catch (error) {
      console.error('Error creating communication log:', error);
    }

    // 4. Criar notificação para equipa
    try {
      await base44.asServiceRole.entities.Notification.create({
        title: `💬 Novo Contacto via Website`,
        message: `${name} enviou uma mensagem${property_title ? ` sobre "${property_title}"` : ''}`,
        type: 'lead',
        priority: wants_appointment ? 'high' : 'medium',
        broadcast_type: 'admins_only',
        related_entity: 'Opportunity',
        related_entity_id: opportunityId,
        is_read: false,
        metadata: {
          contact_name: name,
          contact_email: email,
          interest_type,
          property_id
        }
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }

    // 5. Enviar email de confirmação ao visitante
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'ZuConnect',
        subject: 'Recebemos a sua mensagem!',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f172a;">Olá ${name},</h2>
            <p>Obrigado por entrar em contacto connosco!</p>
            <p>A sua mensagem foi recebida e entraremos em contacto consigo brevemente.</p>
            ${property_title ? `<p><strong>Imóvel:</strong> ${property_title}</p>` : ''}
            <p><strong>A sua mensagem:</strong></p>
            <p style="background: #f1f5f9; padding: 15px; border-radius: 8px;">${message}</p>
            <br/>
            <p>Atenciosamente,<br/>Equipa ZuConnect</p>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }

    // Guardar email do guest no localStorage (será feito no frontend)
    return Response.json({ 
      success: true,
      opportunity_id: opportunityId,
      contact_id: contactId,
      guest_email: email // Frontend guardará isto
    });

  } catch (error) {
    console.error('submitPublicContact error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});