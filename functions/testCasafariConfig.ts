import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("--- Teste de Leitura de Variáveis Globais Casafari ---");
        
        const email = Deno.env.get('CASAFARI_EMAIL');
        const password = Deno.env.get('CASAFARI_PASSWORD');
        const feedId = Deno.env.get('CASAFARI_FEED_ID');
        const checkpoint = Deno.env.get('LAST_SYNC_CHECKPOINT');
        const accessToken = Deno.env.get('CASAFARI_ACCESS_TOKEN');

        const results = {
            email: email ? `${email.substring(0, 5)}...` : null,
            emailStatus: email ? '✅ Lida com sucesso' : '❌ ERRO: Valor não encontrado',
            passwordStatus: password ? '✅ Lida com sucesso' : '❌ ERRO: Não lida ou em falta',
            feedId: feedId || null,
            feedIdStatus: feedId ? '✅ Lida com sucesso' : '❌ ERRO: Valor não encontrado',
            checkpoint: checkpoint || null,
            checkpointStatus: checkpoint ? '✅ Lida com sucesso' : '❌ ERRO: Valor não encontrado',
            accessTokenStatus: accessToken ? '✅ Token existente' : 'ℹ️ Token será gerado no primeiro login',
            allConfigured: !!(email && password && feedId && checkpoint)
        };

        console.log(`Email: ${results.emailStatus}`);
        console.log(`Password: ${results.passwordStatus}`);
        console.log(`Feed ID: ${results.feedIdStatus} - Valor: ${results.feedId}`);
        console.log(`Checkpoint: ${results.checkpointStatus} - Valor: ${results.checkpoint}`);
        console.log(`Access Token: ${results.accessTokenStatus}`);

        if (results.allConfigured) {
            console.log("✅ TODAS AS VARIÁVEIS CHAVE FORAM LIDAS COM SUCESSO. Pode usar a função de sincronização Casafari.");
        } else {
            console.error("❌ ERRO: Uma ou mais variáveis globais não foram lidas. Verifique a configuração dos segredos.");
        }

        return Response.json({
            success: true,
            message: results.allConfigured 
                ? "✅ Todas as variáveis estão configuradas corretamente"
                : "❌ Algumas variáveis estão em falta",
            details: results
        });

    } catch (error) {
        console.error("Erro ao testar configuração:", error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});