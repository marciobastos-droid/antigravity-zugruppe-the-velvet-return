import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook to track property view duration and create view history records
 * @param {string} propertyId - ID do imóvel
 * @param {object} propertyData - Dados do imóvel (title, image, price, city)
 * @param {string} source - Origem da visualização (website, portal, etc)
 */
export function useTrackView(propertyId, propertyData, source = "website") {
  const startTimeRef = useRef(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!propertyId || !propertyData) return;

    // Start tracking time
    startTimeRef.current = Date.now();

    // Track view on unmount
    return () => {
      if (trackedRef.current) return; // Already tracked
      
      const duration = startTimeRef.current 
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;

      // Only track if user spent at least 3 seconds
      if (duration < 3) return;

      trackedRef.current = true;

      // Track view (non-blocking)
      base44.auth.me()
        .then(user => {
          if (!user?.email) return;

          const deviceType = window.innerWidth < 768 ? 'mobile' : 
                           window.innerWidth < 1024 ? 'tablet' : 'desktop';

          base44.entities.PropertyViewHistory.create({
            user_email: user.email,
            user_name: user.full_name,
            property_id: propertyId,
            property_title: propertyData.title,
            property_image: propertyData.images?.[0],
            property_price: propertyData.price,
            property_city: propertyData.city,
            view_duration_seconds: duration,
            view_source: source,
            device_type: deviceType
          }).catch(err => {
            console.warn('Failed to track view:', err);
          });
        })
        .catch(() => {
          // User not authenticated, skip tracking
        });
    };
  }, [propertyId, propertyData, source]);
}

export default useTrackView;