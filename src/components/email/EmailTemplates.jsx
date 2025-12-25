// Email templates for Resend integration

export const emailTemplates = {
  // New lead notification for agents
  newLead: ({ leadName, leadEmail, leadPhone, propertyTitle, message }) => ({
    subject: `Nova Oportunidade: ${leadName}`,
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
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Nova Oportunidade</h1>
            </div>
            <div class="content">
              <p>Tem uma nova oportunidade de negócio!</p>
              
              <div class="info-box">
                <p><span class="label">Nome:</span> ${leadName}</p>
                <p><span class="label">Email:</span> ${leadEmail}</p>
                ${leadPhone ? `<p><span class="label">Telefone:</span> ${leadPhone}</p>` : ''}
                ${propertyTitle ? `<p><span class="label">Imóvel:</span> ${propertyTitle}</p>` : ''}
              </div>
              
              ${message ? `
                <div class="info-box">
                  <p class="label">Mensagem:</p>
                  <p>${message}</p>
                </div>
              ` : ''}
              
              <a href="https://zugruppe.pt${window.location?.pathname || ''}" class="button">Ver no CRM</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Nova Oportunidade: ${leadName}\n\nNome: ${leadName}\nEmail: ${leadEmail}\n${leadPhone ? `Telefone: ${leadPhone}\n` : ''}${propertyTitle ? `Imóvel: ${propertyTitle}\n` : ''}${message ? `\nMensagem: ${message}` : ''}`
  }),

  // Property match notification
  propertyMatch: ({ clientName, propertyTitle, propertyPrice, propertyUrl, matchScore }) => ({
    subject: `Novo Imóvel para ${clientName}`,
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
            .property-card { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; }
            .price { font-size: 24px; font-weight: bold; color: #d4af37; margin: 10px 0; }
            .match-badge { display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; }
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Novo Imóvel Perfeito para Si</h1>
            </div>
            <div class="content">
              <p>Olá ${clientName},</p>
              <p>Encontrámos um imóvel que corresponde às suas preferências!</p>
              
              <div class="property-card">
                <h2>${propertyTitle}</h2>
                <div class="price">€${propertyPrice?.toLocaleString()}</div>
                ${matchScore ? `<span class="match-badge">${matchScore}% compatível</span>` : ''}
                <a href="${propertyUrl}" class="button">Ver Imóvel</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Novo Imóvel para ${clientName}\n\n${propertyTitle}\nPreço: €${propertyPrice?.toLocaleString()}\n${matchScore ? `Compatibilidade: ${matchScore}%\n` : ''}\nVer: ${propertyUrl}`
  }),

  // Appointment confirmation
  appointmentConfirmation: ({ clientName, propertyTitle, appointmentDate, agentName, agentPhone }) => ({
    subject: `Visita Confirmada - ${propertyTitle}`,
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
            .appointment-card { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #10b981; }
            .date { font-size: 20px; font-weight: bold; color: #0f172a; margin: 10px 0; }
            .agent-info { background: #e3f2fd; padding: 15px; margin: 15px 0; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Visita Confirmada</h1>
            </div>
            <div class="content">
              <p>Olá ${clientName},</p>
              <p>A sua visita foi confirmada com sucesso!</p>
              
              <div class="appointment-card">
                <h3>${propertyTitle}</h3>
                <div class="date">📅 ${appointmentDate}</div>
              </div>
              
              <div class="agent-info">
                <p><strong>Consultor:</strong> ${agentName}</p>
                <p><strong>Telefone:</strong> ${agentPhone}</p>
              </div>
              
              <p>Aguardamos por si!</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Visita Confirmada\n\n${propertyTitle}\nData: ${appointmentDate}\n\nConsultor: ${agentName}\nTelefone: ${agentPhone}\n\nAguardamos por si!`
  }),

  // Welcome email
  welcome: ({ userName, userEmail }) => ({
    subject: 'Bem-vindo à Zugruppe',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0f172a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .features { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; }
            .feature { margin: 15px 0; padding-left: 30px; position: relative; }
            .feature:before { content: '✓'; position: absolute; left: 0; color: #10b981; font-weight: bold; font-size: 20px; }
            .button { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏡 Bem-vindo à Zugruppe</h1>
            </div>
            <div class="content">
              <p>Olá ${userName},</p>
              <p>Obrigado por se juntar a nós! Está pronto para encontrar o imóvel perfeito?</p>
              
              <div class="features">
                <h3>O que pode fazer:</h3>
                <div class="feature">Navegar por milhares de imóveis</div>
                <div class="feature">Guardar os seus favoritos</div>
                <div class="feature">Receber alertas personalizados</div>
                <div class="feature">Agendar visitas online</div>
              </div>
              
              <a href="https://zugruppe.pt" class="button">Começar Agora</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Bem-vindo à Zugruppe\n\nOlá ${userName},\n\nObrigado por se juntar a nós!\n\nJá pode começar a explorar imóveis em https://zugruppe.pt`
  }),

  // Contract notification
  contractReady: ({ clientName, propertyTitle, contractType, contractUrl }) => ({
    subject: `Contrato Pronto - ${propertyTitle}`,
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
            .contract-info { background: white; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .warning { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📄 Contrato Disponível</h1>
            </div>
            <div class="content">
              <p>Olá ${clientName},</p>
              <p>O seu contrato está pronto para revisão e assinatura.</p>
              
              <div class="contract-info">
                <h3>${propertyTitle}</h3>
                <p><strong>Tipo:</strong> ${contractType === 'sale' ? 'Compra e Venda' : contractType === 'lease' ? 'Arrendamento' : 'Contrato'}</p>
              </div>
              
              <div class="warning">
                ⚠️ Por favor, reveja o documento com atenção antes de assinar.
              </div>
              
              <a href="${contractUrl}" class="button">Ver Contrato</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Contrato Pronto - ${propertyTitle}\n\nOlá ${clientName},\n\nO seu contrato de ${contractType === 'sale' ? 'compra e venda' : 'arrendamento'} está pronto.\n\nVer: ${contractUrl}`
  })
};

// Helper function to send templated emails
export async function sendTemplatedEmail(templateName, data, recipientEmail, options = {}) {
  const template = emailTemplates[templateName];
  if (!template) {
    throw new Error(`Template '${templateName}' not found`);
  }

  const { subject, html, text } = template(data);

  const response = await fetch('/api/functions/sendResendEmail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: recipientEmail,
      subject,
      html,
      text,
      from: options.from || 'noreply@zugruppe.pt',
      replyTo: options.replyTo
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  return await response.json();
}