import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const CUSTOM_DOMAIN = 'https://zuhaus.pt';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      lead,
      source = 'manual',
      notify_admins = true,
      notify_assigned = true,
      send_email = false
    } = await req.json();

    if (!lead) {
      return Response.json({ error: 'Lead data is required' }, { status: 400 });
    }

    const notifications_created = [];
    const sourceLabels = {
      manual: 'Upload Manual',
      website: 'Website',
      facebook_ads: 'Facebook Ads',
      whatsapp: 'WhatsApp',
      email: 'Email',
      referral: 'Indicação',
      import: 'Importação',
      api: 'API Externa'
    };

    const leadName = lead.buyer_name || lead.full_name || 'Novo Lead';
    const leadSource = sourceLabels[source] || source;
    const actionUrl = '/CRMAdvanced?tab=opportunities';

    // Build notification message
    let message = `${leadName}`;
    if (lead.buyer_email) message += ` (${lead.buyer_email})`;
    if (lead.location) message += ` - ${lead.location}`;
    if (lead.budget) message += ` | Orçamento: €${typeof lead.budget === 'number' ? lead.budget.toLocaleString() : lead.budget}`;
    message += ` | Origem: ${leadSource}`;

    const notificationData = {
      title: `Novo Lead Recebido: ${leadName}`,
      message,
      type: 'lead',
      priority: lead.priority || 'medium',
      related_id: lead.id,
      related_type: 'Opportunity',
      action_url: actionUrl,
      metadata: {
        lead_source: source,
        lead_email: lead.buyer_email,
        lead_phone: lead.buyer_phone,
        property_id: lead.property_id
      },
      send_email
    };

    // Notify assigned agent if exists
    if (notify_assigned && lead.assigned_to) {
      try {
        const result = await base44.asServiceRole.functions.invoke('createNotification', {
          user_email: lead.assigned_to,
          ...notificationData
        });
        if (result.data?.success) {
          notifications_created.push({ user: lead.assigned_to, type: 'assigned' });
        }
      } catch (err) {
        console.error('Failed to notify assigned agent:', err);
      }
    }

    // Notify admins and gestores
    if (notify_admins) {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const admins = users.filter(u => 
          u.role === 'admin' || 
          u.user_type === 'admin' || 
          u.user_type === 'gestor'
        );

        for (const admin of admins) {
          // Skip if already notified as assigned
          if (admin.email === lead.assigned_to) continue;
          
          try {
            const result = await base44.asServiceRole.functions.invoke('createNotification', {
              user_email: admin.email,
              ...notificationData,
              send_email: send_email // Only send email if explicitly requested
            });
            if (result.data?.success) {
              notifications_created.push({ user: admin.email, type: 'admin' });
            }
          } catch (err) {
            console.error(`Failed to notify admin ${admin.email}:`, err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch admins:', err);
      }
    }

    return Response.json({
      success: true,
      notifications_created: notifications_created.length,
      details: notifications_created
    });

  } catch (error) {
    console.error('Error in notifyNewLead:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});