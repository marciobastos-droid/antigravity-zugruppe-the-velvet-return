import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const payload = await req.json();
    const { 
      name, 
      email, 
      phone, 
      message, 
      company,
      property_id, 
      property_title,
      source_page 
    } = payload;

    if (!name || !email || !message) {
      return Response.json({ error: 'Campos obrigatórios em falta' }, { status: 400 });
    }

    // Gerar ref_id usando service role
    let refId = null;
    try {
      const recentOpps = await base44.asServiceRole.entities.Opportunity.list('-created_date', 100);
      let maxNum = 0;
      for (const opp of recentOpps) {
        if (opp.ref_id) {
          const match = opp.ref_id.match(/^OPO-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      refId = `OPO-${String(maxNum + 1).padStart(5, '0')}`;
    } catch (e) {
      console.warn('[submitPublicContact] Failed to generate ref_id:', e);
    }

    // Criar oportunidade usando service role (bypass RLS)
    const opportunityData = {
      lead_type: "comprador",
      buyer_name: name,
      buyer_email: email,
      buyer_phone: phone || '',
      company_name: company || null,
      message: `[${source_page || 'Website'}] ${message}`,
      property_id: property_id || null,
      property_title: property_title || null,
      status: "new",
      lead_source: "website",
      source_detail: source_page || 'public_page'
    };
    
    if (refId) {
      opportunityData.ref_id = refId;
    }

    const newOpportunity = await base44.asServiceRole.entities.Opportunity.create(opportunityData);
    console.log('[submitPublicContact] Opportunity created:', newOpportunity.id);

    // Buscar dados do imóvel se fornecido
    let propertyData = null;
    if (property_id) {
      try {
        const props = await base44.asServiceRole.entities.Property.filter({ id: property_id });
        propertyData = props[0] || null;
      } catch (e) {
        console.warn('[submitPublicContact] Failed to fetch property:', e);
      }
    }

    // Enviar email ao responsável
    try {
      const recipientEmail = propertyData?.assigned_consultant || 
                            propertyData?.created_by || 
                            propertyData?.agent_id || 
                            'info@zugruppe.com';
      
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Nova mensagem via ${source_page || 'Website'}: ${property_title || 'Contacto Geral'}`,
        body: `
          <h2>Nova mensagem recebida via ${source_page || 'Website Público'}</h2>
          ${property_title ? `<p><strong>Imóvel:</strong> ${property_title} ${refId ? `(${refId})` : ''}</p>` : ''}
          <p><strong>De:</strong> ${name} (${email})</p>
          ${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ''}
          ${company ? `<p><strong>Empresa:</strong> ${company}</p>` : ''}
          <p><strong>Mensagem:</strong></p>
          <p>${message}</p>
          <br>
          <p><a href="${Deno.env.get('BASE44_APP_URL') || 'https://zugruppe.base44.app'}/CRMAdvanced">Ver no CRM</a></p>
        `
      });
      console.log('[submitPublicContact] Email sent to:', recipientEmail);
    } catch (emailError) {
      console.warn('[submitPublicContact] Email failed:', emailError.message);
    }

    return Response.json({ 
      success: true, 
      opportunity_id: newOpportunity.id,
      ref_id: refId
    });
  } catch (error) {
    console.error('[submitPublicContact] Error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao processar contacto',
      details: error.toString()
    }, { status: 500 });
  }
});