import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Shield, Sparkles, Check, X, Save } from "lucide-react";
import { toast } from "sonner";

// Lista completa de ferramentas disponíveis
const ALL_TOOLS = [
  { id: "importProperties", label: "Importar Imóveis", category: "import" },
  { id: "importLeads", label: "Importar Leads", category: "import" },
  { id: "importContacts", label: "Importar Contactos", category: "import" },
  { id: "importOpportunities", label: "Importar Oportunidades", category: "import" },
  { id: "exportProperties", label: "Exportar Imóveis", category: "import" },
  { id: "dataExporter", label: "Exportar Dados", category: "import" },
  { id: "reportsExporter", label: "Exportar Relatórios", category: "import" },
  { id: "bulkScore", label: "Pontuações em Massa", category: "utilities" },
  { id: "crmSync", label: "Sincronização CRM", category: "utilities" },
  { id: "duplicateChecker", label: "Verificar Duplicados", category: "utilities" },
  { id: "duplicateClients", label: "Clientes Duplicados", category: "utilities" },
  { id: "inconsistencyChecker", label: "Verificar Inconsistências", category: "utilities" },
  { id: "orphanCleaner", label: "Limpar Dados Órfãos", category: "utilities" },
  { id: "linkContacts", label: "Vincular Contactos", category: "utilities" },
  { id: "imageValidator", label: "Validador de Imagens", category: "utilities" },
  { id: "emailHub", label: "Centro de Email", category: "utilities" },
  { id: "gmailSync", label: "Sincronizar Gmail", category: "utilities" },
  { id: "gmailLinker", label: "Gmail Linker", category: "utilities" },
  { id: "video", label: "Criador de Vídeos", category: "utilities" },
  { id: "description", label: "Gerador de Descrições", category: "utilities" },
  { id: "listingOptimizer", label: "Otimizador de Anúncios", category: "utilities" },
  { id: "calendar", label: "Calendário Unificado", category: "utilities" },
  { id: "aiMatching", label: "Motor de Matching IA", category: "matching" },
  { id: "autoMatching", label: "Matching Automático", category: "matching" },
  { id: "autoMatchingDashboard", label: "Alertas de Matching", category: "matching" },
  { id: "marketIntelligence", label: "Inteligência de Mercado", category: "market" },
  { id: "propertyPerformance", label: "Performance de Imóveis", category: "market" },
  { id: "pricing", label: "Sugestor de Preços", category: "market" },
  { id: "creditSimulator", label: "Simulador de Crédito", category: "market" },
  { id: "deedCosts", label: "Custos de Escritura", category: "market" },
  { id: "commissions", label: "Gestão de Comissões", category: "finance" },
  { id: "invoices", label: "Gestão de Faturas", category: "finance" },
  { id: "investorKeys", label: "Chaves de Investidores", category: "investors" },
  { id: "investorProperties", label: "Imóveis para Investidores", category: "investors" },
  { id: "contractAutomation", label: "Automação de Contratos", category: "settings" },
  { id: "documents", label: "Documentos e Contratos", category: "settings" },
  { id: "notificationsDashboard", label: "Central de Notificações", category: "settings" },
  { id: "smtpConfig", label: "Configuração Email", category: "settings" },
  { id: "devNotes", label: "Notas de Desenvolvimento", category: "settings" },
  { id: "tagManager", label: "Gestor de Etiquetas", category: "settings" },
  { id: "backupManager", label: "Gestor de Backups", category: "settings" },
  { id: "auditLog", label: "Logs de Auditoria", category: "settings" },
  { id: "marketingHub", label: "Hub de Marketing", category: "marketing" },
  { id: "marketingCampaigns", label: "Campanhas Marketing", category: "marketing" },
  { id: "landingPages", label: "Landing Pages", category: "marketing" },
  { id: "dynamicForms", label: "Formulários Dinâmicos", category: "marketing" },
  { id: "seoManager", label: "Gestor SEO", category: "marketing" },
  { id: "socialMedia", label: "Posts Sociais", category: "marketing" },
  { id: "socialAdCreator", label: "Criador de Anúncios", category: "marketing" },
  { id: "apiPublish", label: "Publicação API", category: "marketing" },
  { id: "apiIntegrations", label: "Integrações API", category: "marketing" },
  { id: "portalIntegrations", label: "Portais Imobiliários", category: "marketing" },
  { id: "whatsapp", label: "WhatsApp Business", category: "marketing" },
  { id: "integrations", label: "Integrações Externas", category: "marketing" },
  { id: "imageExtractor", label: "Extrator de Imagens", category: "marketing" },
  { id: "excelImport", label: "Excel & JSON", category: "marketing" },
  { id: "crmIntegrations", label: "CRM Externo", category: "marketing" },
  { id: "seoAnalytics", label: "SEO & Blog Analytics", category: "marketing" },
  { id: "facebookCampaigns", label: "Facebook Ads", category: "marketing" },
  { id: "facebookLeads", label: "Leads Facebook", category: "marketing" },
  { id: "facebookForms", label: "Formulários Facebook", category: "marketing" },
  { id: "leadManagement", label: "Gestão de Leads", category: "leads" },
  { id: "leadNurturing", label: "Nurturing Automático", category: "leads" },
  { id: "jsonProcessor", label: "Processador JSON", category: "import" },
  { id: "propertyFeeds", label: "Feeds de Imóveis", category: "import" },
  { id: "externalSync", label: "Sincronização Externa", category: "import" },
  { id: "casafariSync", label: "Casafari Sync", category: "import" }
];

