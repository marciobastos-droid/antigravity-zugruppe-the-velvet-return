import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { integration_id, entity_type, entity_id, engagement_data } = await req.json();

        // Get CRM integration config
        const integrations = await base44.asServiceRole.entities.CRMIntegration.filter({ 
            id: integration_id,
            is_active: true 
        });

        if (integrations.length === 0) {
            return Response.json({ error: 'Integration not found or inactive' }, { status: 404 });
        }

        const integration = integrations[0];
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${integration.api_key}`
        };

        let syncResult = {};

        // Sync based on entity type
        if (entity_type === 'property_engagement') {
            const property = await base44.asServiceRole.entities.Property.filter({ id: entity_id });
            if (property.length === 0) {
                return Response.json({ error: 'Property not found' }, { status: 404 });
            }

            const propertyData = property[0];
            
            // Build CRM payload with engagement metrics
            const crmPayload = {
                property_id: propertyData.external_crm_id || entity_id,
                engagement_score: engagement_data.total_score || 0,
                total_views: engagement_data.views || 0,
                total_saves: engagement_data.saves || 0,
                total_shares: engagement_data.shares || 0,
                total_inquiries: engagement_data.inquiries || 0,
                last_activity_date: new Date().toISOString(),
                hot_lead_count: engagement_data.hot_leads || 0
            };

            // Send to CRM
            const response = await fetch(`${integration.api_url}/properties/${propertyData.external_crm_id}/engagement`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(crmPayload)
            });

            if (!response.ok) {
                throw new Error(`CRM API Error: ${response.status}`);
            }

            syncResult = await response.json();

            // Log sync
            await base44.asServiceRole.entities.CRMSyncLog.create({
                integration_id,
                integration_name: integration.name,
                entity_type: 'property_engagement',
                property_id: entity_id,
                property_title: propertyData.title,
                action: 'engagement_sync',
                status: 'success',
                external_id: propertyData.external_crm_id
            });
        }

        if (entity_type === 'lead_score') {
            const opportunity = await base44.asServiceRole.entities.Opportunity.filter({ id: entity_id });
            if (opportunity.length === 0) {
                return Response.json({ error: 'Opportunity not found' }, { status: 404 });
            }

            const oppData = opportunity[0];
            
            const crmPayload = {
                lead_id: oppData.external_crm_id || entity_id,
                score: engagement_data.qualification_score || 0,
                temperature: engagement_data.lead_temperature,
                last_interaction: engagement_data.last_interaction_date,
                total_interactions: engagement_data.interaction_count || 0,
                properties_viewed: engagement_data.properties_viewed || 0,
                engagement_level: engagement_data.engagement_level
            };

            const response = await fetch(`${integration.api_url}/leads/${oppData.external_crm_id}/score`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(crmPayload)
            });

            if (!response.ok) {
                throw new Error(`CRM API Error: ${response.status}`);
            }

            syncResult = await response.json();

            await base44.asServiceRole.entities.CRMSyncLog.create({
                integration_id,
                integration_name: integration.name,
                entity_type: 'lead_score',
                action: 'score_sync',
                status: 'success',
                external_id: oppData.external_crm_id
            });
        }

        return Response.json({
            success: true,
            synced: true,
            crm_response: syncResult
        });

    } catch (error) {
        console.error('Engagement Sync Error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});