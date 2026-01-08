import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SMTPClient } from 'npm:emailjs@4.0.3';

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

    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return Response.json({ 
        error: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD secrets.' 
      }, { status: 500 });
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

    console.log('[sendEmailWithAttachment] Preparing to send email via Gmail SMTP');

    const client = new SMTPClient({
      user: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
      host: 'smtp.gmail.com',
      ssl: true,
    });

    const emailMessage = {
      from: GMAIL_USER,
      to: to,
      subject: subject,
      text: emailBody,
      attachment: [
        { data: htmlBody, alternative: true }
      ]
    };

    // Add PDF attachment if provided
    if (attachment && attachment.content && attachment.filename) {
      emailMessage.attachment.push({
        data: attachment.content,
        type: 'application/pdf',
        name: attachment.filename,
        encoding: 'base64'
      });
    }

    console.log('[sendEmailWithAttachment] Sending email to:', to);

    // Send email
    await client.sendAsync(emailMessage);

    console.log('[sendEmailWithAttachment] Email sent successfully via Gmail SMTP');

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
      message: 'Email sent successfully via Gmail'
    });

  } catch (error) {
    console.error('[sendEmailWithAttachment] Error:', error);
    return Response.json({ 
      error: error.message || 'Unknown error',
      details: error.toString()
    }, { status: 500 });
  }
});