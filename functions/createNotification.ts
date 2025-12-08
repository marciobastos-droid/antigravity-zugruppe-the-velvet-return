import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      user_email, 
      title, 
      message, 
      type = 'system',
      priority = 'medium',
      related_id,
      related_type,
      action_url,
      metadata = {},
      send_push = true,
      send_email = false
    } = await req.json();

    if (!user_email || !title || !message) {
      return Response.json({ 
        error: 'Missing required fields: user_email, title, message' 
      }, { status: 400 });
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      title,
      message,
      type,
      priority,
      related_id: related_id || null,
      related_type: related_type || null,
      action_url: action_url || null,
      is_read: false,
      push_sent: false,
      metadata
    });

    // Send push notification if enabled
    if (send_push) {
      try {
        const pushResult = await base44.asServiceRole.functions.invoke('sendPushNotification', {
          user_email,
          notification_id: notification.id,
          title,
          message,
          type,
          action_url
        });
        
        if (pushResult.data?.sent_to > 0) {
          await base44.asServiceRole.entities.Notification.update(notification.id, {
            push_sent: true
          });
        }
      } catch (pushError) {
        console.error('Push notification failed:', pushError);
        // Continue even if push fails
      }
    }

    // Send email notification if enabled
    let emailSent = false;
    if (send_email) {
      try {
        const typeLabels = {
          lead: '👤 Novo Lead',
          opportunity: '💼 Oportunidade',
          appointment: '📅 Agendamento',
          contract: '📄 Contrato',
          matching: '🎯 Match',
          ai_tool: '🤖 IA',
          system: 'ℹ️ Sistema'
        };

        const priorityLabels = {
          urgent: '🔴 Urgente',
          high: '🟠 Alta',
          medium: '🟡 Média',
          low: '🔵 Baixa'
        };

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">ZuGruppe CRM</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 14px; color: #64748b; margin-right: 10px;">${typeLabels[type] || type}</span>
                  <span style="font-size: 12px; color: #94a3b8;">${priorityLabels[priority] || priority}</span>
                </div>
                <h2 style="color: #1e293b; margin: 0 0 10px 0; font-size: 20px;">${title}</h2>
                <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
                ${action_url ? `
                  <a href="${action_url}" style="display: inline-block; background: #1e293b; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                    Ver Detalhes
                  </a>
                ` : ''}
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
                Esta é uma notificação automática do ZuGruppe CRM.
              </p>
            </div>
          </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: user_email,
          subject: `[ZuGruppe] ${title}`,
          body: emailBody
        });
        
        emailSent = true;
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Continue even if email fails
      }
    }

    return Response.json({
      success: true,
      notification_id: notification.id,
      notification,
      email_sent: emailSent
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});