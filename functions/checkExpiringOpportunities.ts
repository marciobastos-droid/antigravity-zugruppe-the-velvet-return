import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called by a scheduled job or manually triggered
    // It checks for opportunities that need follow-up and sends notifications
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Get all open opportunities
    const opportunities = await base44.asServiceRole.entities.Opportunity.filter({
      status: { $in: ['new', 'contacted', 'qualified', 'proposal', 'negotiation'] }
    });

    const notifications = [];

    for (const opp of opportunities) {
      // Check if next_followup_date is approaching
      if (opp.next_followup_date && opp.assigned_to) {
        const followupDate = new Date(opp.next_followup_date);
        const daysUntilFollowup = Math.ceil((followupDate - now) / (1000 * 60 * 60 * 24));

        // Notify if follow-up is within 3 days and hasn't been notified recently
        if (daysUntilFollowup <= 3 && daysUntilFollowup >= 0) {
          // Check if we already sent a notification for this today
          const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
            user_email: opp.assigned_to,
            type: 'opportunity',
            related_id: opp.id,
          });

          const today = new Date().toISOString().split('T')[0];
          const alreadyNotifiedToday = existingNotifs.some(n => 
            n.created_date?.startsWith(today)
          );

          if (!alreadyNotifiedToday) {
            const priority = daysUntilFollowup <= 1 ? 'urgent' : 'high';
            
            const notification = await base44.asServiceRole.entities.Notification.create({
              user_email: opp.assigned_to,
              title: daysUntilFollowup === 0 ? '⚠️ Follow-up Hoje!' : `Follow-up em ${daysUntilFollowup} dia(s)`,
              message: `${opp.buyer_name} precisa de acompanhamento. Status: ${opp.status}`,
              type: 'opportunity',
              priority,
              related_id: opp.id,
              related_type: 'Opportunity',
              action_url: '/CRMAdvanced?tab=opportunities',
              is_read: false,
              push_sent: false,
              metadata: {
                days_until_followup: daysUntilFollowup,
                opportunity_status: opp.status,
                buyer_name: opp.buyer_name
              }
            });

            notifications.push(notification);

            // Send push notification
            try {
              await base44.asServiceRole.functions.invoke('sendPushNotification', {
                user_email: opp.assigned_to,
                notification_id: notification.id,
                title: notification.title,
                message: notification.message,
                type: 'opportunity',
                action_url: '/CRMAdvanced?tab=opportunities'
              });
            } catch (e) {
              // Push failed, but notification was created
            }
          }
        }
      }

      // Check for stale opportunities (no contact in 7+ days)
      if (opp.last_contact_date && opp.assigned_to) {
        const lastContact = new Date(opp.last_contact_date);
        const daysSinceContact = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));

        if (daysSinceContact >= 7 && daysSinceContact % 7 === 0) { // Notify weekly
          const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
            user_email: opp.assigned_to,
            type: 'opportunity',
            related_id: opp.id,
          });

          const today = new Date().toISOString().split('T')[0];
          const alreadyNotifiedToday = existingNotifs.some(n => 
            n.created_date?.startsWith(today) && n.metadata?.stale_warning
          );

          if (!alreadyNotifiedToday) {
            const notification = await base44.asServiceRole.entities.Notification.create({
              user_email: opp.assigned_to,
              title: '📭 Lead sem contacto há ' + daysSinceContact + ' dias',
              message: `${opp.buyer_name} não tem contacto registado há ${daysSinceContact} dias. Considere fazer follow-up.`,
              type: 'opportunity',
              priority: 'medium',
              related_id: opp.id,
              related_type: 'Opportunity',
              action_url: '/CRMAdvanced?tab=opportunities',
              is_read: false,
              push_sent: false,
              metadata: {
                days_since_contact: daysSinceContact,
                stale_warning: true
              }
            });

            notifications.push(notification);
          }
        }
      }
    }

    return Response.json({
      success: true,
      checked_opportunities: opportunities.length,
      notifications_created: notifications.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});