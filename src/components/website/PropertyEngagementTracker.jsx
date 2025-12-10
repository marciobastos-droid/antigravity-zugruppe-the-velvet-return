import React from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook para rastrear engagement de propriedades no website
 * Envia dados de interação para o CRM automaticamente
 */
export function usePropertyEngagement(propertyId, propertyTitle) {
  const startTime = React.useRef(Date.now());
  const [user, setUser] = React.useState(null);
  const [isAuthChecked, setIsAuthChecked] = React.useState(false);
  const [tracked, setTracked] = React.useState({
    view: false,
    timeSpent: false
  });

  // Check auth once on mount
  React.useEffect(() => {
    base44.auth.me()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsAuthChecked(true));
  }, []);

  // Track view on mount (only after auth check)
  React.useEffect(() => {
    if (!propertyId || tracked.view || !isAuthChecked || !user?.email) return;

    const trackView = async () => {
      try {
        // Get or create buyer profile for this user
        let profile = null;
        try {
          const profiles = await base44.entities.BuyerProfile.filter({ buyer_email: user.email });
          profile = profiles[0];
          
          if (!profile) {
            profile = await base44.entities.BuyerProfile.create({
              buyer_name: user.full_name || user.email,
              buyer_email: user.email,
              listing_type: 'sale',
              profile_type: 'cliente_comprador',
              lead_source: 'website'
            });
          }
        } catch (profileError) {
          console.warn('[PropertyEngagement] Could not create/fetch profile:', profileError);
          return;
        }

        await base44.entities.PropertyInteraction.create({
          profile_id: profile.id,
          property_id: propertyId,
          interaction_type: 'viewed',
          time_spent_seconds: 0,
          property_features: {
            title: propertyTitle
          }
        });

        syncEngagementToCRM(propertyId, { views: 1 }).catch(e => 
          console.warn('Failed to sync view to CRM:', e)
        );

        setTracked(prev => ({ ...prev, view: true }));
      } catch (error) {
        console.warn('Failed to track view:', error);
      }
    };

    trackView();
  }, [propertyId, tracked.view, propertyTitle, isAuthChecked, user]);

  // Track time spent on page
  React.useEffect(() => {
    if (!propertyId || !isAuthChecked || !user?.email) return;

    const trackTimeSpent = async () => {
      const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
      
      if (timeSpent > 10 && !tracked.timeSpent) {
        try {
          // Get profile ID first
          const profiles = await base44.entities.BuyerProfile.filter({ buyer_email: user.email });
          if (profiles.length === 0) return; // Skip if no profile
          
          const interactions = await base44.entities.PropertyInteraction.filter({ 
            profile_id: profiles[0].id,
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

    const timer = setTimeout(trackTimeSpent, 30000);
    
    return () => {
      clearTimeout(timer);
      trackTimeSpent();
    };
  }, [propertyId, tracked.timeSpent, isAuthChecked, user]);

  // Track specific actions
  const trackAction = React.useCallback(async (action, metadata = {}) => {
    if (!propertyId) return;
    
    // Skip if user is not authenticated
    if (!user?.email) {
      console.log('[PropertyEngagement] Skipping track - user not authenticated');
      return;
    }

    try {
      // Get or create buyer profile for this user
      let profile = null;
      try {
        const profiles = await base44.entities.BuyerProfile.filter({ buyer_email: user.email });
        profile = profiles[0];
        
        if (!profile) {
          // Create a basic profile for the user
          profile = await base44.entities.BuyerProfile.create({
            buyer_name: user.full_name || user.email,
            buyer_email: user.email,
            listing_type: 'sale',
            profile_type: 'cliente_comprador',
            lead_source: 'website'
          });
        }
      } catch (profileError) {
        console.warn('[PropertyEngagement] Could not create/fetch profile:', profileError);
        return; // Skip tracking if profile creation fails
      }

      await base44.entities.PropertyInteraction.create({
        profile_id: profile.id,
        property_id: propertyId,
        interaction_type: action,
        property_features: metadata
      });

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
  }, [propertyId, user]);

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