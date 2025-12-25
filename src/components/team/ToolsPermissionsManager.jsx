import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, User, Save, Search, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Tool categories matching Tools page EXACTLY
const TOOL_CATEGORIES = {
  marketing: {
    name: "Marketing Digital",
    icon: "📢",
    color: "purple",
    tools: [
      { id: "marketingHub", name: "Hub de Marketing" },
      { id: "marketingCampaigns", name: "Campanhas Marketing" },
      { id: "facebookCampaigns", name: "Facebook Ads" },
      { id: "facebookLeads", name: "Leads Facebook" },
      { id: "facebookForms", name: "Formulários Facebook" },
      { id: "socialMedia", name: "Posts Sociais" },
      { id: "socialAdCreator", name: "Criador de Anúncios" },
      { id: "apiPublish", name: "Publicação API" },
      { id: "apiIntegrations", name: "Integrações API" },
      { id: "portalIntegrations", name: "Portais Imobiliários" },
      { id: "whatsapp", name: "WhatsApp Business" },
      { id: "integrations", name: "Integrações Externas" },
      { id: "imageExtractor", name: "Extrator de Imagens" },
      { id: "excelImport", name: "Excel & JSON" },
      { id: "crmIntegrations", name: "CRM Externo" }
    ]
  },
  leads: {
    name: "Gestão de Leads",
    icon: "🎯",
    color: "emerald",
    tools: [
      { id: "leadManagement", name: "Origens & Scoring" },
      { id: "leadNurturing", name: "Nurturing Automático" }
    ]
  },
  importExport: {
    name: "Importações e Exportações",
    icon: "📥",
    color: "blue",
    tools: [
      { id: "importProperties", name: "Importar Imóveis" },
      { id: "importLeads", name: "Importar Leads" },
      { id: "importContacts", name: "Importar Contactos" },
      { id: "importOpportunities", name: "Importar Oportunidades" },
      { id: "importInvoices", name: "Importar Faturas" },
      { id: "exportProperties", name: "Exportar Ficheiros" },
      { id: "reportsExporter", name: "Relatórios" },
      { id: "jsonProcessor", name: "Processador JSON" },
      { id: "propertyFeeds", name: "Feeds de Imóveis" },
      { id: "externalSync", name: "Sincronização Externa" },
      { id: "casafariSync", name: "Casafari Sync" }
    ]
  },
  utilities: {
    name: "Utilitários",
    icon: "✨",
    color: "green",
    tools: [
      { id: "bulkScore", name: "Pontuações em Massa" },
      { id: "crmSync", name: "Sincronização CRM" },
      { id: "duplicateChecker", name: "Verificar Duplicados" },
      { id: "duplicateClients", name: "Clientes Duplicados" },
      { id: "inconsistencyChecker", name: "Verificar Inconsistências" },
      { id: "orphanCleaner", name: "Limpar Dados Órfãos" },
      { id: "linkContacts", name: "Vincular Contactos" },
      { id: "imageValidator", name: "Validador de Imagens" },
      { id: "emailHub", name: "Centro de Email" },
      { id: "gmailSync", name: "Sincronizar Gmail" },
      { id: "gmailLinker", name: "Gmail Linker" },
      { id: "video", name: "Criador de Vídeos" },
      { id: "description", name: "Gerador de Descrições" },
      { id: "listingOptimizer", name: "Otimizador de Anúncios" },
      { id: "calendar", name: "Calendário Unificado" }
    ]
  },
  matching: {
    name: "Matching com IA",
    icon: "🧠",
    color: "indigo",
    tools: [
      { id: "aiMatching", name: "Motor de Matching IA" },
      { id: "autoMatching", name: "Matching Automático" },
      { id: "autoMatchingDashboard", name: "Alertas de Matching" }
    ]
  },
  market: {
    name: "Mercado",
    icon: "📊",
    color: "amber",
    tools: [
      { id: "marketIntelligence", name: "Inteligência de Mercado" },
      { id: "propertyPerformance", name: "Performance de Imóveis" },
      { id: "pricing", name: "Sugestor de Preços" },
      { id: "creditSimulator", name: "Simulador de Crédito" },
      { id: "deedCosts", name: "Custos de Escritura" }
    ]
  },
  finance: {
    name: "Finanças",
    icon: "💰",
    color: "green",
    tools: [
      { id: "commissions", name: "Gestão de Comissões" },
      { id: "invoices", name: "Gestão de Faturas" }
    ]
  },
  investor: {
    name: "Secção de Investidores",
    icon: "🔐",
    color: "amber",
    tools: [
      { id: "investorKeys", name: "Chaves de Acesso" },
      { id: "investorProperties", name: "Imóveis Publicados" }
    ]
  },
  settings: {
    name: "Definições e Conteúdos",
    icon: "⚙️",
    color: "slate",
    tools: [
      { id: "contractAutomation", name: "Automação de Contratos" },
      { id: "documents", name: "Documentos e Contratos" },
      { id: "notificationsDashboard", name: "Central de Notificações" },
      { id: "smtpConfig", name: "Config. Email" },
      { id: "devNotes", name: "Notas & Sugestões" },
      { id: "tagManager", name: "Etiquetas" },
      { id: "backupManager", name: "Gestor de Backups" },
      { id: "auditLog", name: "Logs de Atividade" }
    ]
  }
};

