import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para verificar subscrição e acesso a ferramentas
 */
export function useSubscription() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000
  });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ 
        user_email: user.email 
      });
      return subs[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000
  });

  // Admin sempre tem acesso total
  const isAdmin = user && (
    user.role === 'admin' || 
    user.user_type === 'admin' || 
    user.user_type === 'gestor'
  );

  /**
   * Verifica se tem acesso a uma ferramenta específica
   */
  const hasToolAccess = (toolId) => {
    // Admin tem acesso total
    if (isAdmin) return true;

    // Se tem permissão direta no user.permissions.tools (configuração manual por admin)
    if (user?.permissions?.tools?.[toolId] === true) return true;

    // Verificar subscrição
    if (!subscription || subscription.status !== 'active') return false;

    // Verificar tools_access da subscrição
    return subscription.tools_access?.[toolId] === true;
  };

  /**
   * Verifica se tem uma feature específica
   */
  const hasFeature = (featureKey) => {
    if (isAdmin) return true;
    if (!subscription || subscription.status !== 'active') return false;
    return subscription.features?.[featureKey] === true;
  };

  /**
   * Retorna o plano atual
   */
  const currentPlan = subscription?.plan || 'free';

  /**
   * Verifica se a subscrição está ativa
   */
  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  return {
    user,
    subscription,
    isLoading,
    isAdmin,
    currentPlan,
    isActive,
    hasToolAccess,
    hasFeature
  };
}