import { base44 } from "@/api/base44Client";

// Notification types configuration
export const NOTIFICATION_TYPES = {
  lead: {
    icon: "👤",
    label: "Novo Lead",
    color: "blue",
    preference: "new_leads"
  },
  opportunity: {
    icon: "💼",
    label: "Oportunidade",
    color: "amber",
    preference: "opportunity_expiring"
  },
  appointment: {
    icon: "📅",
    label: "Agendamento",
    color: "green",
    preference: "appointments"
  },
  matching: {
    icon: "🎯",
    label: "Match",
    color: "purple",
    preference: "property_matches"
  },
  ai_tool: {
    icon: "🤖",
    label: "IA",
    color: "indigo",
    preference: "ai_tools"
  },
  contract: {
    icon: "📄",
    label: "Contrato",
    color: "slate",
    preference: "follow_up_reminders"
  },
  system: {
    icon: "ℹ️",
    label: "Sistema",
    color: "slate",
    preference: null
  }
};

/**
 * Create a notification for a user
 */
export async function createNotification({
  userEmail,
  title,
  message,
  type = "system",
  priority = "medium",
  relatedId = null,
  relatedType = null,
  actionUrl = null,
  metadata = {}
}) {
  try {
    const notification = await base44.entities.Notification.create({
      user_email: userEmail,
      title,
      message,
      type,
      priority,
      related_id: relatedId,
      related_type: relatedType,
      action_url: actionUrl,
      is_read: false,
      push_sent: false,
      metadata
    });

    // Try to send push notification
    try {
      await base44.functions.invoke('sendPushNotification', {
        user_email: userEmail,
        notification_id: notification.id,
        title,
        message,
        type,
        action_url: actionUrl
      });
    } catch (pushError) {
      console.log("Push notification not sent:", pushError);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Create notification for new lead assigned
 */
export async function notifyNewLeadAssigned(agentEmail, lead) {
  return createNotification({
    userEmail: agentEmail,
    title: "Novo Lead Atribuído",
    message: `${lead.buyer_name} foi atribuído a si. Origem: ${lead.lead_source || 'Direto'}`,
    type: "lead",
    priority: lead.priority === 'high' ? 'high' : 'medium',
    relatedId: lead.id,
    relatedType: "Opportunity",
    actionUrl: `/CRMAdvanced?tab=opportunities`,
    metadata: { lead_name: lead.buyer_name, lead_source: lead.lead_source }
  });
}

/**
 * Create notification for opportunity expiring soon
 */
export async function notifyOpportunityExpiring(agentEmail, opportunity, daysLeft) {
  return createNotification({
    userEmail: agentEmail,
    title: "Oportunidade em Risco",
    message: `${opportunity.buyer_name} - Follow-up em ${daysLeft} dia(s). Não perca esta oportunidade!`,
    type: "opportunity",
    priority: daysLeft <= 1 ? 'urgent' : 'high',
    relatedId: opportunity.id,
    relatedType: "Opportunity",
    actionUrl: `/CRMAdvanced?tab=opportunities`,
    metadata: { days_left: daysLeft, opportunity_status: opportunity.status }
  });
}

/**
 * Create notification for appointment confirmed
 */
export async function notifyAppointmentConfirmed(agentEmail, appointment) {
  const date = new Date(appointment.appointment_date);
  const formattedDate = date.toLocaleDateString('pt-PT', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  return createNotification({
    userEmail: agentEmail,
    title: "Reunião Confirmada",
    message: `${appointment.title} - ${formattedDate}. Cliente: ${appointment.client_name || 'N/A'}`,
    type: "appointment",
    priority: "medium",
    relatedId: appointment.id,
    relatedType: "Appointment",
    actionUrl: `/CRMAdvanced?tab=appointments`,
    metadata: { 
      appointment_date: appointment.appointment_date,
      client_name: appointment.client_name,
      property_title: appointment.property_title
    }
  });
}

/**
 * Create notification for property match found
 */
export async function notifyPropertyMatch(agentEmail, client, property, matchScore) {
  return createNotification({
    userEmail: agentEmail,
    title: "Match de Propriedade",
    message: `${property.title} corresponde ${matchScore}% aos requisitos de ${client.full_name}`,
    type: "matching",
    priority: matchScore >= 80 ? 'high' : 'medium',
    relatedId: property.id,
    relatedType: "Property",
    actionUrl: `/PropertyDetails?id=${property.id}`,
    metadata: { 
      client_name: client.full_name,
      property_title: property.title,
      match_score: matchScore
    }
  });
}

/**
 * Create notification for AI tool completion
 */
export async function notifyAIToolComplete(userEmail, toolName, result, relatedId = null, relatedType = null) {
  return createNotification({
    userEmail: userEmail,
    title: `${toolName} Concluído`,
    message: result.message || `A ferramenta de IA "${toolName}" terminou o processamento.`,
    type: "ai_tool",
    priority: "low",
    relatedId,
    relatedType,
    actionUrl: result.actionUrl || null,
    metadata: { tool_name: toolName, ...result.metadata }
  });
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userEmail) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log("Push notifications not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key from backend or use a default
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    // Save subscription to database
    const subscriptionJSON = subscription.toJSON();
    
    // Check if subscription already exists
    const existing = await base44.entities.PushSubscription.filter({ 
      user_email: userEmail,
      endpoint: subscriptionJSON.endpoint 
    });

    if (existing.length === 0) {
      await base44.entities.PushSubscription.create({
        user_email: userEmail,
        endpoint: subscriptionJSON.endpoint,
        keys: subscriptionJSON.keys,
        is_active: true,
        device_info: navigator.userAgent,
        notification_preferences: {
          new_leads: true,
          opportunity_expiring: true,
          appointments: true,
          property_matches: true,
          ai_tools: true,
          follow_up_reminders: true
        }
      });
    }

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userEmail) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Deactivate in database
      const existing = await base44.entities.PushSubscription.filter({ 
        user_email: userEmail,
        endpoint: subscription.endpoint 
      });
      
      if (existing.length > 0) {
        await base44.entities.PushSubscription.update(existing[0].id, { is_active: false });
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return false;
  }
}

/**
 * Check if push is supported and subscribed
 */
export async function checkPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, subscribed: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { 
      supported: true, 
      subscribed: !!subscription,
      permission: Notification.permission
    };
  } catch {
    return { supported: true, subscribed: false, permission: 'default' };
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}