const ALL_TOOLS = Object.values(TOOL_CATEGORIES).flatMap(cat => cat.tools.map(t => t.id));

export default function ToolsPermissionsManager() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [toolPermissions, setToolPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Filtrar utilizadores que precisam de permissões (excluir admin/gestor)
  const agents = users.filter(u => {
    const userType = u.user_type?.toLowerCase() || '';
    const role = u.role?.toLowerCase() || '';
    return userType !== 'admin' && userType !== 'gestor' && role !== 'admin';
  });

  const filteredAgents = agents.filter(a => {
    if (!searchTerm) return true;
    const name = a.display_name || a.full_name || a.email;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Carregar permissões quando utilizador é selecionado
  useEffect(() => {
    if (selectedUser) {
      const userTools = selectedUser.permissions?.tools || {};
      setToolPermissions(userTools);
      setHasChanges(false);
    }
  }, [selectedUser]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Atualizar diretamente no User
      const currentPermissions = selectedUser.permissions || {};
      const updatedPermissions = {
        ...currentPermissions,
        tools: toolPermissions
      };
      
      return await base44.entities.User.update(selectedUser.id, {
        permissions: updatedPermissions
      });
    },
    onSuccess: () => {
      toast.success("✅ Permissões de ferramentas guardadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setHasChanges(false);
      
      // Atualizar o selectedUser localmente
      setSelectedUser(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          tools: toolPermissions
        }
      }));
    },
    onError: (error) => {
      console.error("Erro ao guardar:", error);
      toast.error("❌ Erro ao guardar permissões");
    }
  });

  const handleToggle = (toolId, enabled) => {
    setToolPermissions(prev => ({ ...prev, [toolId]: enabled }));
    setHasChanges(true);
  };

  const handleSelectAll = (categoryKey, enabled) => {
    const categoryTools = TOOL_CATEGORIES[categoryKey].tools;
    const updates = {};
    categoryTools.forEach(tool => {
      updates[tool.id] = enabled;
    });
    setToolPermissions(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleEnableAll = () => {
    const all = {};
    ALL_TOOLS.forEach(t => { all[t] = true; });
    setToolPermissions(all);
    setHasChanges(true);
  };

  const handleDisableAll = () => {
    const all = {};
    ALL_TOOLS.forEach(t => { all[t] = false; });
    setToolPermissions(all);
    setHasChanges(true);
  };

  const enabledCount = Object.values(toolPermissions).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-700 font-medium">Total de Utilizadores</p>
                <p className="text-2xl font-bold text-blue-900">{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-700 font-medium">Total de Ferramentas</p>
                <p className="text-2xl font-bold text-purple-900">{ALL_TOOLS.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {selectedUser && (
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-700 font-medium">Ferramentas Ativas</p>
                  <p className="text-2xl font-bold text-green-900">{enabledCount}/{ALL_TOOLS.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Selecionar Utilizador
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2 pr-2">
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Nenhum utilizador encontrado</p>
                  </div>
                ) : (
                  filteredAgents.map(agent => {
                    const toolCount = agent.permissions?.tools 
                      ? Object.values(agent.permissions.tools).filter(Boolean).length 
                      : 0;
                    
                    const isSelected = selectedUser?.id === agent.id;
                    
                    return (
                      <motion.button
                        key={agent.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedUser(agent)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-md' 
                            : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${toolCount > 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <p className="font-medium text-slate-900 text-sm">
                            {agent.display_name || agent.full_name}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{agent.email}</p>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${toolCount > 0 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-100'}`}
                        >
                          {toolCount} / {ALL_TOOLS.length} ferramentas
                        </Badge>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Tools Permissions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-base">
                  {selectedUser ? (
                    <span>
                      Ferramentas de <span className="text-blue-600">{selectedUser.display_name || selectedUser.full_name}</span>
                    </span>
                  ) : (
                    'Permissões de Ferramentas'
                  )}
                </CardTitle>
              </div>
              {selectedUser && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                    {enabledCount}/{ALL_TOOLS.length} ativas
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEnableAll}
                    className="h-8"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ativar Todas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisableAll}
                    className="h-8"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Desativar Todas
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={!hasChanges || saveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 h-8"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {saveMutation.isPending ? 'A guardar...' : 'Guardar'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {!selectedUser ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16"
                >
                  <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum utilizador selecionado</h3>
                  <p className="text-slate-500">Selecione um utilizador à esquerda para configurar as permissões de ferramentas</p>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedUser.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4 pr-4">
                      {Object.entries(TOOL_CATEGORIES).map(([key, category]) => {
                        const categoryEnabled = category.tools.filter(t => toolPermissions[t.id]).length;
                        const allEnabled = categoryEnabled === category.tools.length;
                        const percentage = Math.round((categoryEnabled / category.tools.length) * 100);
                        
                        const colorClasses = {
                          purple: "from-purple-50 to-purple-100 border-purple-200",
                          emerald: "from-emerald-50 to-emerald-100 border-emerald-200",
                          blue: "from-blue-50 to-blue-100 border-blue-200",
                          green: "from-green-50 to-green-100 border-green-200",
                          indigo: "from-indigo-50 to-indigo-100 border-indigo-200",
                          amber: "from-amber-50 to-amber-100 border-amber-200",
                          slate: "from-slate-50 to-slate-100 border-slate-200"
                        };
                        
                        return (
                          <Card key={key} className={`bg-gradient-to-r ${colorClasses[category.color]} border-2`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{category.icon}</span>
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{category.name}</h4>
                                    <p className="text-xs text-slate-600">
                                      {categoryEnabled} de {category.tools.length} ativas ({percentage}%)
                                    </p>
                                  </div>
                                </div>
                                <Switch
                                  checked={allEnabled}
                                  onCheckedChange={(checked) => handleSelectAll(key, checked)}
                                />
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {category.tools.map(tool => (
                                  <motion.div
                                    key={tool.id}
                                    whileHover={{ scale: 1.02 }}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                                      toolPermissions[tool.id] 
                                        ? 'bg-white border-green-300 shadow-sm' 
                                        : 'bg-white/50 border-slate-200'
                                    }`}
                                  >
                                    <span className={`text-sm font-medium ${
                                      toolPermissions[tool.id] ? 'text-slate-900' : 'text-slate-500'
                                    }`}>
                                      {tool.name}
                                    </span>
                                    <Switch
                                      checked={toolPermissions[tool.id] || false}
                                      onCheckedChange={(checked) => handleToggle(tool.id, checked)}
                                    />
                                  </motion.div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}