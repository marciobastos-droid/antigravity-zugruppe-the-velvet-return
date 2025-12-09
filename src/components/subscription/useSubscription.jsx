import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useSubscription() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user.email });
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  const isPremium = subscription?.plan === 'premium' || subscription?.plan === 'enterprise';
  const isEnterprise = subscription?.plan === 'enterprise';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';
  
  const hasFeature = (featureName) => {
    return subscription?.features?.[featureName] === true;
  };

  return {
    subscription,
    isLoading,
    isPremium,
    isEnterprise,
    isActive,
    hasFeature,
    plan: subscription?.plan || 'free'
  };
}