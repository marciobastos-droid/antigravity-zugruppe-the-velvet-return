import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' });
    }

    const { phoneNumber, message, contactId, contactName } = await req.json();

    if (!phoneNumber || !message) {
      return Response.json({ success: false, error: 'Número e mensagem são obrigatórios' });
    }

    // Verificar configuração do WhatsApp
    const whatsappConfig = user.whatsapp_config;
    
    if (!whatsappConfig?.is_active || !whatsappConfig?.phone_number_id || !whatsappConfig?.access_token) {
      return Response.json({ 
        success: false, 
        error: 'WhatsApp Business não está configurado. Configure em Ferramentas > WhatsApp Business.',
        config_missing: true
      });
    }

    // Normalizar número de telefone
    let normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Adicionar código de país Portugal se não tiver
    if (normalizedPhone.length === 9 && normalizedPhone.startsWith('9')) {
      normalizedPhone = '351' + normalizedPhone;
    }

    console.log(`Sending WhatsApp to: ${normalizedPhone}`);

    // Enviar via WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappConfig.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappConfig.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: message }
        })
      }
    );

    const result = await response.json();
    console.log('WhatsApp API response:', JSON.stringify(result));

    if (!response.ok) {
      const errorMessage = result.error?.message || result.error?.error_data?.details || 'Erro ao enviar';
      console.error('WhatsApp API error:', errorMessage);
      return Response.json({ 
        success: false, 
        error: errorMessage,
        details: result.error
      });
    }

    if (!result.messages?.[0]?.id) {
      return Response.json({ 
        success: false, 
        error: 'Resposta inválida da API WhatsApp'
      });
    }

    const messageId = result.messages[0].id;

    // Guardar mensagem no CRM
    await base44.entities.WhatsAppMessage.create({
      message_id: messageId,
      contact_id: contactId || null,
      contact_phone: normalizedPhone,
      contact_name: contactName || 'Desconhecido',
      agent_email: user.email,
      direction: 'outbound',
      message_type: 'text',
      content: message,
      status: 'sent',
      timestamp: new Date().toISOString()
    });

    // Criar entrada no histórico de comunicações
    if (contactId) {
      await base44.entities.CommunicationLog.create({
        contact_id: contactId,
        contact_name: contactName || 'Desconhecido',
        communication_type: 'whatsapp',
        direction: 'outbound',
        summary: message.substring(0, 200),
        communication_date: new Date().toISOString(),
        agent_email: user.email
      });
    }

    return Response.json({ 
      success: true, 
      messageId,
      message: 'Mensagem enviada com sucesso!'
    });

  } catch (error) {
    console.error('sendWhatsApp error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao enviar mensagem'
    });
  }
});