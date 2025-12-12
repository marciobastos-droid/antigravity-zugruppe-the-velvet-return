import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
        throw new Error(`Falha no login Casafari: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function fetchCasafariAlerts(token, initialUrl) {
    let url = initialUrl;
    let allAlerts = [];
    let attempts = 0;

    while (url) {
        attempts++;
        if (attempts > 50) { 
            console.error("Limite de 50 páginas atingido.");
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
                console.warn("Token expirado. Reautenticando...");
                token = await getCasafariToken();
                continue;
            }
            throw new Error("Falha na re-autenticação.");
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao buscar alertas: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const paginationData = data[0]; 
        const resultadosPagina = paginationData.results || [];
        
        allAlerts.push(...resultadosPagina);
        url = paginationData.next;    
        
        console.log(`Página processada. Total alertas: ${allAlerts.length}`);
        attempts = 0; 
    }

    return allAlerts;
}

function mapCasafariToProperty(casafariData) {
    // Mapear campos do Casafari para o schema Property
    return {
        title: casafariData.description || `Imóvel Casafari ${casafariData.property_id}`,
        description: casafariData.full_description || casafariData.description || '',
        property_type: mapPropertyType(casafariData.type),
        listing_type: mapListingType(casafariData.sale_status),
        price: casafariData.sale_price || 0,
        currency: 'EUR',
        bedrooms: casafariData.bedrooms || 0,
        bathrooms: casafariData.bathrooms || 0,
        square_feet: casafariData.total_area || 0,
        useful_area: casafariData.useful_area || casafariData.total_area || 0,
        gross_area: casafariData.gross_area || casafariData.total_area || 0,
        year_built: casafariData.construction_year || null,
        latitude: casafariData.coordinates?.latitude || null,
        longitude: casafariData.coordinates?.longitude || null,
        address: casafariData.address || casafariData.location || '',
        city: casafariData.city || extractCity(casafariData.location) || '',
        state: casafariData.region || casafariData.state || '',
        country: 'Portugal',
        images: casafariData.pictures || [],
        amenities: casafariData.features || [],
        status: 'active',
        visibility: 'public',
        source_url: casafariData.url || null,
        external_id: casafariData.property_id || casafariData.id,
        tags: ['Casafari', 'Importado'],
        energy_certificate: casafariData.energy_rating || null
    };
}

function mapPropertyType(casafariType) {
    const mapping = {
        'apartment': 'apartment',
        'house': 'house',
        'villa': 'house',
        'land': 'land',
        'commercial': 'commercial',
        'office': 'office',
        'warehouse': 'warehouse',
        'building': 'building'
    };
    return mapping[casafariType?.toLowerCase()] || 'apartment';
}

function mapListingType(saleStatus) {
    if (!saleStatus) return 'sale';
    const status = saleStatus.toLowerCase();
    if (status.includes('rent') || status.includes('arrendamento')) return 'rent';
    return 'sale';
}

function extractCity(location) {
    if (!location) return '';
    // Tentar extrair cidade de uma string de localização
    const parts = location.split(',');
    return parts[0]?.trim() || '';
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor';
        if (!isAdmin) {
            return Response.json({ error: 'Apenas administradores' }, { status: 403 });
        }

        console.log("🔄 Iniciando importação Casafari → Property...");
        
        let token = Deno.env.get('CASAFARI_ACCESS_TOKEN');
        const feedId = Deno.env.get('CASAFARI_FEED_ID');
        let checkpoint = Deno.env.get('LAST_SYNC_CHECKPOINT');
        
        if (!feedId || !checkpoint) {
            return Response.json({ 
                success: false,
                error: 'Configure CASAFARI_FEED_ID e LAST_SYNC_CHECKPOINT'
            }, { status: 400 });
        }

        // Autenticar se necessário
        if (!token) {
            console.log("A autenticar na Casafari...");
            token = await getCasafariToken();
        }

        const initialUrl = `https://api.casafari.com/api/v1/listing-alerts/feeds/${feedId}?created_at_from=${checkpoint}&limit=100&order_by=created_at`;
        console.log("URL:", initialUrl);
        
        const allAlerts = await fetchCasafariAlerts(token, initialUrl);
        console.log(`✅ ${allAlerts.length} alertas encontrados`);
        
        if (allAlerts.length === 0) {
            return Response.json({
                success: true,
                message: 'Nenhum imóvel novo encontrado',
                imported: 0,
                updated: 0
            });
        }

        // Gerar ref_ids para novos imóveis
        const { data: refData } = await base44.asServiceRole.functions.invoke('generateRefId', { 
            entity_type: 'Property', 
            count: allAlerts.length 
        });
        const refIds = refData.ref_ids || [refData.ref_id];

        let imported = 0;
        let updated = 0;
        let errors = 0;
        let novoCheckpoint = checkpoint;

        console.log(`📥 Processando ${allAlerts.length} imóveis...`);

        for (let i = 0; i < allAlerts.length; i++) {
            const alerta = allAlerts[i];
            try {
                const casafariID = alerta.property_id;
                const propertyData = mapCasafariToProperty(alerta);

                // Verificar se já existe (por external_id)
                const existentes = await base44.asServiceRole.entities.Property.filter({ 
                    external_id: casafariID 
                });

                if (existentes.length > 0) {
                    // Atualizar imóvel existente
                    await base44.asServiceRole.entities.Property.update(
                        existentes[0].id, 
                        propertyData
                    );
                    updated++;
                } else {
                    // Criar novo imóvel
                    await base44.asServiceRole.entities.Property.create({
                        ...propertyData,
                        ref_id: refIds[i] || `CAS-${Date.now()}-${i}`
                    });
                    imported++;
                }
                
                // Atualizar checkpoint
                if (alerta.created_at > novoCheckpoint) {
                    novoCheckpoint = alerta.created_at;
                }
            } catch (itemError) {
                console.error(`Erro ao processar ${alerta.property_id}:`, itemError.message);
                errors++;
            }
        }
        
        console.log(`✅ Importação concluída! ${imported} novos, ${updated} atualizados, ${errors} erros`);
        console.log(`📌 Novo checkpoint sugerido: ${novoCheckpoint}`);

        return Response.json({
            success: true,
            imported,
            updated,
            errors,
            total: allAlerts.length,
            newCheckpoint: novoCheckpoint,
            message: `${imported} novos imóveis, ${updated} atualizados`
        });

    } catch (error) {
        console.error("❌ Erro na importação:", error.message);
        return Response.json({ 
            success: false,
            error: error.message
        }, { status: 500 });
    }
});