import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Plus, Edit, Trash2, Users, CheckCircle2, XCircle, Copy, Star, Megaphone, Target, Download, Sparkles, Brain, TrendingUp, DollarSign, Lock, Folder } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TOOL_CATEGORIES = [
  {
    id: "marketing",
    name: "Marketing Digital",
    icon: Megaphone,
    color: "purple",
    tools: [
      { id: "marketingHub", name: "Hub de Marketing" },
      { id: "marketingCampaigns", name: "Campanhas Marketing" },
      { id: "socialMedia", name: "Posts Sociais" },
      { id: "socialAdCreator", name: "Criador de Anúncios" },
      { id: "apiPublish", name: "Publicação API" },
      { id: "apiIntegrations", name: "Integrações API" },
      { id: "portalIntegrations", name: "Portais Imobiliários" },
      { id: "whatsapp", name: "WhatsApp Business" },
      { id: "integrations", name: "Integrações Externas" },
      { id: "imageExtractor", name: "Extrator de Imagens" },
      { id: "excelImport", name: "Excel & JSON" },
      { id: "crmIntegrations", name: "CRM Externo" },
      { id: "facebookCampaigns", name: "Facebook Ads" },
      { id: "facebookLeads", name: "Leads Facebook" },
      { id: "facebookForms", name: "Formulários Facebook" }
    ]
  },
  {
    id: "leads",
    name: "Gestão de Leads",
    icon: Target,
    color: "emerald",
    tools: [
      { id: "leadManagement", name: "Origens & Scoring" },
      { id: "leadNurturing", name: "Nurturing Automático" }
    ]
  },
  {
    id: "importexport",
    name: "Importações e Exportações",
    icon: Download,
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
  {
    id: "utilities",
    name: "Utilitários",
    icon: Sparkles,
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
  {
    id: "matching",
    name: "Matching com IA",
    icon: Brain,
    color: "indigo",
    tools: [
      { id: "aiMatching", name: "Motor de Matching IA" },
      { id: "autoMatching", name: "Matching Automático" },
      { id: "autoMatchingDashboard", name: "Alertas de Matching" }
    ]
  },
  {
    id: "market",
    name: "Mercado",
    icon: TrendingUp,
    color: "amber",
    tools: [
      { id: "marketIntelligence", name: "Inteligência de Mercado" },
      { id: "propertyPerformance", name: "Performance de Imóveis" },
      { id: "pricing", name: "Sugestor de Preços" },
      { id: "creditSimulator", name: "Simulador de Crédito" },
      { id: "deedCosts", name: "Custos de Escritura" }
    ]
  },
  {
    id: "finance",
    name: "Finanças",
    icon: DollarSign,
    color: "green",
    tools: [
      { id: "commissions", name: "Gestão de Comissões" },
      { id: "invoices", name: "Gestão de Faturas" }
    ]
  },
  {
    id: "investors",
    name: "Secção de Investidores",
    icon: Lock,
    color: "amber",
    tools: [
      { id: "investorKeys", name: "Chaves de Acesso" },
      { id: "investorProperties", name: "Imóveis Publicados" }
    ]
  },
  {
    id: "settings",
    name: "Definições e Conteúdos",
    icon: Folder,
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
];

const DEFAULT_TEMPLATES = [
  {
    name: "Consultor Completo",
    description: "Acesso a todas as ferramentas de consultoria",
    icon: "👔",
    color: "blue",
    template_type: "system",
    permissions: {
      pages: { dashboard: true, browse: true, my_listings: true, crm: true, tools: true, contracts: true, documents: true },
      tools: {
        facebookLeads: true, importProperties: true, importLeads: true, importContacts: true,
        description: true, pricing: true, calendar: true, emailHub: true,
        aiMatching: true, duplicateChecker: true, listingOptimizer: true,
        socialMedia: true, exportProperties: true, reportsExporter: true
      },
      data: { view_all_properties: true, view_all_leads: true },
      actions: {}
    }
  },
  {
    name: "Agente Básico",
    description: "Ferramentas essenciais para agentes",
    icon: "🏠",
    color: "green",
    template_type: "system",
    permissions: {
      pages: { dashboard: true, browse: true, my_listings: true, crm: true, tools: true, contracts: true, documents: true },
      tools: { description: true, calendar: true, emailHub: true },
      data: {},
      actions: {}
    }
  },
  {
    name: "Marketing Specialist",
    description: "Foco em marketing e campanhas",
    icon: "📢",
    color: "purple",
    template_type: "system",
    permissions: {
      pages: { dashboard: true, browse: true, tools: true, marketing: true },
      tools: {
        marketingHub: true, marketingCampaigns: true, socialMedia: true, socialAdCreator: true,
        facebookCampaigns: true, facebookLeads: true, facebookForms: true,
        imageExtractor: true, exportProperties: true
      },
      data: { view_all_properties: true, export_data: true },
      actions: {}
    }
  }
];

export default function PermissionTemplatesManager() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    icon: "📋",
    color: "blue",
    permissions: { pages: {}, tools: {}, data: {}, actions: {} }
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['permissionTemplates'],
    queryFn: () => base44.entities.PermissionTemplate.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (editingTemplate) {
        return base44.entities.PermissionTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.PermissionTemplate.create(data);
    },
    onSuccess: () => {
      toast.success(editingTemplate ? "Template atualizado!" : "Template criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['permissionTemplates'] });
      setCreateDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PermissionTemplate.delete(id),
    onSuccess: () => {
      toast.success("Template eliminado");
      queryClient.invalidateQueries({ queryKey: ['permissionTemplates'] });
    }
  });

  const initializeDefaultTemplates = async () => {
    for (const template of DEFAULT_TEMPLATES) {
      const exists = templates.find(t => t.name === template.name && t.template_type === 'system');
      if (!exists) {
        await createMutation.mutateAsync(template);
      }
    }
    toast.success("Templates de sistema inicializados!");
  };

  const resetForm = () => {
    setNewTemplate({
      name: "",
      description: "",
      icon: "📋",
      color: "blue",
      permissions: { pages: {}, tools: {}, data: {}, actions: {} }
    });
    setEditingTemplate(null);
  };

  const getUsersWithTemplate = (templateId) => {
    return users.filter(u => u.template_id === templateId).length;
  };

  const toggleTool = (toolId) => {
    setNewTemplate(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        tools: {
          ...prev.permissions.tools,
          [toolId]: !prev.permissions.tools?.[toolId]
        }
      }
    }));
  };

  const toggleCategory = (category, enable) => {
    const updates = {};
    category.tools.forEach(tool => {
      updates[tool.id] = enable;
    });
    setNewTemplate(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        tools: {
          ...prev.permissions.tools,
          ...updates
        }
      }
    }));
  };

  const isCategoryEnabled = (category) => {
    return category.tools.every(tool => newTemplate.permissions?.tools?.[tool.id] === true);
  };

  const isCategoryPartial = (category) => {
    const enabledCount = category.tools.filter(tool => newTemplate.permissions?.tools?.[tool.id] === true).length;
    return enabledCount > 0 && enabledCount < category.tools.length;
  };

  const colorClasses = {
    blue: "from-blue-50 to-blue-100 border-blue-300",
    purple: "from-purple-50 to-purple-100 border-purple-300",
    green: "from-green-50 to-green-100 border-green-300",
    amber: "from-amber-50 to-amber-100 border-amber-300",
    red: "from-red-50 to-red-100 border-red-300",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-300"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-7 h-7 text-purple-600" />
            Templates de Permissões
          </h2>
          <p className="text-slate-600 mt-1">
            Crie templates reutilizáveis de permissões para facilitar a gestão de utilizadores
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button onClick={initializeDefaultTemplates} variant="outline">
              <Star className="w-4 h-4 mr-2" />
              Inicializar Templates
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => {
          const userCount = getUsersWithTemplate(template.id);
          const toolsCount = Object.values(template.permissions?.tools || {}).filter(Boolean).length;
          
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className={`bg-gradient-to-br ${colorClasses[template.color] || colorClasses.blue} border-2`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{template.icon || "📋"}</span>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.template_type === 'system' && (
                          <Badge variant="outline" className="text-xs mt-1">Sistema</Badge>
                        )}
                        </div>
                        </div>
                        <div className="flex gap-1">
                        <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingTemplate(template);
                          setNewTemplate({
                            name: template.name,
                            description: template.description,
                            icon: template.icon || "📋",
                            color: template.color || "blue",
                            permissions: template.permissions || { pages: {}, tools: {}, data: {}, actions: {} }
                          });
                          setCreateDialogOpen(true);
                        }}
                        >
                        <Edit className="w-3 h-3" />
                        </Button>
                        {template.template_type !== 'system' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600"
                          onClick={() => {
                            if (confirm(`Eliminar template "${template.name}"?`)) {
                              deleteMutation.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        )}
                        </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 mb-4">{template.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Ferramentas:</span>
                      <Badge variant="secondary">{toolsCount} ativas</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Utilizadores:</span>
                      <Badge variant="secondary">
                        <Users className="w-3 h-3 mr-1" />
                        {userCount}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template de Permissões'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informação Básica</TabsTrigger>
              <TabsTrigger value="tools">Ferramentas ({Object.values(newTemplate.permissions?.tools || {}).filter(Boolean).length})</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div>
                <Label>Nome do Template</Label>
                <Input
                  placeholder="Ex: Agente Avançado"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva para que serve este template..."
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ícone (emoji)</Label>
                  <Input
                    placeholder="📋"
                    value={newTemplate.icon}
                    onChange={(e) => setNewTemplate({ ...newTemplate, icon: e.target.value })}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <select
                    value={newTemplate.color}
                    onChange={(e) => setNewTemplate({ ...newTemplate, color: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="blue">Azul</option>
                    <option value="purple">Roxo</option>
                    <option value="green">Verde</option>
                    <option value="amber">Âmbar</option>
                    <option value="red">Vermelho</option>
                    <option value="indigo">Índigo</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tools">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {TOOL_CATEGORIES.map(category => {
                    const CategoryIcon = category.icon;
                    const enabled = isCategoryEnabled(category);
                    const partial = isCategoryPartial(category);
                    const enabledCount = category.tools.filter(t => newTemplate.permissions?.tools?.[t.id]).length;

                    return (
                      <Card key={category.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon className={`w-5 h-5 text-${category.color}-600`} />
                              <div>
                                <CardTitle className="text-sm">{category.name}</CardTitle>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {enabledCount}/{category.tools.length} ferramentas ativas
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {partial && (
                                <Badge variant="outline" className="text-xs">Parcial</Badge>
                              )}
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => toggleCategory(category, checked)}
                              />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2">
                            {category.tools.map(tool => (
                              <div
                                key={tool.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                                  newTemplate.permissions?.tools?.[tool.id]
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <span className="text-sm text-slate-700">{tool.name}</span>
                                <Switch
                                  checked={newTemplate.permissions?.tools?.[tool.id] === true}
                                  onCheckedChange={() => toggleTool(tool.id)}
                                  className="scale-75"
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate(newTemplate)}
              disabled={!newTemplate.name || createMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {editingTemplate ? 'Atualizar' : 'Criar'} Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}