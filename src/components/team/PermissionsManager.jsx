import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Building2, Users, FileText, BarChart3, 
  Settings, Save, RotateCcw, ChevronDown, ChevronRight, Wrench
} from "lucide-react";
import { toast } from "sonner";
import ToolsPermissionsManager from "./ToolsPermissionsManager";

// Permission templates by role
const ROLE_TEMPLATES = {
  admin: {
    properties: { view_all: true, view_own: true, create: true, edit_all: true, edit_own: true, delete: true, export: true },
    leads: { view_all: true, view_own: true, create: true, edit_all: true, edit_own: true, delete: true, reassign: true, export: true },
    contacts: { view_all: true, view_own: true, create: true, edit_all: true, edit_own: true, delete: true },
    tasks: { view_all: true, view_own: true, create: true, assign_others: true, edit_all: true, edit_own: true },
    reports: { view_team: true, view_own: true, export: true },
    team: { view_members: true, manage_members: true, view_performance: true },
    settings: { manage_templates: true, manage_integrations: true, manage_tags: true },
    pages: { dashboard: true, browse: true, my_listings: true, crm: true, tools: true, team: true }
  },
  gestor: {
    properties: { view_all: true, view_own: true, create: true, edit_all: true, edit_own: true, delete: false, export: true },
    leads: { view_all: true, view_own: true, create: true, edit_all: true, edit_own: true, delete: false, reassign: true, export: true },
    contacts: { view_all: true, view_own: true, create: true, edit_all: true, edit_own: true, delete: false },
    tasks: { view_all: true, view_own: true, create: true, assign_others: true, edit_all: true, edit_own: true },
    reports: { view_team: true, view_own: true, export: true },
    team: { view_members: true, manage_members: false, view_performance: true },
    settings: { manage_templates: true, manage_integrations: false, manage_tags: true },
    pages: { dashboard: true, browse: true, my_listings: true, crm: true, tools: true, team: true }
  },
  agente: {
    properties: { view_all: true, view_own: true, create: true, edit_all: false, edit_own: true, delete: false, export: false },
    leads: { view_all: false, view_own: true, create: true, edit_all: false, edit_own: true, delete: false, reassign: false, export: false },
    contacts: { view_all: false, view_own: true, create: true, edit_all: false, edit_own: true, delete: false },
    tasks: { view_all: false, view_own: true, create: true, assign_others: false, edit_all: false, edit_own: true },
    reports: { view_team: false, view_own: true, export: false },
    team: { view_members: true, manage_members: false, view_performance: false },
    settings: { manage_templates: false, manage_integrations: false, manage_tags: false },
    pages: { dashboard: true, browse: true, my_listings: true, crm: true, tools: false, team: false }
  },
  assistente: {
    properties: { view_all: true, view_own: true, create: false, edit_all: false, edit_own: false, delete: false, export: false },
    leads: { view_all: true, view_own: true, create: true, edit_all: false, edit_own: true, delete: false, reassign: false, export: false },
    contacts: { view_all: true, view_own: true, create: true, edit_all: false, edit_own: true, delete: false },
    tasks: { view_all: false, view_own: true, create: true, assign_others: false, edit_all: false, edit_own: true },
    reports: { view_team: false, view_own: true, export: false },
    team: { view_members: true, manage_members: false, view_performance: false },
    settings: { manage_templates: false, manage_integrations: false, manage_tags: false },
    pages: { dashboard: true, browse: true, my_listings: false, crm: true, tools: false, team: false }
  }
};

const PERMISSION_LABELS = {
  properties: {
    label: "Imóveis",
    icon: Building2,
    permissions: {
      view_all: "Ver todos",
      view_own: "Ver próprios",
      create: "Criar",
      edit_all: "Editar todos",
      edit_own: "Editar próprios",
      delete: "Eliminar",
      export: "Exportar"
    }
  },
  leads: {
    label: "Leads/Oportunidades",
    icon: Users,
    permissions: {
      view_all: "Ver todos",
      view_own: "Ver próprios",
      create: "Criar",
      edit_all: "Editar todos",
      edit_own: "Editar próprios",
      delete: "Eliminar",
      reassign: "Reatribuir",
      export: "Exportar"
    }
  },
  contacts: {
    label: "Contactos",
    icon: Users,
    permissions: {
      view_all: "Ver todos",
      view_own: "Ver próprios",
      create: "Criar",
      edit_all: "Editar todos",
      edit_own: "Editar próprios",
      delete: "Eliminar"
    }
  },
  tasks: {
    label: "Tarefas",
    icon: FileText,
    permissions: {
      view_all: "Ver todas",
      view_own: "Ver próprias",
      create: "Criar",
      assign_others: "Atribuir a outros",
      edit_all: "Editar todas",
      edit_own: "Editar próprias"
    }
  },
  reports: {
    label: "Relatórios",
    icon: BarChart3,
    permissions: {
      view_team: "Ver equipa",
      view_own: "Ver próprios",
      export: "Exportar"
    }
  },
  team: {
    label: "Equipa",
    icon: Users,
    permissions: {
      view_members: "Ver membros",
      manage_members: "Gerir membros",
      view_performance: "Ver performance"
    }
  },
  settings: {
    label: "Configurações",
    icon: Settings,
    permissions: {
      manage_templates: "Gerir templates",
      manage_integrations: "Gerir integrações",
      manage_tags: "Gerir etiquetas"
    }
  },
  pages: {
    label: "Páginas",
    icon: FileText,
    permissions: {
      dashboard: "Dashboard",
      browse: "Navegar",
      my_listings: "Imóveis",
      crm: "CRM",
      tools: "Ferramentas",
      team: "Equipa"
    }
  }
};

