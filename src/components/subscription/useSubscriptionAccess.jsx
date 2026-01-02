import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para verificar acesso baseado em subscrição
 * @param {string} requiredPlan - Plano mínimo necessário ('free', 'premium', 'enterprise')
 * @param {string} requiredFeature - Feature específica necessária (opcional)
 * @param {string} requiredTool - Tool específica necessária (opcional)
 * @returns {Object} { hasAccess, subscription, isLoading, plan, status }
 */
export function useSubscriptionAccess(requiredPlan = 'free', requiredFeature = null, requiredTool = null) {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const subs = await base44.entities.Subscription.filter({ 
        user_email: user.email,
        status: 'active'
      });
      return subs.length > 0 ? subs[0] : null;
    },
    enabled: !!user?.email
  });

  const planHierarchy = { free: 0, premium: 1, enterprise: 2 };
  const userPlan = subscription?.plan || 'free';
  const userStatus = subscription?.status || 'inactive';

  // Check plan level
  const hasPlanAccess = planHierarchy[userPlan] >= planHierarchy[requiredPlan];
  const isActive = userStatus === 'active';

  // Check specific feature access
  let hasFeatureAccess = true;
  if (requiredFeature && subscription?.features) {
    hasFeatureAccess = subscription.features[requiredFeature] === true;
  }

  // Check specific tool access
  let hasToolAccess = true;
  if (requiredTool && subscription?.tools_access) {
    hasToolAccess = subscription.tools_access[requiredTool] === true;
  }

  const hasAccess = hasPlanAccess && isActive && hasFeatureAccess && hasToolAccess;

  return {
    hasAccess,
    subscription,
    isLoading,
    plan: userPlan,
    status: userStatus,
    hasPlanAccess,
    hasFeatureAccess,
    hasToolAccess,
    isActive
  };
}