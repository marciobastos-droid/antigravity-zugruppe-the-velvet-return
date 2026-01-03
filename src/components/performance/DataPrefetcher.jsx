import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { QUERY_CONFIG } from "../utils/queryClient";

/**
 * Prefetch de dados críticos em background
 * Melhora dramaticamente a perceived performance
 */
export function useDataPrefetcher() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // Prefetch em idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Prefetch properties
        queryClient.prefetchQuery({
          queryKey: ['properties', 'website'],
          queryFn: () => base44.entities.Property.list('-created_date'),
          ...QUERY_CONFIG.properties
        });

        // Prefetch agents
        queryClient.prefetchQuery({
          queryKey: ['agents'],
          queryFn: () => base44.entities.Agent.filter({ is_active: true }),
          ...QUERY_CONFIG.agents
        });

        // Prefetch consultor profiles
        queryClient.prefetchQuery({
          queryKey: ['consultorProfiles'],
          queryFn: () => base44.entities.ConsultorProfile.filter({ is_active: true }),
          ...QUERY_CONFIG.consultorProfiles
        });
      });
    }
  }, [queryClient]);
}

/**
 * Hook para prefetch de propriedade individual
 */
export function usePrefetchProperty(propertyId) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!propertyId) return;

    const timeout = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['property', propertyId],
        queryFn: async () => {
          const properties = await base44.entities.Property.filter({ id: propertyId });
          return properties[0];
        },
        ...QUERY_CONFIG.singleProperty
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [propertyId, queryClient]);
}

/**
 * Componente que ativa prefetching global
 */
export default function DataPrefetcher() {
  useDataPrefetcher();
  return null;
}