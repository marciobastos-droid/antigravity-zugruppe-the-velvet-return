import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Layout, Wrench, Database, Zap, CheckCircle2, XCircle } from "lucide-react";

export default function AdvancedPermissionsEditor({ user, permissions, onChange, onSave, onCancel }) {
  const [localPermissions, setLocalPermissions] = React.useState(permissions || {
    pages: {},
    tools: {},
    data: {},
    actions: {}
  });

  React.useEffect(() => {
    setLocalPermissions(permissions || {
      pages: {},
      tools: {},
      data: {},
      actions: {}
    });
  }, [permissions]);

  const updatePermission = (category, key, value) => {
    const updated = {
      ...localPermissions,
      [category]: {
        ...(localPermissions[category] || {}),
        [key]: value
      }
    };
    setLocalPermissions(updated);
    onChange?.(updated);
  };

  const permissionCategories = {
    pages: {
      title: "Acesso a Páginas",
      icon: Layout,
      color: "blue",
      items: [
        { key: "dashboard", label: "Dashboard", description: "Visualizar dashboard e estatísticas" },
        { key: "browse", label: "Navegação de Imóveis", description: "Ver catálogo de imóveis" },
        { key: "my_listings", label: "Meus Imóveis", description: "Gerir imóveis próprios" },
        { key: "crm", label: "CRM", description: "Acesso ao sistema CRM" },
        { key: "tools", label: "Ferramentas", description: "Acesso à página de ferramentas" },
        { key: "team", label: "Equipa", description: "Gestão de equipa" },
        { key: "franchising", label: "Franchising", description: "Gestão de franchising" },
        { key: "user_management", label: "Gestão de Utilizadores", description: "Administrar utilizadores" },
        { key: "contracts", label: "Contratos", description: "Visualizar e gerir contratos" },
        { key: "documents", label: "Documentos", description: "Acesso a documentos" },
        { key: "marketing", label: "Marketing", description: "Campanhas e marketing" },
        { key: "analytics", label: "Analytics", description: "Analytics e relatórios avançados" }
      ]
    },
    tools: {
      title: "Ferramentas",
      icon: Wrench,
      color: "purple",
      items: [
        { key: "ai_description", label: "IA - Descrições", description: "Gerar descrições com IA" },
        { key: "ai_pricing", label: "IA - Pricing", description: "Análise de preços com IA" },
        { key: "ai_matching", label: "IA - Matching", description: "Matching automático de clientes" },
        { key: "bulk_import", label: "Importação em Massa", description: "Importar dados via CSV/Excel" },
        { key: "bulk_export", label: "Exportação em Massa", description: "Exportar dados" },
        { key: "email_campaigns", label: "Campanhas Email", description: "Criar e enviar campanhas" },
        { key: "facebook_sync", label: "Sync Facebook", description: "Sincronização com Facebook Ads" },
        { key: "crm_sync", label: "Sync CRM", description: "Sincronização com CRMs externos" },
        { key: "portal_sync", label: "Sync Portais", description: "Publicação em portais" },
        { key: "invoicing", label: "Faturação", description: "Criar e gerir faturas" },
        { key: "commissions", label: "Comissões", description: "Gerir comissões" },
        { key: "reports", label: "Relatórios", description: "Gerar relatórios personalizados" }
      ]
    },
    data: {
      title: "Acesso a Dados",
      icon: Database,
      color: "green",
      items: [
        { key: "view_all_properties", label: "Ver Todos Imóveis", description: "Acesso a todos os imóveis da equipa" },
        { key: "view_all_leads", label: "Ver Todos Leads", description: "Acesso a todos os leads" },
        { key: "view_all_clients", label: "Ver Todos Clientes", description: "Acesso a toda base de clientes" },
        { key: "view_all_contracts", label: "Ver Todos Contratos", description: "Acesso a todos os contratos" },
        { key: "view_team_data", label: "Ver Dados Equipa", description: "Ver performance da equipa" },
        { key: "export_data", label: "Exportar Dados", description: "Exportar dados para Excel/CSV" },
        { key: "delete_records", label: "Eliminar Registos", description: "Permissão para eliminar dados" }
      ]
    },
    actions: {
      title: "Ações Administrativas",
      icon: Zap,
      color: "amber",
      items: [
        { key: "assign_leads", label: "Atribuir Leads", description: "Atribuir leads a agentes" },
        { key: "manage_team", label: "Gerir Equipa", description: "Administrar membros da equipa" },
        { key: "configure_integrations", label: "Configurar Integrações", description: "Gerir integrações externas" },
        { key: "manage_permissions", label: "Gerir Permissões", description: "Definir permissões de utilizadores" },
        { key: "invite_users", label: "Convidar Utilizadores", description: "Adicionar novos membros" },
        { key: "approve_contracts", label: "Aprovar Contratos", description: "Aprovar e assinar contratos" },
        { key: "manage_commissions", label: "Gerir Comissões", description: "Calcular e distribuir comissões" }
      ]
    }
  };

  const countEnabled = (category) => {
    const perms = localPermissions[category] || {};
    return Object.values(perms).filter(v => v === true).length;
  };

  const enableAll = (category) => {
    const allEnabled = {};
    permissionCategories[category].items.forEach(item => {
      allEnabled[item.key] = true;
    });
    setLocalPermissions({
      ...localPermissions,
      [category]: allEnabled
    });
  };

  const disableAll = (category) => {
    const allDisabled = {};
    permissionCategories[category].items.forEach(item => {
      allDisabled[item.key] = false;
    });
    setLocalPermissions({
      ...localPermissions,
      [category]: allDisabled
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-purple-900 mb-1">Permissões Granulares</h3>
            <p className="text-sm text-purple-700">
              Configure permissões detalhadas para <strong>{user.display_name || user.full_name}</strong>.
              As permissões serão aplicadas imediatamente após guardar.
            </p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline" className="bg-white">
                Tipo: {user.user_type === 'admin' ? '👑 Admin' : 
                       user.user_type === 'gestor' ? '📊 Gestor' : 
                       user.user_type === 'consultant' ? '🏢 Consultor' : '🏠 Agente'}
              </Badge>
              <Badge variant="outline" className="bg-white">
                Role: {user.role || 'user'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pages" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pages" className="flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Páginas</span>
            <Badge variant="secondary" className="ml-1 text-xs">{countEnabled('pages')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ferramentas</span>
            <Badge variant="secondary" className="ml-1 text-xs">{countEnabled('tools')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dados</span>
            <Badge variant="secondary" className="ml-1 text-xs">{countEnabled('data')}</Badge>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ações</span>
            <Badge variant="secondary" className="ml-1 text-xs">{countEnabled('actions')}</Badge>
          </TabsTrigger>
        </TabsList>

        {Object.entries(permissionCategories).map(([category, config]) => {
          const Icon = config.icon;
          const colorClasses = {
            blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
            purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-900",
            green: "from-green-50 to-green-100 border-green-200 text-green-900",
            amber: "from-amber-50 to-amber-100 border-amber-200 text-amber-900"
          };

          return (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card className={`bg-gradient-to-r ${colorClasses[config.color]} border`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="w-5 h-5" />
                      {config.title}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => enableAll(category)}
                        className="h-7 text-xs bg-white"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ativar Todas
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => disableAll(category)}
                        className="h-7 text-xs bg-white"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Desativar Todas
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {config.items.map((item) => {
                      const isEnabled = localPermissions[category]?.[item.key] === true;
                      return (
                        <div 
                          key={item.key} 
                          className="flex items-start justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <Label className="font-medium text-slate-900 cursor-pointer block mb-1">
                              {item.label}
                            </Label>
                            <p className="text-sm text-slate-600">{item.description}</p>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => updatePermission(category, item.key, checked)}
                            className="flex-shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white p-4 -mx-4 shadow-lg">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={() => onSave(localPermissions)} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          <Shield className="w-4 h-4 mr-2" />
          Guardar Permissões
        </Button>
      </div>
    </div>
  );
}