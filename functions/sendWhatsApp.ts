import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// WhatsApp credentials - stored as environment variables for security
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

// Shorten URL using TinyURL
async function shortenUrl(url) {
  try {
    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (response.ok) {
      const shortUrl = await response.text();
      return shortUrl.trim();
    }
  } catch (e) {
    console.log('URL shortening failed, using original:', e.message);
  }
  return url;
}

// Format properties for WhatsApp message (no special characters to avoid encoding issues)
async function formatPropertiesMessage(clientName, properties, baseUrl) {
  if (!properties || properties.length === 0) {
    return `Ola ${clientName}!\n\nDe momento nao temos imoveis que correspondam aos seus criterios.\n\nEntraremos em contacto assim que surgirem novas oportunidades!\n\nCumprimentos,\nEquipa Zugruppe`;
  }

  const count = properties.length;
  const word = count === 1 ? 'imovel' : 'imoveis';
  
  let msg = `Ola ${clientName}!\n\n`;
  msg += `Seleccionamos ${count} ${word} que pode${count === 1 ? '' : 'm'} interessar-lhe:\n\n`;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    const p = prop.property || prop;
    const score = prop.score || prop.match_score;
    
    // Title
    const bedrooms = p.bedrooms ? `T${p.bedrooms}` : '';
    const title = p.title || `Imovel ${bedrooms}`.trim();
    msg += `${i + 1}. *${title}*\n`;
    
    // Price
    const price = p.price ? formatPriceSimple(p.price) : 'Preco sob consulta';
    msg += `   Preco: ${price}\n`;
    
    // Location
    const loc = [p.city, p.state].filter(Boolean).join(', ');
    if (loc) {
      msg += `   Local: ${loc}`;
      if (bedrooms) msg += ` | ${bedrooms}`;
      msg += '\n';
    }
    
    // Area
    const area = p.useful_area || p.square_feet || p.gross_area;
    if (area) {
      msg += `   Area: ${area}m2\n`;
    }
    
    // Score
    if (score && score >= 70) {
      msg += `   [v] Compatibilidade: ${score}%\n`;
    }
    
    // Short link to property details
    const propertyId = p.id || prop.id;
    if (propertyId && baseUrl) {
      const fullUrl = `${baseUrl}/PropertyDetails?id=${propertyId}`;
      const shortLink = await shortenUrl(fullUrl);
      msg += `   Ver: ${shortLink}\n`;
    }
    
    msg += '\n';
  }

  msg += `Tem interesse em algum destes imoveis?\n`;
  msg += `Podemos agendar uma visita quando lhe for conveniente.\n\n`;
  msg += `Cumprimentos,\nEquipa Zugruppe`;

  return msg;
}

function formatPriceSimple(price) {
  if (!price) return 'Preco sob consulta';
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
  return `${formatted} EUR`;
}

