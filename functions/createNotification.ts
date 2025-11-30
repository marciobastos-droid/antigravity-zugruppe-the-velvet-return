import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      user_email, 
      title, 
      message, 
      type = 'system',
      priority = 'medium',
      related_id,
      related_type,
      action_url,
      metadata = {},
      send_push = true
    } = await req.json();

    if (!user_email || !title || !message) {
      return Response.json({ 
        error: 'Missing required fields: user_email, title, message' 
      }, { status: 400 });
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      title,
      message,
      type,
      priority,
      related_id: related_id || null,
      related_type: related_type || null,
      action_url: action_url || null,
      is_read: false,
      push_sent: false,
      metadata
    });

    // Send push notification if enabled
    if (send_push) {
      try {
        const pushResult = await base44.asServiceRole.functions.invoke('sendPushNotification', {
          user_email,
          notification_id: notification.id,
          title,
          message,
          type,
          action_url
        });
        
        if (pushResult.data?.sent_to > 0) {
          await base44.asServiceRole.entities.Notification.update(notification.id, {
            push_sent: true
          });
        }
      } catch (pushError) {
        console.error('Push notification failed:', pushError);
        // Continue even if push fails
      }
    }

    return Response.json({
      success: true,
      notification_id: notification.id,
      notification
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});