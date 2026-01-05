import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message, template_name, template_params } = await req.json();

    if (!to || (!message && !template_name)) {
      return Response.json({ 
        error: 'Missing required fields: to and (message or template_name)' 
      }, { status: 400 });
    }

    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!accessToken || !phoneNumberId) {
      return Response.json({ 
        error: 'WhatsApp credentials not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID' 
      }, { status: 500 });
    }

    // Format phone number (remove non-digits)
    const formattedPhone = to.replace(/\D/g, '');

    // Build WhatsApp message payload
    const messagePayload = template_name ? {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: template_name,
        language: { code: "pt_PT" },
        components: template_params || []
      }
    } : {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: { body: message }
    };

    // Send message to WhatsApp Business API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messagePayload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] Error:', data);
      return Response.json({ 
        success: false,
        error: data.error?.message || 'Failed to send WhatsApp message',
        details: data
      }, { status: response.status });
    }

    // Log communication
    try {
      await base44.entities.CommunicationLog.create({
        contact_email: to,
        type: 'whatsapp',
        subject: template_name || 'WhatsApp Message',
        message: message || `Template: ${template_name}`,
        sent_by: user.email,
        status: 'sent',
        metadata: {
          whatsapp_message_id: data.messages?.[0]?.id,
          phone_number: formattedPhone
        }
      });
    } catch (logError) {
      console.warn('[WhatsApp] Failed to log communication:', logError);
    }

    return Response.json({
      success: true,
      message_id: data.messages?.[0]?.id,
      phone: formattedPhone
    });

  } catch (error) {
    console.error('[WhatsApp] Server error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});