import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

const PLAN_FEATURES = {
  free: {
    name: "Gratuito",
    color: "slate",
    features: [
      { key: "unlimited_properties", label: "Imóveis ilimitados", value: false },
      { key: "advanced_analytics", label: "Analytics avançados", value: false },
      { key: "priority_support", label: "Suporte prioritário", value: false },
      { key: "market_reports", label: "Relatórios de mercado", value: false },
      { key: "api_access", label: "Acesso API", value: false }
    ],
    tools: [
      "Importar Imóveis",
      "Importar Leads",
      "Importar Contactos",
      "Exportar Imóveis",
      "Calendário",
      "Gerador Descrições",
      "Simulador Crédito",
      "Custos Escritura"
    ]
  },
  premium: {
    name: "Premium",
    color: "blue",
    features: [
      { key: "unlimited_properties", label: "Imóveis ilimitados", value: true },
      { key: "advanced_analytics", label: "Analytics avançados", value: true },
      { key: "priority_support", label: "Suporte prioritário", value: true },
      { key: "market_reports", label: "Relatórios de mercado", value: true },
      { key: "api_access", label: "Acesso API", value: true },
      { key: "early_access", label: "Acesso antecipado", value: true }
    ],
    tools: [
      "Todas as ferramentas Free +",
      "Matching IA",
      "Automação Email",
      "Análise Mercado",
      "Otimizador Anúncios",
      "Performance Imóveis",
      "Sugestor Preços",
      "Pontuações em Massa",
      "Marketing Social",
      "Portais Imobiliários",
      "SEO Analytics",
      "Facebook Leads",
      "E muito mais..."
    ]
  },
  enterprise: {
    name: "Enterprise",
    color: "purple",
    features: [
      { key: "unlimited_properties", label: "Imóveis ilimitados", value: true },
      { key: "advanced_analytics", label: "Analytics avançados", value: true },
      { key: "priority_support", label: "Suporte prioritário", value: true },
      { key: "market_reports", label: "Relatórios de mercado", value: true },
      { key: "api_access", label: "Acesso API", value: true },
      { key: "early_access", label: "Acesso antecipado", value: true },
      { key: "unlimited_users", label: "Utilizadores ilimitados", value: true },
      { key: "white_label", label: "White-label", value: true },
      { key: "dedicated_account_manager", label: "Gestor dedicado", value: true }
    ],
    tools: [
      "TODAS as ferramentas",
      "Campanhas Marketing",
      "Landing Pages",
      "Formulários Dinâmicos",
      "WhatsApp Business",
      "CRM Integrações",
      "Backups Automáticos",
      "Logs Auditoria",
      "Comissões e Faturas",
      "Investidores Portal",
      "Casafari Sync",
      "E todas as outras..."
    ]
  }
};

export default function SubscriptionFeaturesConfig() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Comparação de Planos</h2>
        <p className="text-slate-600">Veja o que está incluído em cada plano</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(PLAN_FEATURES).map(([planId, plan]) => (
          <Card key={planId} className={`border-2 ${
            planId === 'premium' ? 'border-blue-500 shadow-lg' : 'border-slate-200'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {planId === 'premium' && (
                  <Badge className="bg-blue-600 text-white">Popular</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features */}
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-3">Funcionalidades</h4>
                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature.key} className="flex items-center gap-2 text-sm">
                      {feature.value ? (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      )}
                      <span className={feature.value ? "text-slate-900" : "text-slate-400"}>
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools Access */}
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-3">Ferramentas Incluídas</h4>
                <div className="space-y-1.5">
                  {plan.tools.slice(0, 8).map((tool, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${plan.color}-500`} />
                      {tool}
                    </div>
                  ))}
                  {plan.tools.length > 8 && (
                    <div className="text-sm text-slate-500 italic mt-2">
                      +{plan.tools.length - 8} ferramentas adicionais
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Tools Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz Detalhada de Ferramentas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Ferramenta</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Free</th>
                  <th className="text-center py-3 px-4 font-semibold text-blue-600">Premium</th>
                  <th className="text-center py-3 px-4 font-semibold text-purple-600">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {/* Import/Export */}
                <tr className="border-b">
                  <td className="py-2 px-4 font-medium text-slate-700">Importar Imóveis</td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-medium text-slate-700">Importar Leads</td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-medium text-slate-700">Matching IA</td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-medium text-slate-700">Analytics Avançados</td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-medium text-slate-700">WhatsApp Business</td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-medium text-slate-700">Campanhas Marketing</td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4 font-medium text-slate-700">Comissões & Faturas</td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-slate-700">Todas as outras ferramentas</td>
                  <td className="text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                  <td className="text-center"><Check className="w-4 h-4 text-green-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}