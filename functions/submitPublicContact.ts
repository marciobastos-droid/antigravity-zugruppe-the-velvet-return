import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CUSTOM_DOMAIN = 'https://zuhaus.pt';

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

    // Send email notification using Resend
    try {
      const recipientEmail = propertyData?.assigned_consultant || 
                            propertyData?.created_by || 
                            propertyData?.agent_id || 
                            'info@zugruppe.com';
      
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@zugruppe.pt',
            to: recipientEmail,
            subject: `🎯 Nova Oportunidade: ${name}`,
            html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
      .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #d4af37; }
      .label { font-weight: bold; color: #0f172a; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎯 Nova Oportunidade</h1>
      </div>
      <div class="content">
        <p>Nova mensagem recebida via ${source_page || 'Website Público'}!</p>
        
        <div class="info-box">
          <p><span class="label">Nome:</span> ${name}</p>
          <p><span class="label">Email:</span> ${email}</p>
          ${phone ? `<p><span class="label">Telefone:</span> ${phone}</p>` : ''}
          ${company ? `<p><span class="label">Empresa:</span> ${company}</p>` : ''}
          ${property_title ? `<p><span class="label">Imóvel:</span> ${property_title} ${refId ? `(${refId})` : ''}</p>` : ''}
        </div>
        
        <div class="info-box">
          <p class="label">Mensagem:</p>
          <p>${message}</p>
        </div>
        
        <a href="${CUSTOM_DOMAIN}/CRMAdvanced" style="display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Ver no CRM</a>
      </div>
    </div>
  </body>
</html>
            `,
            text: `Nova Oportunidade: ${name}\n\nNome: ${name}\nEmail: ${email}\n${phone ? `Telefone: ${phone}\n` : ''}${company ? `Empresa: ${company}\n` : ''}${property_title ? `Imóvel: ${property_title} ${refId ? `(${refId})` : ''}\n` : ''}\nMensagem:\n${message}\n\nVer no CRM: ${CUSTOM_DOMAIN}/CRMAdvanced`
          }),
        });

        if (response.ok) {
          console.log('[submitPublicContact] Resend email sent to:', recipientEmail);
        } else {
          console.error('[submitPublicContact] Resend error:', await response.text());
        }
      }
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