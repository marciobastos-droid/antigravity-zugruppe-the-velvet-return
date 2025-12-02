import { createClient } from 'npm:@base44/sdk@0.8.4';

const BASE44_APP_ID = Deno.env.get("BASE44_APP_ID");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "zugruppe_wa_verify";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('Webhook verification:', { mode, token, challenge });

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    }
    
    // Fallback: accept tokens starting with 'wa_' for backwards compatibility
    if (mode === 'subscribe' && token?.startsWith('wa_')) {
      return new Response(challenge, { status: 200 });
    }
    
    return new Response('Forbidden', { status: 403 });
  }

  // Webhook notification (POST request with messages)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      
      // Processar mensagens recebidas
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return Response.json({ status: 'no_messages' });
      }

      const base44 = createClient({ appId: BASE44_APP_ID });

      for (const message of value.messages) {
        const from = message.from; // Número do remetente
        const messageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();
        
        let content = '';
        let messageType = 'text';
        let mediaUrl = null;

        if (message.text) {
          content = message.text.body;
          messageType = 'text';
        } else if (message.image) {
          messageType = 'image';
          content = message.image.caption || '[Imagem]';
          mediaUrl = message.image.id; // Precisaria de buscar o URL real
        } else if (message.document) {
          messageType = 'document';
          content = message.document.filename || '[Documento]';
        } else if (message.audio) {
          messageType = 'audio';
          content = '[Áudio]';
        } else if (message.video) {
          messageType = 'video';
          content = message.video.caption || '[Vídeo]';
        } else if (message.location) {
          messageType = 'location';
          content = `Localização: ${message.location.latitude}, ${message.location.longitude}`;
        }

        // Buscar contacto pelo número de telefone
        const contacts = await base44.asServiceRole.entities.ClientContact.filter({});
        const matchedContact = contacts.find(c => {
          const contactPhone = c.phone?.replace(/\D/g, '');
          const senderPhone = from.replace(/\D/g, '');
          return contactPhone && (
            contactPhone === senderPhone || 
            contactPhone.endsWith(senderPhone) || 
            senderPhone.endsWith(contactPhone)
          );
        });

        // Nome do contacto (do webhook ou do CRM)
        const contactName = value.contacts?.[0]?.profile?.name || 
                           matchedContact?.full_name || 
                           'Desconhecido';

        // Guardar mensagem
        await base44.asServiceRole.entities.WhatsAppMessage.create({
          message_id: messageId,
          contact_id: matchedContact?.id || null,
          contact_phone: from,
          contact_name: contactName,
          direction: 'inbound',
          message_type: messageType,
          content: content,
          media_url: mediaUrl,
          status: 'delivered',
          timestamp: timestamp,
          wa_conversation_id: value.metadata?.phone_number_id
        });

        // Criar entrada no histórico de comunicações se encontrou contacto
        if (matchedContact) {
          await base44.asServiceRole.entities.CommunicationLog.create({
            contact_id: matchedContact.id,
            contact_name: matchedContact.full_name,
            communication_type: 'whatsapp',
            direction: 'inbound',
            summary: content.substring(0, 200),
            communication_date: timestamp
          });
        }
      }

      return Response.json({ status: 'processed' });

    } catch (error) {
      console.error('Webhook error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});