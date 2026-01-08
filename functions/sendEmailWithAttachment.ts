import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth check
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, message, attachment, property_id } = await req.json();

    if (!to || !subject) {
      return Response.json({ 
        error: 'Missing required fields: to, subject' 
      }, { status: 400 });
    }

    // Get Gmail access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    if (!accessToken) {
      return Response.json({ error: 'Gmail not authorized' }, { status: 500 });
    }

    // Prepare email body
    const emailBody = message || `Segue em anexo a brochura do imóvel.

Cumprimentos,
${user.full_name || 'ZuGruppe'}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg" 
               alt="ZuGruppe" 
               style="height: 60px; margin-bottom: 10px;">
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${emailBody.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">IMPIC 11355 | Privileged Approach Unipessoal Lda</p>
          <p style="margin: 5px 0 0 0;">📞 234 026 223 | ✉️ info@zugruppe.com | 🌐 www.zugruppe.com</p>
        </div>
      </div>
    `;

    // Create MIME message for Gmail API
    const boundary = '----=_Part_0_' + Date.now();
    let mimeMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: multipart/alternative; boundary="alt_boundary"',
      '',
      '--alt_boundary',
      'Content-Type: text/plain; charset=UTF-8',
      '',
      emailBody,
      '',
      '--alt_boundary',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '',
      '--alt_boundary--'
    ];

    // Add attachment if provided
    if (attachment && attachment.content && attachment.filename) {
      mimeMessage.push(
        `--${boundary}`,
        `Content-Type: application/pdf; name="${attachment.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        attachment.content,
        ''
      );
    }

    mimeMessage.push(`--${boundary}--`);

    // Encode message in base64url
    const encodedMessage = btoa(mimeMessage.join('\r\n'))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log('[sendEmailWithAttachment] Sending via Gmail to:', to);

    // Send email via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[sendEmailWithAttachment] Gmail API error:', data);
      return Response.json({ 
        error: 'Failed to send email via Gmail', 
        details: data.error?.message || JSON.stringify(data)
      }, { status: response.status });
    }

    console.log('[sendEmailWithAttachment] Email sent successfully via Gmail:', data.id);

    // Log communication if property_id provided
    if (property_id) {
      try {
        await base44.asServiceRole.entities.CommunicationLog.create({
          contact_email: to,
          type: 'email',
          subject,
          message: emailBody,
          sent_by: user.email,
          property_id,
          status: 'sent',
          has_attachment: !!attachment
        });
      } catch (logError) {
        console.error('[sendEmailWithAttachment] Failed to log communication:', logError);
      }
    }

    return Response.json({ 
      success: true, 
      messageId: data.id 
    });

  } catch (error) {
    console.error('[sendEmailWithAttachment] Error:', error);
    return Response.json({ 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
});