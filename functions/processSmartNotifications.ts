import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_email } = await req.json();
    const targetEmail = agent_email || user.email;

    // Fetch all necessary data in parallel
    const [
      opportunities,
      contacts,
      properties,
      tasks,
      communications,
      userPermissions
    ] = await Promise.all([
      base44.asServiceRole.entities.Opportunity.filter({ assigned_to: targetEmail }),
      base44.asServiceRole.entities.ClientContact.filter({ assigned_agent: targetEmail }),
      base44.asServiceRole.entities.Property.list('-created_date', 50),
      base44.asServiceRole.entities.Task.filter({ assigned_to: targetEmail }),
      base44.asServiceRole.entities.CommunicationLog.filter({ agent_email: targetEmail }, '-communication_date', 20),
      base44.asServiceRole.entities.UserPermission.filter({ user_email: targetEmail })
    ]);

    const toolPermissions = userPermissions[0]?.permissions?.tools || {};
    const notifications = [];
    const now = new Date();

    // 1. High Priority Leads requiring immediate attention
    const hotLeads = opportunities.filter(o => 
      o.qualification_status === 'hot' && 
      o.status !== 'won' && 
      o.status !== 'lost'
    );
    
    for (const lead of hotLeads.slice(0, 3)) {
      const daysSinceContact = lead.last_contact_date 
        ? Math.floor((now - new Date(lead.last_contact_date)) / (1000 * 60 * 60 * 24))
        : 999;
      
      if (daysSinceContact > 2) {
        notifications.push({
          type: 'urgent_lead',
          priority: 'urgent',
          title: 'Lead quente sem contacto',
          message: `${lead.buyer_name} não é contactado há ${daysSinceContact} dias`,
          action_url: `/CRMAdvanced?tab=opportunities&id=${lead.id}`,
          related_id: lead.id,
          related_type: 'Opportunity',
          suggested_tool: toolPermissions.whatsapp ? 'whatsapp' : (toolPermissions.emailHub ? 'emailHub' : null)
        });
      }
    }

    // 2. Property Matching - New properties matching client requirements
    const recentProperties = properties.filter(p => {
      const createdDate = new Date(p.created_date);
      const daysSinceCreated = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      return daysSinceCreated <= 7 && p.status === 'active';
    });

    for (const contact of contacts.filter(c => c.property_requirements)) {
      const req = contact.property_requirements;
      if (!req) continue;

      const matches = recentProperties.filter(prop => {
        let score = 0;
        if (req.locations?.length > 0 && req.locations.some(loc => 
          prop.city?.toLowerCase().includes(loc.toLowerCase()))) score += 30;
        if (req.budget_max && prop.price <= req.budget_max * 1.1) score += 25;
        if (req.budget_min && prop.price >= req.budget_min * 0.9) score += 15;
        if (req.bedrooms_min && prop.bedrooms >= req.bedrooms_min) score += 20;
        if (req.property_types?.includes(prop.property_type)) score += 10;
        return score >= 50;
      });

      if (matches.length > 0 && toolPermissions.aiMatching !== false) {
        notifications.push({
          type: 'property_match',
          priority: 'high',
          title: 'Novo imóvel compatível',
          message: `${matches.length} novo(s) imóvel(is) para ${contact.full_name}`,
          action_url: `/CRMAdvanced?tab=matching`,
          related_id: contact.id,
          related_type: 'ClientContact',
          suggested_tool: 'aiMatching',
          metadata: { matches: matches.slice(0, 3).map(m => m.id) }
        });
      }
    }

    // 3. Tasks due soon
    const urgentTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
      return hoursUntilDue > 0 && hoursUntilDue <= 24;
    });

    for (const task of urgentTasks.slice(0, 3)) {
      notifications.push({
        type: 'task_due',
        priority: 'high',
        title: 'Tarefa a vencer',
        message: `"${task.title}" vence em menos de 24h`,
        action_url: `/TeamManagement?tab=tasks`,
        related_id: task.id,
        related_type: 'Task',
        suggested_tool: toolPermissions.calendar ? 'calendar' : null
      });
    }

    // 4. Follow-up reminders
    const needsFollowup = opportunities.filter(o => {
      if (!o.next_followup_date || o.status === 'won' || o.status === 'lost') return false;
      const followupDate = new Date(o.next_followup_date);
      return followupDate <= now;
    });

    for (const opp of needsFollowup.slice(0, 3)) {
      notifications.push({
        type: 'followup_due',
        priority: 'medium',
        title: 'Follow-up pendente',
        message: `${opp.buyer_name} aguarda follow-up`,
        action_url: `/CRMAdvanced?tab=opportunities&id=${opp.id}`,
        related_id: opp.id,
        related_type: 'Opportunity',
        suggested_tool: toolPermissions.whatsapp ? 'whatsapp' : 'emailHub'
      });
    }

    // 5. Stale opportunities (no contact in 7+ days)
    const staleOpps = opportunities.filter(o => {
      if (o.status === 'won' || o.status === 'lost') return false;
      if (!o.last_contact_date) return true;
      const daysSince = Math.floor((now - new Date(o.last_contact_date)) / (1000 * 60 * 60 * 24));
      return daysSince >= 7;
    });

    if (staleOpps.length > 0) {
      notifications.push({
        type: 'stale_opportunities',
        priority: 'medium',
        title: 'Oportunidades sem atividade',
        message: `${staleOpps.length} oportunidade(s) sem contacto há 7+ dias`,
        action_url: `/CRMAdvanced?tab=opportunities`,
        suggested_tool: toolPermissions.leadManagement ? 'leadManagement' : null,
        metadata: { count: staleOpps.length }
      });
    }

    // 6. Suggest tools based on activity patterns
    const recentCommTypes = communications.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {});

    if (recentCommTypes.whatsapp > 5 && toolPermissions.whatsapp) {
      // User is active on WhatsApp, suggest automation
      const pendingResponses = communications.filter(c => 
        c.type === 'whatsapp' && c.direction === 'inbound' && !c.response_sent
      );
      if (pendingResponses.length > 0) {
        notifications.push({
          type: 'tool_suggestion',
          priority: 'low',
          title: 'Mensagens WhatsApp pendentes',
          message: `${pendingResponses.length} mensagem(ns) aguardam resposta`,
          action_url: `/Tools?tab=whatsapp`,
          suggested_tool: 'whatsapp'
        });
      }
    }

    // 7. New high-value properties for investors
    const investorContacts = contacts.filter(c => c.contact_type === 'investor');
    if (investorContacts.length > 0) {
      const highValueProps = recentProperties.filter(p => p.price > 500000);
      if (highValueProps.length > 0) {
        notifications.push({
          type: 'investor_opportunity',
          priority: 'medium',
          title: 'Oportunidade para investidores',
          message: `${highValueProps.length} imóvel(is) premium disponível(is)`,
          action_url: `/Tools?tab=aiMatching`,
          suggested_tool: 'aiMatching',
          metadata: { properties: highValueProps.slice(0, 3).map(p => p.id) }
        });
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    notifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Create actual notifications for urgent/high priority items
    for (const notif of notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').slice(0, 5)) {
      try {
        // Check if similar notification already exists today
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          user_email: targetEmail,
          type: notif.type === 'urgent_lead' ? 'lead' : 
                notif.type === 'property_match' ? 'matching' : 
                notif.type === 'task_due' ? 'system' : 'opportunity',
          related_id: notif.related_id
        });

        const todayNotifs = existingNotifs.filter(n => {
          const created = new Date(n.created_date);
          return created.toDateString() === now.toDateString();
        });

        if (todayNotifs.length === 0) {
          await base44.asServiceRole.entities.Notification.create({
            user_email: targetEmail,
            title: notif.title,
            message: notif.message,
            type: notif.type === 'urgent_lead' ? 'lead' : 
                  notif.type === 'property_match' ? 'matching' : 
                  notif.type === 'task_due' ? 'system' : 'opportunity',
            priority: notif.priority,
            related_id: notif.related_id,
            related_type: notif.related_type,
            action_url: notif.action_url,
            is_read: false,
            metadata: { suggested_tool: notif.suggested_tool, ...notif.metadata }
          });
        }
      } catch (e) {
        console.error('Error creating notification:', e);
      }
    }

    return Response.json({
      success: true,
      notifications: notifications.slice(0, 10),
      summary: {
        total: notifications.length,
        urgent: notifications.filter(n => n.priority === 'urgent').length,
        high: notifications.filter(n => n.priority === 'high').length
      }
    });

  } catch (error) {
    console.error('Smart notifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});