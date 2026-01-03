import { QueryClient } from "@tanstack/react-query";

/**
 * Configuração otimizada do React Query para cache agressivo
 * Melhora drasticamente a performance ao reduzir chamadas à API
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache agressivo - 20 minutos antes de considerar dados stale
      staleTime: 20 * 60 * 1000,
      
      // Manter cache por 1 hora
      gcTime: 60 * 60 * 1000,
      
      // Não refetch automaticamente em vários cenários
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      
      // Retry apenas uma vez em caso de erro
      retry: 1,
      retryDelay: 1000,
      
      // Network mode
      networkMode: 'online',
      
      // Structured data clone
      structuralSharing: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    }
  },
});

/**
 * Configurações específicas por tipo de query
 */
export const QUERY_CONFIG = {
  // Properties - cache ultra agressivo (mudam raramente)
  properties: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 2 * 60 * 60 * 1000, // 2 horas
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Single property - cache agressivo
  singleProperty: {
    staleTime: 20 * 60 * 1000, // 20 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // User data - cache moderado
  user: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnMount: false,
  },
  
  // Agents - cache muito longo
  agents: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 2 * 60 * 60 * 1000, // 2 horas
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Consultor profiles - cache longo
  consultorProfiles: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 2 * 60 * 60 * 1000, // 2 horas
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
  
  // Analytics - cache curto (dados dinâmicos)
  analytics: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  },
  
  // Static data - cache máximo
  static: {
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  },
};