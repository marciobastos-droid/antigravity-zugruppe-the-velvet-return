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

    // Get Gmail API access token
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
    } catch (error) {
      console.error("Gmail not authorized:", error);
      return Response.json({ 
        error: 'Gmail integration not authorized',
        details: 'Please authorize Gmail in the integrations settings to send emails through your Google account',
        errorCode: 'GMAIL_NOT_AUTHORIZED'
      }, { status: 403 });
    }

    if (!accessToken) {
      return Response.json({ 
        error: 'Gmail access token not available',
        details: 'Unable to retrieve Gmail access token. Please re-authorize Gmail integration.',
        errorCode: 'GMAIL_TOKEN_UNAVAILABLE'
      }, { status: 403 });
    }

    console.log(`Sending email via Gmail API to ${to}`);

    // Create RFC 2822 formatted email
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ];
    const email = emailLines.join('\r\n');

    // Encode to base64url
    const encoder = new TextEncoder();
    const emailBytes = encoder.encode(email);
    const base64 = btoa(String.fromCharCode(...emailBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gmail API error:", errorData);
      
      // Handle specific Gmail API errors
      if (response.status === 401) {
        return Response.json({ 
          error: 'Gmail authorization expired',
          details: 'Your Gmail access token has expired. Please re-authorize Gmail integration.',
          errorCode: 'GMAIL_TOKEN_EXPIRED'
        }, { status: 401 });
      } else if (response.status === 403) {
        return Response.json({ 
          error: 'Gmail API access denied',
          details: errorData.error?.message || 'Insufficient permissions to send emails via Gmail API',
          errorCode: 'GMAIL_ACCESS_DENIED'
        }, { status: 403 });
      } else if (response.status === 429) {
        return Response.json({ 
          error: 'Gmail API rate limit exceeded',
          details: 'Too many emails sent. Please try again later.',
          errorCode: 'GMAIL_RATE_LIMIT'
        }, { status: 429 });
      }
      
      return Response.json({ 
        error: 'Failed to send email via Gmail API',
        details: errorData.error?.message || `HTTP ${response.status}`,
        errorCode: 'GMAIL_API_ERROR'
      }, { status: response.status });
    }

    const result = await response.json();
    console.log(`Email sent successfully via Gmail API to ${to}, message ID: ${result.id}`);

    return Response.json({ 
      success: true,
      message: "Email sent successfully via Gmail API",
      messageId: result.id
    });

  } catch (error) {
    console.error("Error sending email:", error);
    console.error("Error details:", error.stack);
    return Response.json({ 
      error: error.message,
      details: error.stack,
      errorCode: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
});