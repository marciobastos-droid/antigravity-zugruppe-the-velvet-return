import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            contact_id,
            contact_email,
            opportunity_id,
            type, // 'email', 'call', 'whatsapp', 'meeting'
            direction, // 'inbound', 'outbound'
            subject,
            summary,
            outcome, // 'successful', 'failed', 'no_answer', 'scheduled_followup'
            duration_minutes,
            attachments,
            metadata
        } = await req.json();

        // Get contact info if not provided
        let contact = null;
        if (contact_id) {
            const contacts = await base44.entities.ClientContact.filter({ id: contact_id });
            contact = contacts[0];
        } else if (contact_email) {
            const contacts = await base44.entities.ClientContact.filter({ email: contact_email });
            contact = contacts[0];
        }

        // Create communication log
        const log = await base44.entities.CommunicationLog.create({
            contact_id: contact?.id || contact_id,
            contact_name: contact?.full_name || '',
            contact_email: contact?.email || contact_email,
            opportunity_id,
            communication_type: type,
            direction,
            subject,
            summary,
            communication_date: new Date().toISOString(),
            agent_email: user.email,
            agent_name: user.full_name,
            outcome,
            duration_minutes,
            attachments,
            metadata
        });

        // Update opportunity last contact date
        if (opportunity_id) {
            await base44.entities.Opportunity.update(opportunity_id, {
                last_contact_date: new Date().toISOString()
            });
        }

        // Update contact last contact date
        if (contact?.id) {
            await base44.entities.ClientContact.update(contact.id, {
                last_contact_date: new Date().toISOString()
            });
        }

        // Create notification for team if important
        if (outcome === 'successful' && (type === 'meeting' || type === 'call')) {
            await base44.asServiceRole.entities.Notification.create({
                title: `📞 Contacto Registado`,
                message: `${user.full_name} contactou ${contact?.full_name || contact_email}`,
                type: 'system',
                priority: 'low',
                broadcast_type: 'team',
                related_entity: 'CommunicationLog',
                related_entity_id: log.id,
                is_read: false
            });
        }

        return Response.json({
            success: true,
            log
        });

    } catch (error) {
        console.error('Log Communication Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});