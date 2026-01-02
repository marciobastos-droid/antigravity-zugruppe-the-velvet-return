import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SubscriptionGate({ 
  children, 
  requiredPlan = "premium", 
  featureName = "esta funcionalidade",
  showUpgradeButton = true 
}) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Check if user has required plan
  const planHierarchy = { free: 0, premium: 1, enterprise: 2 };
  const userPlan = subscription?.plan || 'free';
  const hasAccess = planHierarchy[userPlan] >= planHierarchy[requiredPlan];

  if (hasAccess && subscription?.status === 'active') {
    return <>{children}</>;
  }

  // Show upgrade message
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
            <Lock className="w-6 h-6 text-amber-600" />
            Funcionalidade Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-lg text-slate-700">
              Para aceder a <span className="font-semibold text-amber-700">{featureName}</span>, 
              precisa de uma subscrição <span className="font-bold text-amber-600 capitalize">{requiredPlan}</span>.
            </p>
            <p className="text-sm text-slate-600">
              {subscription?.status === 'pending_payment' 
                ? "A sua subscrição está pendente de pagamento. Complete o pagamento para ativar todas as funcionalidades."
                : "Atualize o seu plano para desbloquear esta e muitas outras funcionalidades exclusivas."}
            </p>
          </div>

          {subscription?.status === 'pending_payment' ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">
                💳 Pagamento Pendente
              </p>
              <p className="text-xs text-blue-700">
                Já selecionou o plano <span className="font-semibold capitalize">{subscription.plan}</span>. 
                Complete a transferência bancária para ativar a sua subscrição.
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-center gap-2 pt-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <p className="text-sm font-medium text-slate-700">
              Desbloqueie todo o potencial da plataforma
            </p>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>

          {showUpgradeButton && (
            <div className="flex gap-3 justify-center pt-2">
              <Link to={createPageUrl("Subscriptions")}>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg">
                  <Crown className="w-4 h-4 mr-2" />
                  {subscription?.status === 'pending_payment' ? 'Ver Detalhes de Pagamento' : 'Ver Planos e Preços'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}