import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Automatic bidirectional CRM sync
 * Call this periodically (e.g., via cron) or trigger on entity changes
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Service role - this runs as background job
        const { integration_id, direction, entity_types } = await req.json();

        const integrations = integration_id 
            ? await base44.asServiceRole.entities.CRMIntegration.filter({ id: integration_id })
            : await base44.asServiceRole.entities.CRMIntegration.filter({ is_active: true });

        if (integrations.length === 0) {
            return Response.json({ error: 'No active integrations found' }, { status: 404 });
        }

        const results = {
            integrations_processed: 0,
            total_synced: 0,
            errors: []
        };

        for (const integration of integrations) {
            try {
                // PULL from CRM (CRM → Base44)
                if (!direction || direction === 'pull' || direction === 'bidirectional') {
                    const pullResult = await base44.asServiceRole.functions.invoke('pullCRMUpdates', {
                        integration_id: integration.id,
                        entity_types: entity_types || ['contacts', 'opportunities'],
                        since_date: integration.last_sync
                    });

                    results.total_synced += (pullResult.data?.results?.contacts_synced || 0);
                    results.total_synced += (pullResult.data?.results?.opportunities_synced || 0);
                }

                // PUSH to CRM (Base44 → CRM)
                if (!direction || direction === 'push' || direction === 'bidirectional') {
                    // Get entities updated since last sync
                    const lastSync = integration.last_sync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    
                    // Sync properties
                    if (!entity_types || entity_types.includes('properties')) {
                        const properties = await base44.asServiceRole.entities.Property.list('-updated_date');
                        const recentlyUpdated = properties.filter(p => 
                            new Date(p.updated_date) > new Date(lastSync) &&
                            integration.sync_on_update
                        );

                        for (const property of recentlyUpdated) {
                            try {
                                await base44.asServiceRole.functions.invoke('syncPropertyToCRM', {
                                    property_id: property.id,
                                    integration_id: integration.id
                                });
                                results.total_synced++;
                            } catch (error) {
                                results.errors.push({ 
                                    property_id: property.id, 
                                    error: error.message 
                                });
                            }
                        }
                    }

                    // Sync contacts
                    if (!entity_types || entity_types.includes('contacts')) {
                        const contacts = await base44.asServiceRole.entities.ClientContact.list('-updated_date');
                        const recentlyUpdated = contacts.filter(c => 
                            new Date(c.updated_date) > new Date(lastSync)
                        );

                        for (const contact of recentlyUpdated) {
                            try {
                                await syncContactToCRM(base44, integration, contact);
                                results.total_synced++;
                            } catch (error) {
                                results.errors.push({ 
                                    contact_id: contact.id, 
                                    error: error.message 
                                });
                            }
                        }
                    }

                    // Sync opportunities
                    if (!entity_types || entity_types.includes('opportunities')) {
                        const opportunities = await base44.asServiceRole.entities.Opportunity.list('-updated_date');
                        const recentlyUpdated = opportunities.filter(o => 
                            new Date(o.updated_date) > new Date(lastSync)
                        );

                        for (const opp of recentlyUpdated) {
                            try {
                                await syncOpportunityToCRM(base44, integration, opp);
                                results.total_synced++;
                            } catch (error) {
                                results.errors.push({ 
                                    opportunity_id: opp.id, 
                                    error: error.message 
                                });
                            }
                        }
                    }
                }

                // Update last sync timestamp
                await base44.asServiceRole.entities.CRMIntegration.update(integration.id, {
                    last_sync: new Date().toISOString()
                });

                results.integrations_processed++;

            } catch (error) {
                results.errors.push({ 
                    integration_id: integration.id, 
                    error: error.message 
                });
            }
        }

        return Response.json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Auto Sync Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

// Helper functions
async function syncContactToCRM(base44, integration, contact) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integration.api_key}`
    };

    const crmPayload = mapContactToCRM(contact, integration.field_mapping);

    const endpoint = contact.external_crm_id 
        ? `${integration.api_url}/contacts/${contact.external_crm_id}`
        : `${integration.api_url}/contacts`;
    
    const method = contact.external_crm_id ? 'PATCH' : 'POST';

    const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(crmPayload)
    });

    if (!response.ok) {
        throw new Error(`CRM API Error: ${response.status}`);
    }

    const result = await response.json();

    // Update contact with CRM ID if newly created
    if (!contact.external_crm_id && result.id) {
        await base44.asServiceRole.entities.ClientContact.update(contact.id, {
            external_crm_id: result.id
        });
    }

    // Log sync
    await base44.asServiceRole.entities.CRMSyncLog.create({
        integration_id: integration.id,
        integration_name: integration.name,
        entity_type: 'contact',
        action: contact.external_crm_id ? 'update' : 'create',
        status: 'success',
        external_id: result.id || contact.external_crm_id
    });

    return result;
}

async function syncOpportunityToCRM(base44, integration, opportunity) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${integration.api_key}`
    };

    const crmPayload = {
        name: opportunity.buyer_name,
        email: opportunity.buyer_email,
        phone: opportunity.buyer_phone,
        status: opportunity.status,
        value: opportunity.estimated_value,
        probability: opportunity.probability,
        close_date: opportunity.expected_close_date,
        source: opportunity.lead_source,
        score: opportunity.qualification_score
    };

    const endpoint = opportunity.external_crm_id 
        ? `${integration.api_url}/opportunities/${opportunity.external_crm_id}`
        : `${integration.api_url}/opportunities`;
    
    const method = opportunity.external_crm_id ? 'PATCH' : 'POST';

    const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(crmPayload)
    });

    if (!response.ok) {
        throw new Error(`CRM API Error: ${response.status}`);
    }

    const result = await response.json();

    if (!opportunity.external_crm_id && result.id) {
        await base44.asServiceRole.entities.Opportunity.update(opportunity.id, {
            external_crm_id: result.id
        });
    }

    await base44.asServiceRole.entities.CRMSyncLog.create({
        integration_id: integration.id,
        integration_name: integration.name,
        entity_type: 'opportunity',
        action: opportunity.external_crm_id ? 'update' : 'create',
        status: 'success',
        external_id: result.id || opportunity.external_crm_id
    });

    return result;
}

function mapContactToCRM(contact, fieldMapping) {
    const mapped = {};
    
    // Apply field mapping
    for (const [appField, crmField] of Object.entries(fieldMapping || {})) {
        if (contact[appField] !== undefined && contact[appField] !== null) {
            mapped[crmField] = contact[appField];
        }
    }

    // Add standard fields if not mapped
    if (!mapped.email) mapped.email = contact.email;
    if (!mapped.name && !mapped.full_name) mapped.name = contact.full_name;
    if (!mapped.phone) mapped.phone = contact.phone;

    return mapped;
}