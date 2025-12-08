import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, data } = await req.json();

        switch (action) {
            case 'sync_from_external':
                return await syncFromExternal(base44, data);
            case 'sync_to_external':
                return await syncToExternal(base44, data);
            case 'bidirectional_sync':
                return await bidirectionalSync(base44, data);
            case 'auto_link_properties':
                return await autoLinkProperties(base44, data);
            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

    } catch (error) {
        console.error('CRM Sync Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

// Sync contacts and leads FROM external CRM TO Base44
async function syncFromExternal(base44, { external_contacts, external_leads }) {
    const results = { contacts: [], opportunities: [], errors: [] };

    // Import contacts
    if (external_contacts && external_contacts.length > 0) {
        for (const contact of external_contacts) {
            try {
                // Check if contact already exists by email
                const existing = await base44.asServiceRole.entities.ClientContact.filter({ 
                    email: contact.email 
                });

                if (existing.length > 0) {
                    // Update existing contact
                    await base44.asServiceRole.entities.ClientContact.update(existing[0].id, {
                        full_name: contact.name || contact.full_name,
                        phone: contact.phone,
                        company_name: contact.company,
                        notes: contact.notes,
                        external_crm_id: contact.external_id,
                        last_sync_date: new Date().toISOString()
                    });
                    results.contacts.push({ action: 'updated', id: existing[0].id });
                } else {
                    // Create new contact
                    const created = await base44.asServiceRole.entities.ClientContact.create({
                        full_name: contact.name || contact.full_name,
                        email: contact.email,
                        phone: contact.phone,
                        contact_type: contact.type || 'prospect',
                        company_name: contact.company,
                        notes: contact.notes,
                        lead_source: 'crm_import',
                        external_crm_id: contact.external_id,
                        last_sync_date: new Date().toISOString()
                    });
                    results.contacts.push({ action: 'created', id: created.id });
                }
            } catch (error) {
                results.errors.push({ contact: contact.email, error: error.message });
            }
        }
    }

    // Import leads/opportunities
    if (external_leads && external_leads.length > 0) {
        for (const lead of external_leads) {
            try {
                const existing = await base44.asServiceRole.entities.Opportunity.filter({ 
                    buyer_email: lead.email 
                });

                if (existing.length === 0) {
                    const { data: refData } = await base44.asServiceRole.functions.invoke('generateRefId', { 
                        entity_type: 'Opportunity' 
                    });

                    const created = await base44.asServiceRole.entities.Opportunity.create({
                        ref_id: refData.ref_id,
                        lead_type: lead.type || 'comprador',
                        buyer_name: lead.name,
                        buyer_email: lead.email,
                        buyer_phone: lead.phone,
                        status: lead.status || 'new',
                        lead_source: 'crm_import',
                        budget: lead.budget,
                        message: lead.notes,
                        external_crm_id: lead.external_id,
                        last_sync_date: new Date().toISOString()
                    });
                    results.opportunities.push({ action: 'created', id: created.id });
                }
            } catch (error) {
                results.errors.push({ lead: lead.email, error: error.message });
            }
        }
    }

    return Response.json({
        success: true,
        results
    });
}

// Sync TO external CRM FROM Base44
async function syncToExternal(base44, { crm_type, entity_type, entity_ids }) {
    // This would integrate with specific CRMs (Salesforce, HubSpot, etc.)
    // For now, return formatted data ready for export
    
    const results = [];

    if (entity_type === 'contacts') {
        const contacts = await base44.asServiceRole.entities.ClientContact.list();
        const filtered = entity_ids ? contacts.filter(c => entity_ids.includes(c.id)) : contacts;
        
        results.push(...filtered.map(c => ({
            external_id: c.external_crm_id,
            name: c.full_name,
            email: c.email,
            phone: c.phone,
            company: c.company_name,
            type: c.contact_type,
            source: c.lead_source,
            notes: c.notes
        })));
    }

    if (entity_type === 'opportunities') {
        const opportunities = await base44.asServiceRole.entities.Opportunity.list();
        const filtered = entity_ids ? opportunities.filter(o => entity_ids.includes(o.id)) : opportunities;
        
        results.push(...filtered.map(o => ({
            external_id: o.external_crm_id,
            ref_id: o.ref_id,
            name: o.buyer_name,
            email: o.buyer_email,
            phone: o.buyer_phone,
            status: o.status,
            value: o.estimated_value,
            probability: o.probability,
            close_date: o.expected_close_date,
            source: o.lead_source
        })));
    }

    return Response.json({
        success: true,
        crm_type,
        entities: results,
        count: results.length
    });
}

// Bidirectional sync
async function bidirectionalSync(base44, { external_data }) {
    const fromExternal = await syncFromExternal(base44, external_data);
    
    return Response.json({
        success: true,
        sync_from_external: fromExternal,
        timestamp: new Date().toISOString()
    });
}

// Auto-link properties to opportunities based on criteria
async function autoLinkProperties(base44, { opportunity_id }) {
    const opportunities = await base44.asServiceRole.entities.Opportunity.filter({ id: opportunity_id });
    if (opportunities.length === 0) {
        return Response.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const opportunity = opportunities[0];
    const properties = await base44.asServiceRole.entities.Property.list();

    // Match logic
    const matches = properties.filter(p => {
        if (p.status !== 'active') return false;
        
        // Match location
        const locationMatch = p.city === opportunity.location || p.state === opportunity.location;
        if (!locationMatch && opportunity.location) return false;

        // Match budget
        if (opportunity.budget) {
            const budgetMatch = p.price <= opportunity.budget * 1.15; // 15% tolerance
            if (!budgetMatch) return false;
        }

        // Match property type
        if (opportunity.property_type_interest) {
            const typeMatch = p.property_type === opportunity.property_type_interest;
            if (!typeMatch) return false;
        }

        return true;
    });

    // Add top 10 matches to opportunity
    const topMatches = matches.slice(0, 10).map(p => ({
        property_id: p.id,
        property_title: p.title,
        added_date: new Date().toISOString(),
        status: 'interested'
    }));

    await base44.asServiceRole.entities.Opportunity.update(opportunity_id, {
        associated_properties: topMatches
    });

    return Response.json({
        success: true,
        matches_found: matches.length,
        properties_linked: topMatches.length
    });
}