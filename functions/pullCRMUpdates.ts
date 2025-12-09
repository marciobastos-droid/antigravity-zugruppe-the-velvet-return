import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { integration_id, entity_types, since_date } = await req.json();

        const integrations = await base44.asServiceRole.entities.CRMIntegration.filter({ 
            id: integration_id,
            is_active: true 
        });

        if (integrations.length === 0) {
            return Response.json({ error: 'Integration not found' }, { status: 404 });
        }

        const integration = integrations[0];
        const results = {
            contacts_synced: 0,
            opportunities_synced: 0,
            properties_synced: 0,
            errors: []
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${integration.api_key}`
        };

        // Pull contacts from CRM
        if (!entity_types || entity_types.includes('contacts')) {
            try {
                const url = `${integration.api_url}/contacts${since_date ? `?updated_since=${since_date}` : ''}`;
                const response = await fetch(url, { headers });
                
                if (response.ok) {
                    const crmContacts = await response.json();
                    
                    for (const crmContact of crmContacts.data || crmContacts) {
                        try {
                            const existing = await base44.asServiceRole.entities.ClientContact.filter({ 
                                external_crm_id: crmContact.id 
                            });

                            const contactData = {
                                full_name: crmContact.name || crmContact.full_name,
                                email: crmContact.email,
                                phone: crmContact.phone,
                                company_name: crmContact.company,
                                contact_type: crmContact.type || 'prospect',
                                lead_source: crmContact.source || 'crm',
                                notes: crmContact.notes,
                                external_crm_id: crmContact.id,
                                last_sync_date: new Date().toISOString()
                            };

                            if (existing.length > 0) {
                                await base44.asServiceRole.entities.ClientContact.update(existing[0].id, contactData);
                            } else {
                                await base44.asServiceRole.entities.ClientContact.create(contactData);
                            }
                            
                            results.contacts_synced++;
                        } catch (error) {
                            results.errors.push({ type: 'contact', id: crmContact.id, error: error.message });
                        }
                    }
                }
            } catch (error) {
                results.errors.push({ type: 'contacts_fetch', error: error.message });
            }
        }

        // Pull opportunities from CRM
        if (!entity_types || entity_types.includes('opportunities')) {
            try {
                const url = `${integration.api_url}/opportunities${since_date ? `?updated_since=${since_date}` : ''}`;
                const response = await fetch(url, { headers });
                
                if (response.ok) {
                    const crmOpportunities = await response.json();
                    
                    for (const crmOpp of crmOpportunities.data || crmOpportunities) {
                        try {
                            const existing = await base44.asServiceRole.entities.Opportunity.filter({ 
                                external_crm_id: crmOpp.id 
                            });

                            // Generate ref_id if creating new
                            let refId = existing[0]?.ref_id;
                            if (!refId) {
                                const { data: refData } = await base44.asServiceRole.functions.invoke('generateRefId', { 
                                    entity_type: 'Opportunity' 
                                });
                                refId = refData.ref_id;
                            }

                            const oppData = {
                                ref_id: refId,
                                lead_type: crmOpp.type || 'comprador',
                                buyer_name: crmOpp.contact_name,
                                buyer_email: crmOpp.contact_email,
                                buyer_phone: crmOpp.contact_phone,
                                status: mapCRMStatus(crmOpp.status, integration.crm_type),
                                probability: crmOpp.probability || crmOpp.confidence,
                                estimated_value: crmOpp.value || crmOpp.amount,
                                expected_close_date: crmOpp.close_date,
                                lead_source: crmOpp.source || 'crm',
                                qualification_score: crmOpp.score,
                                external_crm_id: crmOpp.id,
                                last_sync_date: new Date().toISOString()
                            };

                            if (existing.length > 0) {
                                await base44.asServiceRole.entities.Opportunity.update(existing[0].id, oppData);
                            } else {
                                await base44.asServiceRole.entities.Opportunity.create(oppData);
                            }
                            
                            results.opportunities_synced++;
                        } catch (error) {
                            results.errors.push({ type: 'opportunity', id: crmOpp.id, error: error.message });
                        }
                    }
                }
            } catch (error) {
                results.errors.push({ type: 'opportunities_fetch', error: error.message });
            }
        }

        // Update integration last sync
        await base44.asServiceRole.entities.CRMIntegration.update(integration_id, {
            last_sync: new Date().toISOString()
        });

        return Response.json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Pull CRM Updates Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

// Helper to map CRM statuses to app statuses
function mapCRMStatus(crmStatus, crmType) {
    const statusMappings = {
        salesforce: {
            'New': 'new',
            'Working': 'contacted',
            'Qualified': 'qualified',
            'Closed Won': 'won',
            'Closed Lost': 'lost'
        },
        hubspot: {
            'new': 'new',
            'open': 'contacted',
            'in_progress': 'qualified',
            'closed_won': 'won',
            'closed_lost': 'lost'
        }
    };

    return statusMappings[crmType]?.[crmStatus] || crmStatus.toLowerCase();
}