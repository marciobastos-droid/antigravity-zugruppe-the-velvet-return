import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { propertyId, action, feedback, approvedBy, creatorEmail } = await req.json();

    if (!propertyId || !action || !creatorEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const property = await base44.entities.Property.filter({ id: propertyId });
    if (!property || property.length === 0) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    const prop = property[0];
    const isApproved = action === 'approve';

    // Enviar email ao criador
    const emailSubject = isApproved 
      ? `✅ Imóvel Aprovado: ${prop.title}`
      : `❌ Imóvel Rejeitado: ${prop.title}`;

    const emailBody = isApproved
      ? `
        <h2>Imóvel Aprovado!</h2>
        <p>O seu imóvel foi aprovado e já está disponível no site:</p>
        <ul>
          <li><strong>Imóvel:</strong> ${prop.title}</li>
          <li><strong>Localização:</strong> ${prop.city}</li>
          <li><strong>Preço:</strong> €${prop.price?.toLocaleString()}</li>
          <li><strong>Aprovado por:</strong> ${approvedBy}</li>
        </ul>
        ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
        <p>O imóvel está agora visível para clientes potenciais.</p>
      `
      : `
        <h2>Imóvel Rejeitado</h2>
        <p>O seu imóvel foi rejeitado e necessita de correções:</p>
        <ul>
          <li><strong>Imóvel:</strong> ${prop.title}</li>
          <li><strong>Localização:</strong> ${prop.city}</li>
          <li><strong>Rejeitado por:</strong> ${approvedBy}</li>
        </ul>
        <p><strong>Motivo da Rejeição:</strong></p>
        <p style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 10px 0;">
          ${feedback || 'Não especificado'}
        </p>
        <p>Por favor, corrija as questões mencionadas e resubmeta o imóvel.</p>
      `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: creatorEmail,
      subject: emailSubject,
      body: emailBody
    });

    // Criar notificação no sistema
    await base44.asServiceRole.entities.Notification.create({
      title: isApproved ? 'Imóvel Aprovado' : 'Imóvel Rejeitado',
      message: isApproved
        ? `O seu imóvel "${prop.title}" foi aprovado por ${approvedBy}`
        : `O seu imóvel "${prop.title}" foi rejeitado. Motivo: ${feedback || 'Não especificado'}`,
      type: 'system',
      priority: isApproved ? 'medium' : 'high',
      user_email: creatorEmail,
      related_entity: 'Property',
      related_entity_id: propertyId,
      action_url: `/property/${propertyId}`,
      metadata: {
        action,
        feedback,
        approved_by: approvedBy
      }
    });

    return Response.json({ 
      success: true, 
      message: `Notification sent to ${creatorEmail}` 
    });
  } catch (error) {
    console.error('[notifyPropertyApproval] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});