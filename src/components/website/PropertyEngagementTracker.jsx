import React from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook para rastrear engagement de propriedades no website
 * Envia dados de interação para o CRM automaticamente
 */
export function usePropertyEngagement(propertyId, propertyTitle) {
  const startTime = React.useRef(Date.now());
  const [tracked, setTracked] = React.useState({
    view: false,
    timeSpent: false
  });

  // Track view on mount
  React.useEffect(() => {
    if (!propertyId || tracked.view) return;

    const trackView = async () => {
      try {
        // Create property interaction record
        await base44.entities.PropertyInteraction.create({
          property_id: propertyId,
          interaction_type: 'viewed',
          time_spent_seconds: 0,
          property_features: {
            title: propertyTitle
          }
        });

        // Try to sync to CRM (non-blocking)
        syncEngagementToCRM(propertyId, { views: 1 }).catch(e => 
          console.warn('Failed to sync view to CRM:', e)
        );

        setTracked(prev => ({ ...prev, view: true }));
      } catch (error) {
        console.warn('Failed to track view:', error);
      }
    };

    trackView();
  }, [propertyId, tracked.view, propertyTitle]);

  // Track time spent on page
  React.useEffect(() => {
    if (!propertyId) return;

    const trackTimeSpent = async () => {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      
      // Only track if spent more than 10 seconds
      if (timeSpent > 10 && !tracked.timeSpent) {
        try {
          // Update interaction with time spent
          const interactions = await base44.entities.PropertyInteraction.filter({ 
            property_id: propertyId 
          });
          
          if (interactions.length > 0) {
            const latest = interactions[interactions.length - 1];
            await base44.entities.PropertyInteraction.update(latest.id, {
              time_spent_seconds: timeSpent
            });
          }

          setTracked(prev => ({ ...prev, timeSpent: true }));
        } catch (error) {
          console.warn('Failed to update time spent:', error);
        }
      }
    };

    // Track on unmount or after 30 seconds
    const timer = setTimeout(trackTimeSpent, 30000);
    
    return () => {
      clearTimeout(timer);
      trackTimeSpent();
    };
  }, [propertyId, tracked.timeSpent]);

  // Track specific actions
  const trackAction = React.useCallback(async (action, metadata = {}) => {
    if (!propertyId) return;

    try {
      await base44.entities.PropertyInteraction.create({
        property_id: propertyId,
        interaction_type: action,
        property_features: metadata
      });

      // Sync to CRM
      const engagementUpdate = {};
      if (action === 'shortlisted') engagementUpdate.saves = 1;
      if (action === 'contacted') engagementUpdate.inquiries = 1;
      if (action === 'contacted') engagementUpdate.hot_leads = 1;

      if (Object.keys(engagementUpdate).length > 0) {
        syncEngagementToCRM(propertyId, engagementUpdate).catch(e => 
          console.warn('Failed to sync action to CRM:', e)
        );
      }
    } catch (error) {
      console.warn('Failed to track action:', error);
    }
  }, [propertyId]);

  return { trackAction };
}

// Helper function to sync engagement to CRM
async function syncEngagementToCRM(propertyId, engagementData) {
  try {
    // Get active CRM integrations
    const integrations = await base44.entities.CRMIntegration.filter({ is_active: true });
    
    if (integrations.length === 0) return;

    // Sync to first active integration
    const integration = integrations[0];
    
    await base44.functions.invoke('syncEngagementToCRM', {
      integration_id: integration.id,
      entity_type: 'property_engagement',
      entity_id: propertyId,
      engagement_data: engagementData
    });
  } catch (error) {
    // Silent fail - don't block user experience
    console.warn('CRM sync failed:', error);
  }
}