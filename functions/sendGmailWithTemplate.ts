import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SMTPClient } from 'npm:denomailer@1.6.0';

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