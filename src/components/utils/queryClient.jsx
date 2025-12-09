import { QueryClient } from "@tanstack/react-query";

/**
 * Configuração otimizada do React Query para cache agressivo
 * Melhora drasticamente a performance ao reduzir chamadas à API
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 10 minutos antes de considerar dados stale
      staleTime: 10 * 60 * 1000,
      
      // Manter cache por 30 minutos
      gcTime: 30 * 60 * 1000,
      
      // Não refetch automaticamente em vários cenários
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      
      // Retry apenas uma vez em caso de erro
      retry: 1,
      
      // Timeout de 30 segundos
      networkMode: 'online',
    },
  },
});

/**
 * Configurações específicas por tipo de query
 */
export const QUERY_CONFIG = {
  // Properties - cache mais longo (mudam raramente)
  properties: {
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  },
  
  // User data - cache moderado
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  },
  
  // Agents - cache longo
  agents: {
    staleTime: 20 * 60 * 1000, // 20 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  },
  
  // Analytics - cache curto (dados dinâmicos)
  analytics: {
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  },
  
  // Static data - cache muito longo
  static: {
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
  },
};