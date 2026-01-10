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