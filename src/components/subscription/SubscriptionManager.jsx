import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Crown, Check, Zap, TrendingUp, Shield, Sparkles, 
  Calendar, AlertCircle, Loader2, Building2, Copy, Info
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SubscriptionFeaturesConfig from "./SubscriptionFeaturesConfig";

const PLANS = [
  {
    id: "free",
    name: "Gratuito",
    price: 0,
    interval: "Sempre",
    description: "Para começar",
    features: [
      "Até 10 imóveis",
      "Dashboard básico",
      "Suporte por email",
      "Exportação básica"
    ],
    icon: Shield,
    color: "slate"
  },
  {
    id: "premium",
    name: "Premium",
    price: 49,
    interval: "mês",
    description: "Para profissionais",
    features: [
      "Imóveis ilimitados",
      "Analytics avançados",
      "Suporte prioritário",
      "Acesso antecipado a features",
      "Relatórios de mercado",
      "API access"
    ],
    icon: Crown,
    color: "blue",
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 149,
    interval: "mês",
    description: "Para equipas",
    features: [
      "Tudo do Premium",
      "Utilizadores ilimitados",
      "White-label",
      "Gestor de conta dedicado",
      "SLA 99.9%",
      "Treino personalizado"
    ],
    icon: Sparkles,
    color: "purple"
  }
];

export default function SubscriptionManager() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [transferDetailsOpen, setTransferDetailsOpen] = useState(false);
  const [transferDetails, setTransferDetails] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user.email });
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  const handleSelectPlan = (planId) => {
    if (planId === 'free') {
      toast.info("Já está no plano gratuito");
      return;
    }
    createBankTransfer(planId);
  };



  const createBankTransfer = async (planId) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createBankTransferSubscription', {
        plan: planId
      });

      if (response.data.success) {
        setTransferDetails(response.data);
        setTransferDetailsOpen(true);
        toast.success("Detalhes da transferência enviados por email");
      }
    } catch (error) {
      toast.error("Erro ao criar pedido de transferência");
      console.error(error);
    }
    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };



  const currentPlan = subscription?.plan || 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';

  return (
    <div className="space-y-8">
      {/* Current Subscription Card */}
      {subscription && (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-blue-600" />
                  Subscrição Atual
                </CardTitle>
                <CardDescription>Gerir o seu plano</CardDescription>
              </div>
              <Badge className={
                subscription.status === 'active' ? 'bg-green-600' :
                subscription.status === 'trial' ? 'bg-blue-600' :
                subscription.status === 'cancelled' ? 'bg-orange-600' :
                'bg-slate-600'
              }>
                {subscription.status === 'active' ? 'Ativo' :
                 subscription.status === 'trial' ? 'Trial' :
                 subscription.status === 'cancelled' ? 'Cancelado' : 'Expirado'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-2xl font-bold capitalize">{currentPlan}</div>
                {subscription.current_period_end && (
                  <p className="text-sm text-slate-600">
                    {subscription.cancel_at_period_end ? 'Cancela em' : 'Renova em'}: {' '}
                    {new Date(subscription.current_period_end).toLocaleDateString('pt-PT')}
                  </p>
                )}
                {subscription.payment_method === 'bank_transfer' && (
                  <p className="text-xs text-slate-500 mt-1">
                    Pagamento por transferência bancária
                  </p>
                )}
              </div>
            </div>

            {/* Features */}
            {subscription.features && (
              <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                {Object.entries(subscription.features).map(([key, value]) => value && (
                  <div key={key} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-600" />
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Escolha o seu plano</h2>
        <p className="text-slate-600 mb-6">Desbloqueie todo o potencial da plataforma</p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={`relative ${
                  plan.popular ? 'border-2 border-blue-500 shadow-lg' : 'border-slate-200'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-3 py-1">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-600 text-white px-3 py-1">
                      Plano Atual
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 bg-${plan.color}-100 rounded-lg`}>
                      <Icon className={`w-6 h-6 text-${plan.color}-600`} />
                    </div>
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <p className="text-sm text-slate-500">{plan.description}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">€{plan.price}</span>
                      <span className="text-slate-600">/{plan.interval}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrent || loading}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : isCurrent ? (
                      "Plano Atual"
                    ) : currentPlan !== 'free' && PLANS.findIndex(p => p.id === currentPlan) > PLANS.findIndex(p => p.id === plan.id) ? (
                      "Downgrade"
                    ) : (
                      "Subscrever"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Features Comparison */}
      <SubscriptionFeaturesConfig />

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Posso cancelar a qualquer momento?</h4>
            <p className="text-sm text-slate-600">Sim, pode cancelar a sua subscrição a qualquer momento. Terá acesso até ao fim do período pago.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Como funciona o trial?</h4>
            <p className="text-sm text-slate-600">Novos utilizadores têm 14 dias de trial gratuito do plano Premium. Não é necessário cartão de crédito.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Posso fazer upgrade/downgrade?</h4>
            <p className="text-sm text-slate-600">Sim, pode alterar o seu plano a qualquer momento. O valor será ajustado proporcionalmente.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Como funciona o pagamento?</h4>
            <p className="text-sm text-slate-600">Pagamento por transferência bancária. Após selecionar um plano, receberá os dados bancários. A ativação ocorre em 1-2 dias úteis após confirmação do pagamento.</p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Transfer Details Dialog */}
      <Dialog open={transferDetailsOpen} onOpenChange={setTransferDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Transferência Bancária</DialogTitle>
            <DialogDescription>
              Efetue a transferência com os seguintes dados. Os detalhes também foram enviados por email.
            </DialogDescription>
          </DialogHeader>
          {transferDetails && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Banco</div>
                    <div className="font-semibold">{transferDetails.bank_details.bank_name}</div>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">IBAN</div>
                    <div className="font-mono text-sm">{transferDetails.bank_details.iban}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(transferDetails.bank_details.iban)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">SWIFT/BIC</div>
                    <div className="font-mono text-sm">{transferDetails.bank_details.swift}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(transferDetails.bank_details.swift)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Titular</div>
                  <div className="font-semibold">{transferDetails.bank_details.account_holder}</div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Montante</div>
                      <div className="text-2xl font-bold text-blue-600">€{transferDetails.amount}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <div className="text-xs font-semibold text-amber-900 mb-2">REFERÊNCIA OBRIGATÓRIA</div>
                  <div className="flex justify-between items-center">
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      {transferDetails.reference}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(transferDetails.reference)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-amber-800 mt-2">
                    Por favor inclua esta referência para identificarmos o seu pagamento.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Próximos Passos</h4>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Efetue a transferência com os dados acima</li>
                  <li>Inclua a referência na transferência</li>
                  <li>Aguarde 1-2 dias úteis pela confirmação</li>
                  <li>Receberá um email quando a subscrição for ativada</li>
                </ol>
                <p className="text-xs text-blue-700 mt-3">
                  Validade: {new Date(transferDetails.expires_at).toLocaleDateString('pt-PT')}
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => setTransferDetailsOpen(false)}
              >
                Entendido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}