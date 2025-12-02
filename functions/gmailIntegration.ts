import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, ...params } = await req.json();

        switch (action) {
            case 'getAuthUrl':
                return handleGetAuthUrl(params);
            case 'exchangeCode':
                return handleExchangeCode(params, user, base44);
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

function handleGetAuthUrl({ redirectUri }) {
    // Check if credentials are configured
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return Response.json({ 
            error: 'Credenciais Google OAuth não configuradas. Configure GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET nas variáveis de ambiente.',
            missing: {
                clientId: !GOOGLE_CLIENT_ID,
                clientSecret: !GOOGLE_CLIENT_SECRET
            }
        }, { status: 400 });
    }

    const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&access_type=offline` +
        `&prompt=consent`;

    return Response.json({ authUrl, redirectUri, clientIdPreview: GOOGLE_CLIENT_ID?.substring(0, 20) + '...' });
}

async function handleExchangeCode({ code, redirectUri }, user, base44) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
        return Response.json({ error: tokens.error_description || tokens.error }, { status: 400 });
    }

    // Get user email from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoResponse.json();

    // Save tokens to user
    await base44.auth.updateMe({
        gmail_tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: Date.now() + (tokens.expires_in * 1000),
            connected_email: userInfo.email
        }
    });

    return Response.json({ 
        success: true, 
        connected_email: userInfo.email 
    });
}

async function getValidAccessToken(user, base44) {
    const tokens = user.gmail_tokens;
    
    if (!tokens || !tokens.refresh_token) {
        throw new Error('Gmail não conectado. Por favor, conecte a sua conta Gmail.');
    }

    // Check if token is expired (with 5 min buffer)
    if (tokens.expiry_date && tokens.expiry_date < Date.now() + 300000) {
        // Refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: tokens.refresh_token,
                grant_type: 'refresh_token'
            })
        });

        const newTokens = await refreshResponse.json();

        if (newTokens.error) {
            throw new Error('Falha ao atualizar token. Por favor, reconecte a sua conta Gmail.');
        }

        // Update tokens in user profile
        await base44.auth.updateMe({
            gmail_tokens: {
                ...tokens,
                access_token: newTokens.access_token,
                expiry_date: Date.now() + (newTokens.expires_in * 1000)
            }
        });

        return newTokens.access_token;
    }

    return tokens.access_token;
}

async function handleSendEmail({ to, subject, body, cc, bcc, replyTo }, user, base44) {
    const accessToken = await getValidAccessToken(user, base44);

    // Build email
    const email = [
        `From: ${user.gmail_tokens.connected_email}`,
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
    const accessToken = await getValidAccessToken(user, base44);

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
    const accessToken = await getValidAccessToken(user, base44);

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
    const tokens = user.gmail_tokens;
    
    if (!tokens || !tokens.access_token) {
        return Response.json({ connected: false });
    }

    try {
        const accessToken = await getValidAccessToken(user, base44);
        
        // Verify token works
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            return Response.json({ connected: false });
        }

        return Response.json({ 
            connected: true, 
            email: tokens.connected_email 
        });
    } catch (error) {
        return Response.json({ connected: false, error: error.message });
    }
}

async function handleDisconnect(user, base44) {
    await base44.auth.updateMe({ gmail_tokens: null });
    return Response.json({ success: true });
}

async function handleTestConnection(user, base44) {
    const tokens = user.gmail_tokens;
    
    const results = {
        hasTokens: !!tokens,
        hasAccessToken: !!tokens?.access_token,
        hasRefreshToken: !!tokens?.refresh_token,
        connectedEmail: tokens?.connected_email || null,
        tokenExpiry: tokens?.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        isExpired: tokens?.expiry_date ? tokens.expiry_date < Date.now() : null,
        googleClientIdSet: !!GOOGLE_CLIENT_ID,
        googleClientSecretSet: !!GOOGLE_CLIENT_SECRET,
        apiTest: null,
        profileTest: null
    };

    if (!tokens?.access_token) {
        return Response.json({ 
            success: false, 
            message: 'Gmail não conectado',
            results 
        });
    }

    try {
        // Test getting a valid access token (will refresh if needed)
        const accessToken = await getValidAccessToken(user, base44);
        results.tokenRefreshSuccess = true;

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
        results.tokenRefreshSuccess = false;
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
        const accessToken = await getValidAccessToken(user, base44);

        const subject = 'Teste de Configuração Gmail - Zugruppe';
        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e293b;">✅ Teste de Email Bem Sucedido!</h2>
                <p>Este email confirma que a integração Gmail está a funcionar corretamente.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #64748b; font-size: 12px;">
                    Enviado por: ${user.gmail_tokens?.connected_email || user.email}<br>
                    Data: ${new Date().toLocaleString('pt-PT')}<br>
                    Plataforma: Zugruppe CRM
                </p>
            </div>
        `;

        const email = [
            `From: ${user.gmail_tokens.connected_email}`,
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