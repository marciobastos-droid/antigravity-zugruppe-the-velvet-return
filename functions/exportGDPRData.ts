import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { email, contact_ids } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Procurar todos os dados relacionados com este email
    const contacts = await base44.asServiceRole.entities.ClientContact.filter({ email });
    const opportunities = await base44.asServiceRole.entities.Opportunity.filter({ buyer_email: email });
    const appointments = await base44.asServiceRole.entities.Appointment.filter({ client_email: email });
    const buyerProfiles = await base44.asServiceRole.entities.BuyerProfile.filter({ buyer_email: email });
    const savedProperties = await base44.asServiceRole.entities.SavedProperty.filter({ user_email: email });
    const inquiries = await base44.asServiceRole.entities.Inquiry.filter({ buyer_email: email });

    // Compilar todos os dados
    const exportData = {
      export_date: new Date().toISOString(),
      data_subject_email: email,
      contacts: contacts.map(c => ({
        id: c.id,
        ref_id: c.ref_id,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        postal_code: c.postal_code,
        created_date: c.created_date,
        rgpd_consents: {
          data_processing: c.rgpd_data_processing_consent,
          marketing: c.rgpd_marketing_consent,
          third_party_sharing: c.rgpd_third_party_sharing_consent,
          consent_date: c.rgpd_consent_date,
          consent_method: c.rgpd_consent_method
        }
      })),
      opportunities: opportunities.map(o => ({
        id: o.id,
        ref_id: o.ref_id,
        lead_type: o.lead_type,
        status: o.status,
        created_date: o.created_date,
        budget: o.budget,
        location: o.location
      })),
      appointments: appointments.map(a => ({
        id: a.id,
        property_title: a.property_title,
        appointment_date: a.appointment_date,
        status: a.status,
        created_date: a.created_date
      })),
      buyer_profiles: buyerProfiles.map(b => ({
        id: b.id,
        listing_type: b.listing_type,
        locations: b.locations,
        budget_min: b.budget_min,
        budget_max: b.budget_max,
        created_date: b.created_date
      })),
      saved_properties: savedProperties.map(s => ({
        property_title: s.property_title,
        created_date: s.created_date
      })),
      inquiries: inquiries.map(i => ({
        property_title: i.property_title,
        message: i.message,
        created_date: i.created_date
      }))
    };

    // Enviar dados por email
    await base44.asServiceRole.functions.invoke('sendGmail', {
      to: email,
      subject: "Os Seus Dados Pessoais - RGPD",
      body: `
Caro(a) titular dos dados,

Em resposta ao seu pedido de acesso aos dados pessoais, segue em anexo toda a informação que detemos sobre si.

Resumo:
- ${contacts.length} registo(s) de contacto
- ${opportunities.length} oportunidade(s)
- ${appointments.length} marcação(ões)
- ${buyerProfiles.length} perfil(is) de comprador
- ${savedProperties.length} imóvel(is) guardado(s)
- ${inquiries.length} pedido(s) de informação

Dados em formato JSON:
${JSON.stringify(exportData, null, 2)}

Se desejar retificar, eliminar ou exercer outros direitos sobre os seus dados, por favor contacte-nos.

Com os melhores cumprimentos,
Equipa ZuGruppe
Data Protection Officer (DPO)
Email: info@zuconnect.pt
      `
    });

    return Response.json({ 
      success: true,
      data: exportData,
      message: "Dados exportados e enviados por email"
    });

  } catch (error) {
    console.error("Error exporting GDPR data:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});