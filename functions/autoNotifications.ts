import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { 
            type, // 'new_lead', 'property_status_change', 'property_sold', 'low_quality_score'
            entity_id,
            entity_data,
            target_users // optional: specific users to notify
        } = await req.json();

        let notification = null;

        switch (type) {
            case 'new_lead':
                notification = await createNewLeadNotification(base44, entity_id, entity_data, target_users);
                break;
            case 'property_status_change':
                notification = await createPropertyStatusNotification(base44, entity_id, entity_data, target_users);
                break;
            case 'property_sold':
                notification = await createPropertySoldNotification(base44, entity_id, entity_data, target_users);
                break;
            case 'low_quality_score':
                notification = await createLowQualityNotification(base44, entity_id, entity_data, target_users);
                break;
            default:
                return Response.json({ error: 'Invalid notification type' }, { status: 400 });
        }

        return Response.json({
            success: true,
            notification
        });

    } catch (error) {
        console.error('Auto Notifications Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function createNewLeadNotification(base44, leadId, leadData, targetUsers) {
    const lead = leadData || (await base44.asServiceRole.entities.Opportunity.filter({ id: leadId }))[0];
    
    if (!lead) return null;

    const notification = await base44.asServiceRole.entities.Notification.create({
        title: '🎯 Novo Lead',
        message: `${lead.buyer_name || 'Lead'} - ${lead.lead_type === 'comprador' ? 'Comprador' : 'Vendedor'}${lead.location ? ` em ${lead.location}` : ''}`,
        type: 'lead',
        priority: 'high',
        broadcast_type: targetUsers ? 'individual' : 'team',
        user_email: targetUsers?.[0],
        assigned_to: lead.assigned_to,
        related_entity: 'Opportunity',
        related_entity_id: leadId,
        action_url: `/crm?tab=opportunities&id=${leadId}`,
        is_read: false
    });

    // If multiple target users, create for each
    if (targetUsers && targetUsers.length > 1) {
        for (let i = 1; i < targetUsers.length; i++) {
            await base44.asServiceRole.entities.Notification.create({
                ...notification,
                id: undefined,
                user_email: targetUsers[i]
            });
        }
    }

    return notification;
}

async function createPropertyStatusNotification(base44, propertyId, propertyData, targetUsers) {
    const property = propertyData || (await base44.asServiceRole.entities.Property.filter({ id: propertyId }))[0];
    
    if (!property) return null;

    const statusLabels = {
        available: 'Disponível',
        sold: 'Vendido',
        reserved: 'Reservado',
        rented: 'Arrendado',
        prospecting: 'Em Prospecção',
        withdrawn: 'Retirado'
    };

    return await base44.asServiceRole.entities.Notification.create({
        title: '🏠 Mudança de Estado',
        message: `${property.title || property.ref_id} - ${statusLabels[property.availability_status] || property.availability_status}`,
        type: 'system',
        priority: property.availability_status === 'sold' ? 'high' : 'medium',
        broadcast_type: targetUsers ? 'individual' : 'team',
        user_email: targetUsers?.[0],
        related_entity: 'Property',
        related_entity_id: propertyId,
        action_url: `/property-details?id=${propertyId}`,
        is_read: false
    });
}

async function createPropertySoldNotification(base44, propertyId, propertyData, targetUsers) {
    const property = propertyData || (await base44.asServiceRole.entities.Property.filter({ id: propertyId }))[0];
    
    if (!property) return null;

    return await base44.asServiceRole.entities.Notification.create({
        title: '🎉 Imóvel Vendido!',
        message: `${property.title || property.ref_id} - €${property.price?.toLocaleString()}`,
        type: 'opportunity',
        priority: 'urgent',
        broadcast_type: 'all_users',
        related_entity: 'Property',
        related_entity_id: propertyId,
        action_url: `/property-details?id=${propertyId}`,
        is_read: false
    });
}

async function createLowQualityNotification(base44, propertyId, propertyData, targetUsers) {
    const property = propertyData || (await base44.asServiceRole.entities.Property.filter({ id: propertyId }))[0];
    
    if (!property || property.quality_score >= 60) return null;

    return await base44.asServiceRole.entities.Notification.create({
        title: '⚠️ Pontuação Baixa',
        message: `${property.title || property.ref_id} - Score: ${property.quality_score}/100. Melhore o preenchimento!`,
        type: 'system',
        priority: 'medium',
        broadcast_type: targetUsers ? 'individual' : 'team',
        user_email: targetUsers?.[0] || property.created_by,
        related_entity: 'Property',
        related_entity_id: propertyId,
        action_url: `/property-details?id=${propertyId}`,
        is_read: false
    });
}