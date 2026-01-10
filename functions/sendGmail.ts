import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SMTPClient } from 'npm:denomailer@1.6.0';

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

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      return Response.json({ error: 'Gmail credentials not configured' }, { status: 500 });
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 587,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    });

    await client.send({
      from: gmailUser,
      to: to,
      subject: subject,
      content: body,
      html: body.replace(/\n/g, '<br>'),
    });

    await client.close();

    return Response.json({ 
      success: true,
      message: "Email sent successfully"
    });

  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});