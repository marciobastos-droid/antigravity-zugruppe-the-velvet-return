import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, ...params } = await req.json();

        switch (action) {
            case 'sendEmail':
                return handleSendEmail(params, user, base44);
            case 'listEmails':
                return handleListEmails(params, user, base44);
            case 'getEmail':
                return handleGetEmail(params, user, base44);
            case 'checkConnection':
                return handleCheckConnection(user, base44);
            case 'disconnect':
                return handleDisconnect(user, base44);
            case 'testConnection':
                return handleTestConnection(user, base44);
            case 'sendTestEmail':
                return handleSendTestEmail(params, user, base44);
            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Gmail Integration Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function getAccessToken(base44) {
    // Use the App Connector to get the access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googledrive");
    return accessToken;
}

async function getUserEmail(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();
    return data.email;
}

async function handleSendEmail({ to, subject, body, cc, bcc, replyTo }, user, base44) {
    const accessToken = await getAccessToken(base44);
    const fromEmail = await getUserEmail(accessToken);

    // Build email
    const email = [
        `From: ${fromEmail}`,
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        replyTo ? `In-Reply-To: ${replyTo}` : '',
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        body
    ].filter(Boolean).join('\r\n');

    // Base64 encode for Gmail API
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
    });

    const result = await response.json();

    if (result.error) {
        throw new Error(result.error.message || 'Erro ao enviar email');
    }

    return Response.json({ 
        success: true, 
        messageId: result.id,
        threadId: result.threadId
    });
}

async function handleListEmails({ maxResults = 20, labelIds = ['INBOX'], query }, user, base44) {
    const accessToken = await getAccessToken(base44);

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    
    if (labelIds && labelIds.length) {
        labelIds.forEach(label => {
            url += `&labelIds=${encodeURIComponent(label)}`;
        });
    }
    
    if (query) {
        url += `&q=${encodeURIComponent(query)}`;
    }

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Erro ao listar emails');
    }

    if (!data.messages || data.messages.length === 0) {
        return Response.json({ emails: [], total: 0 });
    }

    // Get details for each message
    const emails = await Promise.all(
        data.messages.slice(0, 10).map(async (msg) => {
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

    return Response.json({ 
        emails, 
        total: data.resultSizeEstimate || emails.length,
        nextPageToken: data.nextPageToken
    });
}

async function handleGetEmail({ messageId }, user, base44) {
    const accessToken = await getAccessToken(base44);

    const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const msgData = await response.json();

    if (msgData.error) {
        throw new Error(msgData.error.message || 'Erro ao obter email');
    }

    const headers = msgData.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body
    let body = '';
    const extractBody = (part) => {
        if (part.body?.data) {
            const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            if (part.mimeType === 'text/html') {
                body = decoded;
            } else if (part.mimeType === 'text/plain' && !body) {
                body = decoded;
            }
        }
        if (part.parts) {
            part.parts.forEach(extractBody);
        }
    };
    extractBody(msgData.payload);

    return Response.json({
        id: msgData.id,
        threadId: msgData.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        cc: getHeader('Cc'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        body,
        labelIds: msgData.labelIds,
        snippet: msgData.snippet
    });
}

async function handleCheckConnection(user, base44) {
    try {
        const accessToken = await getAccessToken(base44);
        const email = await getUserEmail(accessToken);

        return Response.json({ 
            connected: true, 
            email: email 
        });
    } catch (error) {
        return Response.json({ connected: false, error: error.message });
    }
}

async function handleDisconnect(user, base44) {
    // With App Connector, user would need to disconnect from settings
    return Response.json({ success: true, message: 'Para desconectar, vá às definições da app' });
}

async function handleTestConnection(user, base44) {
    const results = {
        connectorTest: null,
        profileTest: null,
        apiTest: null
    };

    try {
        // Test getting access token from connector
        const accessToken = await getAccessToken(base44);
        results.connectorTest = { success: true, message: 'Token obtido do connector' };

        // Test API access - get profile
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const profileData = await profileResponse.json();
        
        if (profileResponse.ok) {
            results.profileTest = { success: true, email: profileData.email };
        } else {
            results.profileTest = { success: false, error: profileData.error?.message || 'Unknown error' };
        }

        // Test Gmail API access
        const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const gmailData = await gmailResponse.json();

        if (gmailResponse.ok) {
            results.apiTest = { 
                success: true, 
                email: gmailData.emailAddress,
                messagesTotal: gmailData.messagesTotal,
                threadsTotal: gmailData.threadsTotal
            };
        } else {
            results.apiTest = { success: false, error: gmailData.error?.message || 'Unknown error' };
        }

        return Response.json({
            success: results.profileTest?.success && results.apiTest?.success,
            message: results.apiTest?.success ? 'Conexão Gmail OK' : 'Erro na API Gmail',
            results
        });

    } catch (error) {
        results.error = error.message;
        return Response.json({
            success: false,
            message: error.message,
            results
        });
    }
}

async function handleSendTestEmail({ testEmail }, user, base44) {
    if (!testEmail) {
        return Response.json({ error: 'Email de teste não fornecido' }, { status: 400 });
    }

    try {
        const accessToken = await getAccessToken(base44);
        const fromEmail = await getUserEmail(accessToken);

        const subject = 'Teste de Configuração Gmail - Zugruppe';
        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e293b;">✅ Teste de Email Bem Sucedido!</h2>
                <p>Este email confirma que a integração Gmail está a funcionar corretamente.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #64748b; font-size: 12px;">
                    Enviado por: ${fromEmail}<br>
                    Data: ${new Date().toLocaleString('pt-PT')}<br>
                    Plataforma: Zugruppe CRM
                </p>
            </div>
        `;

        const email = [
            `From: ${fromEmail}`,
            `To: ${testEmail}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            body
        ].join('\r\n');

        const encodedEmail = btoa(unescape(encodeURIComponent(email)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encodedEmail })
        });

        const result = await response.json();

        if (result.error) {
            return Response.json({ 
                success: false, 
                error: result.error.message || 'Erro ao enviar email de teste'
            });
        }

        return Response.json({ 
            success: true, 
            message: `Email de teste enviado para ${testEmail}`,
            messageId: result.id
        });

    } catch (error) {
        return Response.json({ 
            success: false, 
            error: error.message 
        });
    }
}