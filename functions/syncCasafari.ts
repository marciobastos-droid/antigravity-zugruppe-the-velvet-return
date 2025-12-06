import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Autentica na API da Casafari para obter ou renovar o token de acesso.
 * @returns {string} O novo Access Token JWT.
 */
async function getCasafariToken() {
    const loginData = {
        email: Deno.env.get('CASAFARI_EMAIL'), 
        password: Deno.env.get('CASAFARI_PASSWORD')
    };
    
    const response = await fetch('https://api.casafari.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[ERRO CASAFARI LOGIN] Falha: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Busca e pagina todos os alertas incrementais.
 * @param {string} token - O token de autenticação JWT.
 * @param {string} initialUrl - A URL inicial da busca.
 * @returns {object} Um objeto contendo allAlerts (Array de imóveis).
 */
async function fetchCasafariAlerts(token, initialUrl) {
    let url = initialUrl;
    let allAlerts = [];
    let attempts = 0;

    while (url) {
        attempts++;
        if (attempts > 50) { 
            console.error("Limite de 50 páginas atingido. A sincronização pode estar incompleta.");
            break;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            if (attempts === 1) { 
                console.warn("Token expirado. Tentando reautenticar...");
                token = await getCasafariToken();
                continue;
            }
            throw new Error("Falha na re-autenticação. Abortando a sincronização.");
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[ERRO API ALERTS] Falha na busca: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const paginationData = data[0]; 
        const resultadosPagina = paginationData.results || [];
        
        allAlerts.push(...resultadosPagina);
        url = paginationData.next;    
        
        console.log(`Página processada. Alertas recolhidos até agora: ${allAlerts.length}.`);
        attempts = 0; 
    }

    return { allAlerts };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        console.log("Iniciando sincronização incremental Casafari...");
        
        let token = Deno.env.get('CASAFARI_ACCESS_TOKEN');
        const feedId = Deno.env.get('CASAFARI_FEED_ID');
        let checkpoint = Deno.env.get('LAST_SYNC_CHECKPOINT');
        
        if (!feedId || !checkpoint) {
            return Response.json({ 
                success: false,
                error: 'Variáveis de configuração (FEED_ID ou CHECKPOINT) em falta'
            }, { status: 400 });
        }

        // Autenticação inicial se token não existir
        if (!token) {
            token = await getCasafariToken();
        }

        const initialUrl = `https://api.casafari.com/api/v1/listing-alerts/feeds/${feedId}?created_at_from=${checkpoint}&limit=100&order_by=created_at`;
        
        const { allAlerts } = await fetchCasafariAlerts(token, initialUrl);
        
        if (allAlerts.length === 0) {
            console.log("Nenhum novo imóvel ou atualização encontrado.");
            return Response.json({
                success: true,
                message: 'Nenhum novo imóvel encontrado',
                synchronized: 0
            });
        }

        let novoCheckpoint = checkpoint;
        let upsertCount = 0;

        console.log(`Iniciando Upsert para ${allAlerts.length} alertas/imóveis.`);

        for (const alerta of allAlerts) {
            const casafariID = alerta.property_id;
            
            const dadosImovel = {
                CasafariID: casafariID, 
                UltimaAtualizacao: alerta.updated_at,
                DataCriacaoAlerta: alerta.created_at,
                Titulo: alerta.description,
                Tipo: alerta.type,
                StatusVenda: alerta.sale_status,
                PrecoVenda: alerta.sale_price,
                AreaTotal: alerta.total_area,
                Quartos: alerta.bedrooms,
                Banheiros: alerta.bathrooms,
                AnoConstrucao: alerta.construction_year,
                Latitude: alerta.coordinates ? alerta.coordinates.latitude : null,
                Longitude: alerta.coordinates ? alerta.coordinates.longitude : null,
                URLFotos: alerta.pictures ? alerta.pictures.join(';') : '', 
            };

            const imoveisExistentes = await base44.asServiceRole.entities.ImoveisCasafari.filter({ 
                CasafariID: casafariID 
            });

            if (imoveisExistentes.length > 0) {
                await base44.asServiceRole.entities.ImoveisCasafari.update(
                    imoveisExistentes[0].id, 
                    dadosImovel
                );
            } else {
                await base44.asServiceRole.entities.ImoveisCasafari.create(dadosImovel);
            }
            
            upsertCount++;
            
            if (alerta.created_at > novoCheckpoint) {
                novoCheckpoint = alerta.created_at;
            }
        }
        
        // Nota: O checkpoint deve ser atualizado manualmente no painel de segredos
        console.log(`✅ Sincronização concluída! ${upsertCount} imóveis atualizados/inseridos.`);
        console.log(`Novo checkpoint sugerido: ${novoCheckpoint}`);

        return Response.json({
            success: true,
            synchronized: upsertCount,
            totalAlerts: allAlerts.length,
            newCheckpoint: novoCheckpoint,
            message: `${upsertCount} imóveis sincronizados com sucesso`
        });

    } catch (error) {
        console.error("❌ ERRO CRÍTICO NA SINCRONIZAÇÃO:", error.message);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});