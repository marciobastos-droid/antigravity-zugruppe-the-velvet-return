import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get access token from Google Drive connector (which has Gmail scopes)
        const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");

        // Get all client contacts to match emails
        const contacts = await base44.entities.ClientContact.list('-created_date', 1000);
        const contactEmails = new Set(
            contacts
                .map(c => c.email?.toLowerCase())
                .filter(Boolean)
        );

        // Get already processed email IDs
        const processedLogs = await base44.entities.EmailLog.list('-sent_date', 500);
        const processedIds = new Set(processedLogs.map(l => l.gmail_message_id));

        // Fetch recent inbox emails (last 50)
        const listUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX';
        const listResponse = await fetch(listUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const listData = await listResponse.json();

        if (listData.error) {
            throw new Error(listData.error.message || 'Erro ao listar emails');
        }

        if (!listData.messages || listData.messages.length === 0) {
            return Response.json({ 
                success: true, 
                newEmails: 0, 
                notifications: 0,
                message: 'Nenhum email na caixa de entrada' 
            });
        }

        // Get details for each message
        const emails = await Promise.all(
            listData.messages.map(async (msg) => {
                const msgResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                const msgData = await msgResponse.json();
                
                const headers = msgData.payload?.headers || [];
                const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

                return {
                    id: msgData.id,
                    threadId: msgData.threadId,
                    snippet: msgData.snippet,
                    from: getHeader('From'),
                    to: getHeader('To'),
                    subject: getHeader('Subject'),
                    date: getHeader('Date'),
                    labelIds: msgData.labelIds,
                    isUnread: msgData.labelIds?.includes('UNREAD')
                };
            })
        );

        // Extract email address from "Name <email@domain.com>" format
        const extractEmail = (emailString) => {
            if (!emailString) return null;
            const match = emailString.match(/<(.+?)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/);
            return match ? match[1].toLowerCase() : emailString.toLowerCase();
        };

        // Filter new emails from known clients
        const newClientEmails = emails.filter(email => {
            // Skip already processed
            if (processedIds.has(email.id)) return false;
            
            // Check if sender is a known client
            const senderEmail = extractEmail(email.from);
            return senderEmail && contactEmails.has(senderEmail);
        });

        let notificationsCreated = 0;
        let emailsLogged = 0;

        for (const email of newClientEmails) {
            const senderEmail = extractEmail(email.from);
            const contact = contacts.find(c => c.email?.toLowerCase() === senderEmail);
            
            if (!contact) continue;

            // Create EmailLog entry
            await base44.entities.EmailLog.create({
                gmail_message_id: email.id,
                gmail_thread_id: email.threadId || '',
                contact_id: contact.id,
                contact_name: contact.full_name || '',
                contact_email: senderEmail || '',
                subject: email.subject || '(Sem assunto)',
                direction: 'inbound',
                sent_date: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
                sent_by: user.email,
                status: 'synced'
            });
            emailsLogged++;

            // Create CommunicationLog entry
            await base44.entities.CommunicationLog.create({
                contact_id: contact.id,
                contact_name: contact.full_name || '',
                communication_type: 'email',
                direction: 'inbound',
                subject: email.subject || '(Sem assunto)',
                summary: email.snippet || '',
                communication_date: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
                agent_email: user.email,
                outcome: 'successful'
            });

            // Create notification for the assigned agent or admin
            const notifyEmail = contact.assigned_agent || user.email;
            
            await base44.asServiceRole.functions.invoke('createNotification', {
                user_email: notifyEmail,
                title: `📧 Novo email de ${contact.full_name}`,
                message: email.subject || '(Sem assunto)',
                type: 'email',
                priority: 'high',
                related_id: contact.id,
                related_type: 'contact',
                action_url: `/CRMAdvanced?tab=clients&contact=${contact.id}`,
                metadata: {
                    email_id: email.id,
                    sender_email: senderEmail,
                    contact_name: contact.full_name
                },
                send_push: true
            });
            notificationsCreated++;
        }

        return Response.json({
            success: true,
            totalEmails: emails.length,
            newClientEmails: newClientEmails.length,
            emailsLogged,
            notificationsCreated,
            message: newClientEmails.length > 0 
                ? `${newClientEmails.length} novos emails de clientes processados` 
                : 'Nenhum novo email de clientes'
        });

    } catch (error) {
        console.error('Check New Client Emails Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});