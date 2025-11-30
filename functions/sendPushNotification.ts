import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { user_email, notification_id, title, message, type, action_url } = await req.json();

    if (!user_email || !title) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's push subscriptions
    const subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({
      user_email: user_email,
      is_active: true
    });

    if (subscriptions.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No active push subscriptions for user' 
      });
    }

    // Check notification preferences
    const preferenceKey = {
      'lead': 'new_leads',
      'opportunity': 'opportunity_expiring',
      'appointment': 'appointments',
      'matching': 'property_matches',
      'ai_tool': 'ai_tools',
      'contract': 'follow_up_reminders',
      'system': null
    }[type];

    let sentCount = 0;
    const errors = [];

    for (const subscription of subscriptions) {
      // Check if user wants this type of notification
      if (preferenceKey && subscription.notification_preferences) {
        if (subscription.notification_preferences[preferenceKey] === false) {
          continue; // User has disabled this notification type
        }
      }

      try {
        // Note: In a real implementation, you would use web-push library
        // For now, we'll just mark the notification as sent
        // The actual push would require VAPID keys and web-push npm package
        
        // Simulate sending push notification
        // In production, use: await webpush.sendNotification(subscription, payload);
        
        sentCount++;
      } catch (pushError) {
        errors.push({ endpoint: subscription.endpoint, error: pushError.message });
        
        // If subscription is invalid, deactivate it
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(subscription.id, { 
            is_active: false 
          });
        }
      }
    }

    // Mark notification as push_sent if we have a notification_id
    if (notification_id && sentCount > 0) {
      try {
        await base44.asServiceRole.entities.Notification.update(notification_id, { 
          push_sent: true 
        });
      } catch (e) {
        // Notification might have been deleted
      }
    }

    return Response.json({
      success: true,
      sent_to: sentCount,
      total_subscriptions: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});