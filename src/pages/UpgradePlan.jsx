import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap, ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UpgradePlan() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription } = useQuery({
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

  const currentPlan = subscription?.plan || 'free';

  const plans = [
    {
      name: "Free",
      price: 0,
      description: "Para começar",
      features: [
        "Até 10 imóveis",
        "CRM básico",
        "Suporte por email"
      ],
      current: currentPlan === 'free'
    },
    {
      name: "Premium",
      price: 49,
      description: "Para profissionais",
      popular: true,
      features: [
        "Imóveis ilimitados",
        "Analytics avançadas",
        "Suporte prioritário",
        "Acesso antecipado a features",
        "Relatórios de mercado",
        "Acesso à API",
        "Matching automático com IA",
        "Ferramentas de marketing",
        "Integração Facebook Ads",
        "Qualidade Score de imóveis"
      ],
      current: currentPlan === 'premium'
    },
    {
      name: "Enterprise",
      price: 149,
      description: "Para equipas",
      features: [
        "Tudo do Premium +",
        "Utilizadores ilimitados",
        "White label",
        "Gestor de conta dedicado",
        "Comissões e faturas",
        "Backup e auditoria",
        "Campanhas de marketing avançadas",
        "Landing pages personalizadas",
        "Integrações CRM externas",
        "Automação WhatsApp",
        "Análise de ROI completa"
      ],
      current: currentPlan === 'enterprise'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Desbloqueie Todo o Potencial</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Escolha o Plano Ideal
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Ferramentas poderosas para impulsionar o seu negócio imobiliário
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${
                plan.popular 
                  ? 'border-2 border-amber-400 shadow-xl scale-105' 
                  : plan.current
                  ? 'border-2 border-green-400'
                  : 'border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
                    <Crown className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-600 text-white border-0 shadow-lg">
                    <Check className="w-3 h-3 mr-1" />
                    Plano Atual
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                <p className="text-sm text-slate-600">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">€{plan.price}</span>
                  <span className="text-slate-600">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.current ? (
                  <Button className="w-full" variant="outline" disabled>
                    Plano Atual
                  </Button>
                ) : (
                  <Link to={createPageUrl("Subscriptions")} className="block">
                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' 
                          : ''
                      }`}
                    >
                      {plan.name === 'Free' ? 'Plano Atual' : 'Escolher Plano'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Card className="bg-slate-900 text-white border-0">
            <CardContent className="p-8">
              <Zap className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Precisa de Ajuda?</h3>
              <p className="text-slate-300 mb-4">
                A nossa equipa está disponível para ajudá-lo a escolher o plano ideal para o seu negócio.
              </p>
              <a href="mailto:info@zuconnect.pt">
                <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100">
                  Contactar Suporte
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}