export default function PermissionsManager() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [expandedSections, setExpandedSections] = useState(['properties', 'leads']);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: ['userPermissions'],
    queryFn: () => base44.entities.UserPermission.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = userPermissions.find(p => p.user_email === selectedUser.email);
      if (existing) {
        return await base44.entities.UserPermission.update(existing.id, data);
      } else {
        return await base44.entities.UserPermission.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      toast.success("Permissões guardadas com sucesso");
      setHasChanges(false);
    },
    onError: (error) => {
      console.error("Erro ao guardar permissões:", error);
      toast.error("Erro ao guardar permissões");
    }
  });

  useEffect(() => {
    if (selectedUser) {
      const existingPerm = userPermissions.find(p => p.user_email === selectedUser.email);
      if (existingPerm?.permissions) {
        setPermissions(existingPerm.permissions);
      } else {
        // Apply default based on user role
        const roleType = selectedUser.user_type || selectedUser.role || 'agente';
        const template = ROLE_TEMPLATES[roleType] || ROLE_TEMPLATES.agente;
        setPermissions(template);
      }
      setHasChanges(false);
    }
  }, [selectedUser, userPermissions]);

  const handlePermissionChange = (category, permission, value) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: value
      }
    }));
    setHasChanges(true);
  };

  const applyTemplate = (templateName) => {
    const template = ROLE_TEMPLATES[templateName];
    if (template) {
      setPermissions(template);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (!selectedUser) return;
    
    // Garantir que todas as categorias de permissões estão preenchidas
    const fullPermissions = {};
    Object.keys(PERMISSION_LABELS).forEach(category => {
      fullPermissions[category] = {};
      Object.keys(PERMISSION_LABELS[category].permissions).forEach(perm => {
        fullPermissions[category][perm] = permissions[category]?.[perm] || false;
      });
    });
    
    saveMutation.mutate({
      user_email: selectedUser.email,
      permissions: fullPermissions,
      role_template: 'custom'
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Gestão de Permissões
          </h2>
          <p className="text-slate-600">Configure permissões granulares por utilizador</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Permissões Gerais
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Ferramentas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="mt-6">
          <ToolsPermissionsManager />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
      <div className="grid lg:grid-cols-4 gap-6">
        {/* User List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Utilizadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map(user => (
                <button
                  key={user.email}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedUser?.email === user.email
                      ? 'bg-blue-100 border-blue-300 border'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-medium text-sm">{user.display_name || user.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {user.user_type || user.role}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Editor */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedUser ? `Permissões: ${selectedUser.display_name || selectedUser.full_name}` : 'Selecione um utilizador'}
              </CardTitle>
              {selectedUser && (
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              )}
            </div>
            {selectedUser && (
              <div className="flex items-center gap-2">
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Aplicar template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="agente">Agente</SelectItem>
                    <SelectItem value="assistente">Assistente</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleSave} 
                  disabled={saveMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "A guardar..." : "Guardar"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-4">
                {Object.entries(PERMISSION_LABELS).map(([category, config]) => {
                  const Icon = config.icon;
                  const isExpanded = expandedSections.includes(category);
                  
                  return (
                    <div key={category} className="border rounded-lg">
                      <button
                        onClick={() => toggleSection(category)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-slate-600" />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t bg-slate-50">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Object.entries(config.permissions).map(([perm, label]) => (
                              <div key={perm} className="flex items-center gap-2">
                                <Switch
                                  id={`${category}-${perm}`}
                                  checked={permissions[category]?.[perm] || false}
                                  onCheckedChange={(checked) => handlePermissionChange(category, perm, checked)}
                                />
                                <Label htmlFor={`${category}-${perm}`} className="text-sm cursor-pointer">
                                  {label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Selecione um utilizador para configurar as permissões</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}