import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { propertyId, propertyIds } = await req.json();

        // Support both single and batch scoring
        const ids = propertyIds || (propertyId ? [propertyId] : []);
        
        if (ids.length === 0) {
            return Response.json({ error: 'propertyId or propertyIds required' }, { status: 400 });
        }

        const properties = await base44.asServiceRole.entities.Property.list();
        const results = [];

        for (const id of ids) {
            const property = properties.find(p => p.id === id);
            
            if (!property) {
                results.push({ id, error: 'Property not found' });
                continue;
            }

            const score = calculateScore(property);
            
            // Update property with score
            await base44.asServiceRole.entities.Property.update(id, {
                quality_score: score.total,
                quality_score_details: score.details,
                last_score_calculation: new Date().toISOString()
            });

            results.push({
                id,
                success: true,
                score: score.total,
                details: score.details
            });
        }

        return Response.json({
            success: true,
            results: propertyIds ? results : results[0]
        });

    } catch (error) {
        console.error('Error calculating property score:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});

function calculateScore(property) {
    const scores = {
        basic_info: 0,
        media: 0,
        details: 0,
        publication: 0,
        ai_usage: 0
    };

    const maxScores = {
        basic_info: 20,
        media: 30,
        details: 25,
        publication: 15,
        ai_usage: 10
    };

    // 1. INFORMAÇÃO BÁSICA (20 pontos) - ESSENCIAL
    // Título adequado
    if (property.title && property.title.length >= 15) scores.basic_info += 3;
    if (property.title && property.title.length >= 30) scores.basic_info += 2;
    
    // Descrição completa e detalhada
    if (property.description && property.description.length >= 50) scores.basic_info += 3;
    if (property.description && property.description.length >= 150) scores.basic_info += 4;
    if (property.description && property.description.length >= 400) scores.basic_info += 3;
    
    // Preço definido
    if (property.price > 0) scores.basic_info += 5;

    // 2. MEDIA (30 pontos) - MUITO IMPORTANTE
    const imageCount = property.images?.length || 0;
    
    // Fotos são essenciais
    if (imageCount >= 1) scores.media += 3;
    if (imageCount >= 3) scores.media += 5;
    if (imageCount >= 7) scores.media += 8;
    if (imageCount >= 12) scores.media += 6;
    if (imageCount >= 20) scores.media += 3;
    
    // Vídeos aumentam muito o engagement
    if (property.videos && property.videos.length > 0) scores.media += 4;
    
    // Plantas são diferenciadoras
    if (property.floorplans && property.floorplans.length > 0) scores.media += 1;

    // 3. DETALHES DO IMÓVEL (25 pontos) - IMPORTANTE
    // Características principais (relevante para todos tipos)
    const isResidential = ['house', 'apartment', 'condo', 'townhouse'].includes(property.property_type);
    const isCommercial = ['commercial', 'office', 'store', 'warehouse'].includes(property.property_type);
    
    if (isResidential) {
        if (property.bedrooms > 0) scores.details += 4;
        if (property.bathrooms > 0) scores.details += 3;
    } else {
        // Para comerciais, área é mais importante que quartos
        scores.details += 3;
    }
    
    // Áreas são sempre importantes
    if (property.useful_area > 0 || property.square_feet > 0) scores.details += 5;
    if (property.gross_area > 0) scores.details += 2;
    
    // Informação adicional relevante
    if (property.year_built > 0) scores.details += 2;
    if (property.energy_certificate && property.energy_certificate !== 'isento') scores.details += 3;
    
    // Características extras
    if (isResidential && property.garage && property.garage !== 'none') scores.details += 2;
    if (isResidential && property.sun_exposure) scores.details += 1;
    
    // Comodidades/características
    const amenitiesCount = property.amenities?.length || 0;
    if (amenitiesCount >= 2) scores.details += 1;
    if (amenitiesCount >= 5) scores.details += 1;
    if (amenitiesCount >= 8) scores.details += 1;

    // 4. PUBLICAÇÃO (15 pontos) - ALCANCE
    // Publicado em portais externos
    const portalsCount = property.published_portals?.length || 0;
    if (portalsCount >= 1) scores.publication += 3;
    if (portalsCount >= 2) scores.publication += 3;
    if (portalsCount >= 3) scores.publication += 2;
    
    // Publicado nas páginas do website
    const pagesCount = property.published_pages?.length || 0;
    if (pagesCount >= 1) scores.publication += 3;
    if (pagesCount >= 2) scores.publication += 2;
    if (pagesCount >= 3) scores.publication += 2;

    // 5. UTILIZAÇÃO DE IA (10 pontos) - OTIMIZAÇÃO
    const aiFeatures = property.ai_features_used || [];
    if (aiFeatures.includes('description')) scores.ai_usage += 3;
    if (aiFeatures.includes('tags')) scores.ai_usage += 2;
    if (aiFeatures.includes('pricing')) scores.ai_usage += 3;
    if (aiFeatures.includes('images')) scores.ai_usage += 1;
    if (aiFeatures.includes('marketing')) scores.ai_usage += 1;
    
    // Suporte legacy
    if (property.ai_suggested_price > 0 && !aiFeatures.includes('pricing')) scores.ai_usage += 2;
    if (property.tags && property.tags.length >= 5 && !aiFeatures.includes('tags')) scores.ai_usage += 1;

    const total = Math.min(100, Math.round(
        scores.basic_info + scores.media + scores.details + scores.publication + scores.ai_usage
    ));

    const details = {
        basic_info: { score: scores.basic_info, max: maxScores.basic_info },
        media: { score: scores.media, max: maxScores.media },
        details: { score: scores.details, max: maxScores.details },
        publication: { score: scores.publication, max: maxScores.publication },
        ai_usage: { score: scores.ai_usage, max: maxScores.ai_usage },
        breakdown: {
            title_length: property.title?.length || 0,
            description_length: property.description?.length || 0,
            has_price: property.price > 0,
            images: imageCount,
            videos: property.videos?.length || 0,
            floorplans: property.floorplans?.length || 0,
            has_bedrooms: property.bedrooms > 0,
            has_bathrooms: property.bathrooms > 0,
            has_area: (property.useful_area || property.square_feet) > 0,
            has_energy_cert: property.energy_certificate && property.energy_certificate !== 'isento',
            amenities_count: amenitiesCount,
            portals_count: portalsCount,
            pages_count: pagesCount,
            ai_features_count: aiFeatures.length
        },
        grade: total >= 85 ? 'Excelente' : total >= 70 ? 'Muito Bom' : total >= 55 ? 'Bom' : total >= 40 ? 'Médio' : 'Precisa Melhorias',
        suggestions: generateSuggestions(property, scores, maxScores)
    };

    return { total, details };
}

function generateSuggestions(property, scores, maxScores) {
    const suggestions = [];
    
    // Críticas (alta prioridade)
    if (!property.price || property.price <= 0) {
        suggestions.push({ priority: 'high', text: 'Defina o preço do imóvel', category: 'basic' });
    }
    if (!property.images || property.images.length === 0) {
        suggestions.push({ priority: 'high', text: 'Adicione pelo menos 1 foto', category: 'media' });
    }
    if (!property.description || property.description.length < 50) {
        suggestions.push({ priority: 'high', text: 'Adicione uma descrição mais completa (mínimo 50 caracteres)', category: 'basic' });
    }
    
    // Importantes (média prioridade)
    if (property.images && property.images.length < 7) {
        suggestions.push({ priority: 'medium', text: `Adicione mais fotos (tem ${property.images.length}, recomendado 7+)`, category: 'media' });
    }
    if (!property.useful_area && !property.square_feet) {
        suggestions.push({ priority: 'medium', text: 'Preencha a área útil', category: 'details' });
    }
    if (property.description && property.description.length < 150) {
        suggestions.push({ priority: 'medium', text: 'Expanda a descrição (recomendado 150+ caracteres)', category: 'basic' });
    }
    if (!property.published_portals || property.published_portals.length === 0) {
        suggestions.push({ priority: 'medium', text: 'Publique em portais imobiliários', category: 'publication' });
    }
    if (!property.published_pages || property.published_pages.length === 0) {
        suggestions.push({ priority: 'medium', text: 'Publique no website', category: 'publication' });
    }
    
    // Melhorias (baixa prioridade)
    const isResidential = ['house', 'apartment', 'condo', 'townhouse'].includes(property.property_type);
    if (isResidential && (!property.bedrooms || property.bedrooms === 0)) {
        suggestions.push({ priority: 'low', text: 'Defina o número de quartos', category: 'details' });
    }
    if (!property.energy_certificate || property.energy_certificate === 'isento') {
        suggestions.push({ priority: 'low', text: 'Adicione certificado energético', category: 'details' });
    }
    if (!property.videos || property.videos.length === 0) {
        suggestions.push({ priority: 'low', text: 'Adicione um vídeo do imóvel', category: 'media' });
    }
    if (!property.amenities || property.amenities.length < 5) {
        suggestions.push({ priority: 'low', text: 'Liste mais comodidades/características', category: 'details' });
    }
    if (!property.ai_features_used || property.ai_features_used.length === 0) {
        suggestions.push({ priority: 'low', text: 'Use ferramentas IA para otimizar', category: 'ai' });
    }
    
    return suggestions;
}