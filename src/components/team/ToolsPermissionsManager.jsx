import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, User, Save, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Tool categories and their tools - MUST match Tools page exactly
const TOOL_CATEGORIES = {
  marketing: {
    name: "Marketing Digital",
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
      { id: "imageExtractor", name: "Extrator de Imagens Web" },
      { id: "excelImport", name: "Excel & JSON" },
      { id: "crmIntegrations", name: "CRM Externo" }
    ]
  },
  leads: {
    name: "Gestão de Leads",
    tools: [
      { id: "leadManagement", name: "Origens & Scoring" },
      { id: "leadNurturing", name: "Nurturing Automático" }
    ]
  },
  importExport: {
    name: "Importações e Exportações",
    tools: [
      { id: "importProperties", name: "Importar Imóveis" },
      { id: "importLeads", name: "Importar Leads" },
      { id: "importContacts", name: "Importar Contactos" },
      { id: "importOpportunities", name: "Importar Oportunidades" },
      { id: "importInvoices", name: "Importar Faturas" },
      { id: "exportProperties", name: "Exportar Ficheiros" },
      { id: "reportsExporter", name: "Relatórios" },
      { id: "jsonProcessor", name: "Processador JSON (IA)" },
      { id: "propertyFeeds", name: "Feeds de Imóveis" },
      { id: "externalSync", name: "Sincronização Externa" },
      { id: "casafariSync", name: "Casafari Sync" }
    ]
  },
  utilities: {
    name: "Utilitários",
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
    tools: [
      { id: "aiMatching", name: "Motor de Matching IA" },
      { id: "autoMatching", name: "Matching Automático" },
      { id: "autoMatchingDashboard", name: "Alertas de Matching" }
    ]
  },
  market: {
    name: "Mercado",
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
    tools: [
      { id: "commissions", name: "Gestão de Comissões" },
      { id: "invoices", name: "Gestão de Faturas" }
    ]
  },
  investor: {
    name: "Secção de Investidores",
    tools: [
      { id: "investorKeys", name: "Chaves de Acesso" },
      { id: "investorProperties", name: "Imóveis Publicados" }
    ]
  },
  settings: {
    name: "Definições e Conteúdos",
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

// Get all tool IDs
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

  const { data: permissions = [] } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: () => base44.entities.UserPermission.list()
  });

  // Filter users who need tool permissions (not admin/gestor who have full access)
  const agents = users.filter(u => {
    const userType = u.user_type?.toLowerCase() || '';
    const role = u.role?.toLowerCase() || '';
    // Exclude admins and gestores who have full access
    return userType !== 'admin' && userType !== 'gestor' && role !== 'admin';
  });

  const filteredAgents = agents.filter(a => {
    if (!searchTerm) return true;
    const name = a.display_name || a.full_name || a.email;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Load permissions when user is selected
  useEffect(() => {
    if (selectedUser) {
      const userPerm = permissions.find(p => p.user_email === selectedUser.email);
      if (userPerm?.permissions?.tools) {
        setToolPermissions(userPerm.permissions.tools);
      } else {
        // Default permissions for new users
        const defaults = {};
        ALL_TOOLS.forEach(toolId => {
          defaults[toolId] = getDefaultToolPermission(toolId);
        });
        setToolPermissions(defaults);
      }
      setHasChanges(false);
    }
  }, [selectedUser, permissions]);

  const getDefaultToolPermission = (toolId) => {
    // Default tools available to agents
    const defaultEnabled = [
      'importProperties', 'importLeads', 'importContacts', 'socialMedia',
      'duplicateChecker', 'inconsistencyChecker', 'emailHub', 'video',
      'description', 'listingOptimizer', 'calendar', 'aiMatching',
      'pricing', 'creditSimulator', 'documents'
    ];
    return defaultEnabled.includes(toolId);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingPerm = permissions.find(p => p.user_email === selectedUser.email);
      
      // Construir objeto completo de permissões preservando todas as categorias existentes
      const fullPermissions = existingPerm?.permissions ? { ...existingPerm.permissions } : {};
      
      // Atualizar apenas a categoria tools
      fullPermissions.tools = { ...toolPermissions };
      
      if (existingPerm) {
        return await base44.entities.UserPermission.update(existingPerm.id, {
          permissions: fullPermissions
        });
      } else {
        return await base44.entities.UserPermission.create({
          user_email: selectedUser.email,
          permissions: fullPermissions,
          role_template: 'custom'
        });
      }
    },
    onSuccess: () => {
      toast.success("Permissões de ferramentas guardadas");
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      setHasChanges(false);
    },
    onError: (error) => {
      console.error("Erro ao guardar:", error);
      toast.error("Erro ao guardar permissões");
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Agent List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Agentes
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-2">
              {filteredAgents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum agente encontrado</p>
              ) : (
                filteredAgents.map(agent => {
                  const userPerm = permissions.find(p => p.user_email === agent.email);
                  const toolCount = userPerm?.permissions?.tools 
                    ? Object.values(userPerm.permissions.tools).filter(Boolean).length 
                    : Object.values(ALL_TOOLS.reduce((acc, t) => ({ ...acc, [t]: getDefaultToolPermission(t) }), {})).filter(Boolean).length;
                  
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedUser(agent)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedUser?.id === agent.id 
                          ? 'bg-blue-50 border-2 border-blue-300' 
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                      }`}
                    >
                      <p className="font-medium text-slate-900">
                        {agent.display_name || agent.full_name || agent.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {toolCount}/{ALL_TOOLS.length} ferramentas
                        </Badge>
                      </div>
                    </button>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Permissões de Ferramentas
              {selectedUser && (
                <Badge variant="secondary">
                  {selectedUser.display_name || selectedUser.full_name}
                </Badge>
              )}
            </CardTitle>
            {selectedUser && (
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {enabledCount}/{ALL_TOOLS.length} ativas
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnableAll}
                >
                  Ativar Todas
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisableAll}
                >
                  Desativar Todas
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!hasChanges || saveMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedUser ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Selecione um agente para configurar as permissões</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6 pr-4">
                {Object.entries(TOOL_CATEGORIES).map(([key, category]) => {
                  const categoryEnabled = category.tools.filter(t => toolPermissions[t.id]).length;
                  const allEnabled = categoryEnabled === category.tools.length;
                  
                  return (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900">{category.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {categoryEnabled}/{category.tools.length}
                          </span>
                          <Switch
                            checked={allEnabled}
                            onCheckedChange={(checked) => handleSelectAll(key, checked)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {category.tools.map(tool => (
                          <div 
                            key={tool.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              toolPermissions[tool.id] ? 'bg-green-50' : 'bg-slate-50'
                            }`}
                          >
                            <span className="text-sm text-slate-700">{tool.name}</span>
                            <Switch
                              checked={toolPermissions[tool.id] || false}
                              onCheckedChange={(checked) => handleToggle(tool.id, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}