Deno.serve(async (req) => {
  console.log('=== sendWhatsApp function called ===');
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    console.log('User authenticated:', user?.email);

    if (!user) {
      console.log('ERROR: User not authenticated');
      return Response.json({ success: false, error: 'Não autenticado' });
    }

    const body = await req.json();
    const { phoneNumber, message, contactId, contactName, properties, clientName, baseUrl, file_content_base64, file_name, file_url } = body;
    console.log('Request params - phone:', phoneNumber, 'message length:', message?.length, 'properties count:', properties?.length, 'has file:', !!file_content_base64 || !!file_url);

    // If properties array is provided, format the message
    let finalMessage = message;
    
    if (properties && properties.length > 0 && !message) {
      // Format properties message with shortened links
      finalMessage = await formatPropertiesMessage(clientName || contactName || 'Cliente', properties, baseUrl);
    }

    if (!phoneNumber || (!finalMessage && !file_content_base64 && !file_url)) {
      return Response.json({ success: false, error: 'Número e conteúdo (mensagem ou ficheiro) são obrigatórios' });
    }

    // Try environment variables first, then user config
    let phoneNumberId = WHATSAPP_PHONE_NUMBER_ID;
    let accessToken = WHATSAPP_ACCESS_TOKEN;
    
    // Fallback to user's config if env vars not set
    if (!phoneNumberId || !accessToken) {
      const whatsappConfig = user.whatsapp_config;
      if (whatsappConfig?.phone_number_id && whatsappConfig?.access_token) {
        phoneNumberId = whatsappConfig.phone_number_id;
        accessToken = whatsappConfig.access_token;
      }
    }
    
    console.log('Credentials check - phoneNumberId:', phoneNumberId ? 'SET' : 'MISSING', 'accessToken:', accessToken ? 'SET (length: ' + accessToken.length + ')' : 'MISSING');
    
    if (!phoneNumberId || !accessToken) {
      console.log('ERROR: Missing WhatsApp credentials');
      return Response.json({ 
        success: false, 
        error: 'WhatsApp Business não está configurado. Configure as credenciais nas variáveis de ambiente ou em Ferramentas > WhatsApp Business.',
        config_missing: true
      });
    }

    // Normalizar número de telefone
    let normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    // Adicionar código de país Portugal se não tiver
    if (normalizedPhone.length === 9 && normalizedPhone.startsWith('9')) {
      normalizedPhone = '351' + normalizedPhone;
    }
    
    // Se começa com 00, remover
    if (normalizedPhone.startsWith('00')) {
      normalizedPhone = normalizedPhone.substring(2);
    }

    console.log(`Sending WhatsApp to: ${normalizedPhone} via phone_number_id: ${phoneNumberId}`);

    // Enviar via WhatsApp Cloud API
    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    console.log(`Calling WhatsApp API: ${apiUrl}`);

    let requestBody;
    let messageType;
    let documentUrl; // To store the uploaded file URL

    if (file_content_base64 && file_name) {
      console.log('Sending document via WhatsApp');
      
      // Decode base64 and create a Blob to represent the file
      const fileData = Uint8Array.from(atob(file_content_base64), c => c.charCodeAt(0));
      const fileBlob = new Blob([fileData], { type: 'application/pdf' });
      
      // Use the Base44 integration to upload the file to public storage.
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: fileBlob
      });

      if (!uploadResult || !uploadResult.file_url) {
        throw new Error("Failed to upload document for WhatsApp.");
      }
      documentUrl = uploadResult.file_url;

      requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'document',
        document: {
          link: documentUrl,
          filename: file_name
        }
      };
      messageType = 'document';
    } else if (file_url && file_name) {
      // If a file URL is directly provided (e.g., already uploaded PDF)
      console.log('Sending document via WhatsApp using provided URL');
      documentUrl = file_url; // Set documentUrl for logging
      requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'document',
        document: {
          link: file_url,
          filename: file_name
        }
      };
      messageType = 'document';
    } else {
      // Check if we should use a template (for first contact) or regular message
      const { useTemplate, templateName } = body;
      
      if (useTemplate) {
        // Use approved template for first contact
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'template',
          template: {
            name: templateName || 'hello_world', // Use hello_world as default (pre-approved by Meta)
            language: { code: 'pt_PT' }
          }
        };
        messageType = 'template';
      } else {
        // Regular text message (only works within 24h conversation window)
        requestBody = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: { 
            preview_url: false,
            body: finalMessage 
          }
        };
        messageType = 'text';
      }
    }
    
    console.log('Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    console.log('WhatsApp API response status:', response.status);
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
      message_type: messageType, // Use the determined message type
      content: messageType === 'document' ? `Documento: ${file_name}` : finalMessage,
      file_url: messageType === 'document' ? (file_url || documentUrl) : undefined,
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
        summary: messageType === 'document' ? `Documento enviado: ${file_name}` : finalMessage.substring(0, 200),
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
    console.error('=== sendWhatsApp EXCEPTION ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      success: false, 
      error: error.message || 'Erro ao enviar mensagem'
    });
  }
});