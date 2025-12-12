import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor';
        if (!isAdmin) {
            return Response.json({ error: 'Apenas administradores podem testar configurações' }, { status: 403 });
        }

        // Verificar se todas as variáveis necessárias existem
        const email = Deno.env.get('CASAFARI_EMAIL');
        const password = Deno.env.get('CASAFARI_PASSWORD');
        const feedId = Deno.env.get('CASAFARI_FEED_ID');
        const checkpoint = Deno.env.get('LAST_SYNC_CHECKPOINT');
        const apiKey = Deno.env.get('CASAFARI_API_KEY');

        const details = {
            hasEmail: !!email,
            hasPassword: !!password,
            hasFeedId: !!feedId,
            hasCheckpoint: !!checkpoint,
            hasApiKey: !!apiKey,
            allConfigured: !!(email && password && feedId && checkpoint)
        };

        if (!details.allConfigured) {
            const missing = [];
            if (!email) missing.push('CASAFARI_EMAIL');
            if (!password) missing.push('CASAFARI_PASSWORD');
            if (!feedId) missing.push('CASAFARI_FEED_ID');
            if (!checkpoint) missing.push('LAST_SYNC_CHECKPOINT');

            return Response.json({
                success: false,
                message: `Configuração incompleta. Faltam: ${missing.join(', ')}`,
                details
            });
        }

        // Testar autenticação com a Casafari
        try {
            const loginResponse = await fetch('https://api.casafari.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!loginResponse.ok) {
                const errorText = await loginResponse.text();
                return Response.json({
                    success: false,
                    message: `Falha na autenticação Casafari: ${loginResponse.statusText}`,
                    details: { ...details, authError: errorText }
                });
            }

            const authData = await loginResponse.json();

            return Response.json({
                success: true,
                message: 'Configuração OK! Autenticação Casafari bem-sucedida.',
                details: {
                    ...details,
                    authenticated: true,
                    tokenReceived: !!authData.access_token
                }
            });

        } catch (authError) {
            return Response.json({
                success: false,
                message: `Erro ao testar autenticação: ${authError.message}`,
                details
            });
        }

    } catch (error) {
        console.error("Error testing Casafari config:", error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});