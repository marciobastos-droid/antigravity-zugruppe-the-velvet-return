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
        ai_usage: 0
    };

    const maxScores = {
        basic_info: 25,
        media: 30,
        details: 25,
        ai_usage: 20
    };

    // 1. BASIC INFO (25 pontos)
    if (property.title && property.title.length >= 20) scores.basic_info += 5;
    if (property.description && property.description.length >= 100) scores.basic_info += 10;
    if (property.description && property.description.length >= 300) scores.basic_info += 5; // Bonus for detailed
    if (property.price > 0) scores.basic_info += 5;

    // 2. MEDIA (30 pontos)
    const imageCount = property.images?.length || 0;
    if (imageCount >= 1) scores.media += 5;
    if (imageCount >= 5) scores.media += 10;
    if (imageCount >= 10) scores.media += 5;
    if (imageCount >= 15) scores.media += 5;
    if (property.videos && property.videos.length > 0) scores.media += 3;
    if (property.floorplans && property.floorplans.length > 0) scores.media += 2;

    // 3. DETAILED INFO (25 pontos)
    if (property.bedrooms > 0) scores.details += 3;
    if (property.bathrooms > 0) scores.details += 3;
    if (property.useful_area > 0 || property.square_feet > 0) scores.details += 4;
    if (property.gross_area > 0) scores.details += 2;
    if (property.year_built > 0) scores.details += 2;
    if (property.energy_certificate && property.energy_certificate !== 'isento') scores.details += 3;
    if (property.garage && property.garage !== 'none') scores.details += 2;
    if (property.sun_exposure) scores.details += 2;
    if (property.amenities && property.amenities.length >= 3) scores.details += 2;
    if (property.amenities && property.amenities.length >= 6) scores.details += 2;

    // 4. AI USAGE (20 pontos)
    const aiFeatures = property.ai_features_used || [];
    if (aiFeatures.includes('description')) scores.ai_usage += 6;
    if (aiFeatures.includes('tags')) scores.ai_usage += 4;
    if (aiFeatures.includes('pricing')) scores.ai_usage += 6;
    if (aiFeatures.includes('images')) scores.ai_usage += 2;
    if (aiFeatures.includes('marketing')) scores.ai_usage += 2;
    
    // Legacy support - check if AI was used even without tracking
    if (property.ai_suggested_price > 0 && !aiFeatures.includes('pricing')) scores.ai_usage += 3;
    if (property.tags && property.tags.length >= 5 && !aiFeatures.includes('tags')) scores.ai_usage += 2;

    const total = Math.min(100, Math.round(
        scores.basic_info + scores.media + scores.details + scores.ai_usage
    ));

    const details = {
        basic_info: { score: scores.basic_info, max: maxScores.basic_info },
        media: { score: scores.media, max: maxScores.media },
        details: { score: scores.details, max: maxScores.details },
        ai_usage: { score: scores.ai_usage, max: maxScores.ai_usage },
        breakdown: {
            title: property.title?.length >= 20,
            description: property.description?.length >= 100,
            detailed_description: property.description?.length >= 300,
            images: imageCount,
            videos: property.videos?.length || 0,
            floorplans: property.floorplans?.length || 0,
            has_bedrooms: property.bedrooms > 0,
            has_bathrooms: property.bathrooms > 0,
            has_area: (property.useful_area || property.square_feet) > 0,
            has_energy_cert: !!property.energy_certificate,
            amenities_count: property.amenities?.length || 0,
            ai_features_count: aiFeatures.length
        },
        grade: total >= 80 ? 'Excelente' : total >= 60 ? 'Bom' : total >= 40 ? 'Médio' : 'Precisa Melhorias'
    };

    return { total, details };
}