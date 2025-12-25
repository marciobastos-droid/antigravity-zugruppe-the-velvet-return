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
import { Layers, Plus, Edit, Trash2, Users, CheckCircle2, XCircle, Copy, Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
    mutationFn: (data) => base44.entities.PermissionTemplate.create(data),
    onSuccess: () => {
      toast.success("Template criado com sucesso!");
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
                    {template.template_type !== 'system' && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingTemplate(template);
                            setCreateDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
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
                      </div>
                    )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template de Permissões'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
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

            <div className="pt-4 border-t">
              <p className="text-sm text-slate-600 mb-3">
                💡 <strong>Dica:</strong> Configure as permissões através da interface principal de gestão de permissões após criar o template.
              </p>
            </div>

            <div className="flex gap-3">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}