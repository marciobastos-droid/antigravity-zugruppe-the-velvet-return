import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
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