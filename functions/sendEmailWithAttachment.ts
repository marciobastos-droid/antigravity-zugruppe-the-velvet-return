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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
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

    // Prepare attachments array
    const attachments = [];
    if (attachment && attachment.content && attachment.filename) {
      attachments.push({
        filename: attachment.filename,
        content: attachment.content
      });
    }

    console.log('[sendEmailWithAttachment] Sending email to:', to);
    console.log('[sendEmailWithAttachment] Has attachment:', attachments.length > 0);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ZuGruppe <noreply@zuhaus.pt>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: htmlBody,
        text: emailBody,
        reply_to: user.email || 'info@zugruppe.com',
        attachments: attachments.length > 0 ? attachments : undefined
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[sendEmailWithAttachment] Resend API error:', data);
      return Response.json({ 
        error: 'Failed to send email', 
        details: data.message || data.error || JSON.stringify(data)
      }, { status: response.status });
    }

    console.log('[sendEmailWithAttachment] Email sent successfully:', data.id);

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
          has_attachment: attachments.length > 0
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