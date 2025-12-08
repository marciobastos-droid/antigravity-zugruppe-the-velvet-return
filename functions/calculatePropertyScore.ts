import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { property_id, property_ids } = await req.json();

        // Single property or multiple
        const ids = property_ids || [property_id];
        const results = [];

        for (const id of ids) {
            try {
                const properties = await base44.entities.Property.filter({ id });
                if (properties.length === 0) continue;

                const property = properties[0];
                const score = calculateScore(property);

                // Update property with score
                await base44.entities.Property.update(id, {
                    quality_score: score.total,
                    quality_score_breakdown: score.breakdown,
                    last_score_calculation: new Date().toISOString()
                });

                results.push({
                    property_id: id,
                    property_title: property.title,
                    score: score.total,
                    breakdown: score.breakdown
                });
            } catch (error) {
                console.error(`Error calculating score for ${id}:`, error);
            }
        }

        return Response.json({
            success: true,
            results,
            total_processed: results.length
        });

    } catch (error) {
        console.error('Calculate Score Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function calculateScore(property) {
    const breakdown = {
        basic_info: 0,
        details: 0,
        media: 0,
        location: 0,
        ai_usage: 0
    };

    // Basic Info (30 points)
    if (property.title && property.title.length > 20) breakdown.basic_info += 10;
    if (property.description && property.description.length > 100) breakdown.basic_info += 10;
    if (property.price > 0) breakdown.basic_info += 5;
    if (property.property_type) breakdown.basic_info += 5;

    // Details (25 points)
    if (property.bedrooms > 0) breakdown.details += 3;
    if (property.bathrooms > 0) breakdown.details += 3;
    if (property.useful_area > 0 || property.square_feet > 0) breakdown.details += 4;
    if (property.energy_certificate) breakdown.details += 5;
    if (property.year_built > 0) breakdown.details += 3;
    if (property.amenities && property.amenities.length >= 3) breakdown.details += 4;
    if (property.finishes) breakdown.details += 3;

    // Media (20 points)
    const imageCount = property.images?.length || 0;
    if (imageCount >= 1) breakdown.media += 5;
    if (imageCount >= 5) breakdown.media += 5;
    if (imageCount >= 10) breakdown.media += 5;
    if (property.videos && property.videos.length > 0) breakdown.media += 3;
    if (property.floorplans && property.floorplans.length > 0) breakdown.media += 2;

    // Location (10 points)
    if (property.address) breakdown.location += 3;
    if (property.city) breakdown.location += 3;
    if (property.state) breakdown.location += 2;
    if (property.zip_code) breakdown.location += 2;

    // AI Usage (15 points)
    const aiFeatures = property.ai_features_used || [];
    if (property.ai_suggested_price || aiFeatures.includes('price_suggestion')) breakdown.ai_usage += 5;
    if (aiFeatures.includes('description_generation') || (property.description && property.description.length > 200)) breakdown.ai_usage += 5;
    if (property.tags && property.tags.length >= 3) breakdown.ai_usage += 3;
    if (property.ai_price_analysis) breakdown.ai_usage += 2;

    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return {
        total: Math.min(total, 100),
        breakdown
    };
}