// Configuração padrão de cada plano
const DEFAULT_PLAN_CONFIG = {
  free: ["importProperties", "importLeads", "importContacts", "exportProperties", "dataExporter", "calendar", "description", "creditSimulator", "deedCosts"],
  premium: ["importProperties", "importLeads", "importContacts", "importOpportunities", "exportProperties", "dataExporter", "reportsExporter", "bulkScore", "crmSync", "duplicateChecker", "duplicateClients", "inconsistencyChecker", "linkContacts", "imageValidator", "emailHub", "video", "description", "listingOptimizer", "calendar", "aiMatching", "autoMatching", "autoMatchingDashboard", "marketIntelligence", "propertyPerformance", "pricing", "creditSimulator", "deedCosts", "documents", "notificationsDashboard", "tagManager", "marketingHub", "socialMedia", "portalIntegrations", "propertyFeeds", "seoAnalytics", "facebookLeads", "leadManagement"],
  enterprise: ALL_TOOLS.map(t => t.id)
};

export default function AdminPlanConfigurator() {
  const [selectedPlan, setSelectedPlan] = React.useState("free");
  const [planTools, setPlanTools] = React.useState(() => {
    const saved = localStorage.getItem('adminPlanConfig');
    return saved ? JSON.parse(saved) : DEFAULT_PLAN_CONFIG;
  });

  const handleToggleTool = (toolId) => {
    setPlanTools(prev => ({
      ...prev,
      [selectedPlan]: prev[selectedPlan].includes(toolId)
        ? prev[selectedPlan].filter(id => id !== toolId)
        : [...prev[selectedPlan], toolId]
    }));
  };

  const handleSave = () => {
    localStorage.setItem('adminPlanConfig', JSON.stringify(planTools));
    toast.success("Configuração guardada localmente! Para aplicar aos utilizadores, atualize a função createBankTransferSubscription.");
  };

  const handleSelectAll = () => {
    setPlanTools(prev => ({
      ...prev,
      [selectedPlan]: ALL_TOOLS.map(t => t.id)
    }));
  };

  const handleDeselectAll = () => {
    setPlanTools(prev => ({
      ...prev,
      [selectedPlan]: []
    }));
  };

  const categories = [...new Set(ALL_TOOLS.map(t => t.category))];
  const categoryLabels = {
    import: "Importação/Exportação",
    utilities: "Utilitários",
    matching: "Matching IA",
    market: "Mercado",
    finance: "Finanças",
    investors: "Investidores",
    settings: "Definições",
    marketing: "Marketing",
    leads: "Gestão de Leads"
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurar Ferramentas por Plano</CardTitle>
          <p className="text-sm text-slate-600">Defina quais ferramentas cada plano de subscrição terá acesso</p>
        </CardHeader>
        <CardContent>
          {/* Plan Selector */}
          <Tabs value={selectedPlan} onValueChange={setSelectedPlan}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="free" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Free
              </TabsTrigger>
              <TabsTrigger value="premium" className="flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Premium
              </TabsTrigger>
              <TabsTrigger value="enterprise" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Enterprise
              </TabsTrigger>
            </TabsList>

            {/* Summary */}
            <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Ferramentas selecionadas:</p>
                <p className="text-2xl font-bold text-slate-900">
                  {planTools[selectedPlan]?.length || 0} / {ALL_TOOLS.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Selecionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Desmarcar Todas
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
              </div>
            </div>

            {/* Tools by Category */}
            <div className="space-y-6">
              {categories.map(category => {
                const categoryTools = ALL_TOOLS.filter(t => t.category === category);
                const selectedCount = categoryTools.filter(t => planTools[selectedPlan]?.includes(t.id)).length;

                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900">{categoryLabels[category]}</h4>
                      <Badge variant="outline">
                        {selectedCount} / {categoryTools.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryTools.map(tool => {
                        const isSelected = planTools[selectedPlan]?.includes(tool.id);
                        return (
                          <div
                            key={tool.id}
                            onClick={() => handleToggleTool(tool.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-400' 
                                : 'bg-white border-slate-200 hover:border-blue-200'
                            }`}
                          >
                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{tool.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Tabs>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium mb-2">⚠️ Atenção</p>
            <p className="text-sm text-amber-800">
              Esta configuração é guardada localmente no navegador como referência. Para aplicar aos utilizadores reais,
              é necessário atualizar a constante <code className="bg-amber-100 px-1 py-0.5 rounded">PLAN_CONFIG</code> na função
              backend <code className="bg-amber-100 px-1 py-0.5 rounded">createBankTransferSubscription</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visual Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação Visual de Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-3 px-2 font-semibold">Ferramenta</th>
                  <th className="text-center py-3 px-2 font-semibold text-slate-600">Free</th>
                  <th className="text-center py-3 px-2 font-semibold text-blue-600">Premium</th>
                  <th className="text-center py-3 px-2 font-semibold text-purple-600">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {ALL_TOOLS.map(tool => (
                  <tr key={tool.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2 font-medium text-slate-700">{tool.label}</td>
                    <td className="text-center py-2">
                      {planTools.free?.includes(tool.id) ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-2">
                      {planTools.premium?.includes(tool.id) ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-2">
                      {planTools.enterprise?.includes(tool.id) ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}