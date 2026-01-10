import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, templateId, variables, subject: overrideSubject, body: overrideBody } = await req.json();

    if (!to) {
      return Response.json({ error: 'Missing required field: to' }, { status: 400 });
    }

    let subject, body;

    // If template ID is provided, fetch and use template
    if (templateId) {
      const template = await base44.entities.EmailTemplate.filter({ id: templateId });
      
      if (!template || template.length === 0) {
        return Response.json({ error: 'Template not found' }, { status: 404 });
      }

      const emailTemplate = template[0];

      // Replace variables in subject and body
      subject = emailTemplate.subject;
      body = emailTemplate.body;

      if (variables && typeof variables === 'object') {
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, value || '');
          body = body.replace(regex, value || '');
        }
      }

      // Update template usage stats
      await base44.entities.EmailTemplate.update(templateId, {
        usage_count: (emailTemplate.usage_count || 0) + 1,
        last_used_date: new Date().toISOString()
      });
    } else if (overrideSubject && overrideBody) {
      // Direct email without template
      subject = overrideSubject;
      body = overrideBody;
    } else {
      return Response.json({ error: 'Must provide either templateId or both subject and body' }, { status: 400 });
    }

    // Get Gmail OAuth access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");

    if (!accessToken) {
      return Response.json({ error: 'Gmail not connected. Please authorize Gmail access.' }, { status: 500 });
    }

    // Prepare email in RFC 2822 format
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      body.replace(/\n/g, '<br>')
    ].join('\n');

    // Base64 encode the email
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gmail API error: ${error.error?.message || 'Unknown error'}`);
    }

    return Response.json({ 
      success: true,
      message: "Email sent successfully via Gmail"
    });

  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});