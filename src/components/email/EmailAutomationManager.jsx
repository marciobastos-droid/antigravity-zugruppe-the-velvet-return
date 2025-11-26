import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, Edit, Trash2, Zap, Play, Pause, Clock, Mail, 
  UserPlus, TrendingUp, AlertCircle, RefreshCw, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const triggerConfig = {
  new_client: { label: "Novo Contacto", icon: UserPlus, color: "bg-green-100 text-green-800" },
  new_opportunity: { label: "Nova Oportunidade", icon: TrendingUp, color: "bg-blue-100 text-blue-800" },
  opportunity_status_change: { label: "Mudança de Estado", icon: RefreshCw, color: "bg-purple-100 text-purple-800" },
  opportunity_qualified: { label: "Oportunidade Qualificada", icon: CheckCircle2, color: "bg-amber-100 text-amber-800" },
  client_inactive: { label: "Cliente Inativo", icon: AlertCircle, color: "bg-red-100 text-red-800" },
  follow_up_reminder: { label: "Lembrete Follow-up", icon: Clock, color: "bg-cyan-100 text-cyan-800" },
  manual: { label: "Manual", icon: Play, color: "bg-slate-100 text-slate-800" }
};

const opportunityStatuses = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contactado" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta" },
  { value: "negotiation", label: "Negociação" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" }
];

export default function EmailAutomationManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "new_client",
    trigger_conditions: {},
    template_id: "",
    delay_minutes: 0,
    is_active: true
  });

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['emailAutomations'],
    queryFn: () => base44.entities.EmailAutomation.list('-created_date')
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailAutomation.create(data),
    onSuccess: () => {
      toast.success("Automação criada");
      queryClient.invalidateQueries({ queryKey: ['emailAutomations'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailAutomation.update(id, data),
    onSuccess: () => {
      toast.success("Automação atualizada");
      queryClient.invalidateQueries({ queryKey: ['emailAutomations'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailAutomation.delete(id),
    onSuccess: () => {
      toast.success("Automação eliminada");
      queryClient.invalidateQueries({ queryKey: ['emailAutomations'] });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.EmailAutomation.update(id, { is_active }),
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? "Automação ativada" : "Automação desativada");
      queryClient.invalidateQueries({ queryKey: ['emailAutomations'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      trigger_type: "new_client",
      trigger_conditions: {},
      template_id: "",
      delay_minutes: 0,
      is_active: true
    });
    setEditingAutomation(null);
    setDialogOpen(false);
  };

  const handleEdit = (automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      description: automation.description || "",
      trigger_type: automation.trigger_type,
      trigger_conditions: automation.trigger_conditions || {},
      template_id: automation.template_id,
      delay_minutes: automation.delay_minutes || 0,
      is_active: automation.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAutomation) {
      updateMutation.mutate({ id: editingAutomation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getTemplateById = (id) => templates.find(t => t.id === id);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Automações de Email</h3>
          <p className="text-sm text-slate-600">
            {automations.filter(a => a.is_active).length} automações ativas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAutomation ? "Editar Automação" : "Nova Automação"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Nome da Automação *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Boas-vindas a novos clientes"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição opcional da automação..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Gatilho *</Label>
                <Select 
                  value={formData.trigger_type} 
                  onValueChange={(v) => setFormData({...formData, trigger_type: v, trigger_conditions: {}})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional fields based on trigger */}
              {formData.trigger_type === "opportunity_status_change" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <Label>Estado Anterior</Label>
                    <Select 
                      value={formData.trigger_conditions.status_from || ""} 
                      onValueChange={(v) => setFormData({
                        ...formData, 
                        trigger_conditions: {...formData.trigger_conditions, status_from: v}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Qualquer</SelectItem>
                        {opportunityStatuses.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Novo Estado *</Label>
                    <Select 
                      value={formData.trigger_conditions.status_to || ""} 
                      onValueChange={(v) => setFormData({
                        ...formData, 
                        trigger_conditions: {...formData.trigger_conditions, status_to: v}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {opportunityStatuses.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formData.trigger_type === "client_inactive" && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <Label>Dias sem Contacto</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.trigger_conditions.days_inactive || 30}
                    onChange={(e) => setFormData({
                      ...formData, 
                      trigger_conditions: {...formData.trigger_conditions, days_inactive: parseInt(e.target.value)}
                    })}
                  />
                </div>
              )}

              <div>
                <Label>Template de Email *</Label>
                <Select 
                  value={formData.template_id} 
                  onValueChange={(v) => setFormData({...formData, template_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.is_active).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Crie primeiro um template de email
                  </p>
                )}
              </div>

              <div>
                <Label>Atraso (minutos)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.delay_minutes}
                  onChange={(e) => setFormData({...formData, delay_minutes: parseInt(e.target.value) || 0})}
                />
                <p className="text-xs text-slate-500 mt-1">
                  0 = enviar imediatamente
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({...formData, is_active: v})}
                />
                <Label>Automação ativa</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={!formData.template_id}
                >
                  {editingAutomation ? "Atualizar" : "Criar Automação"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {automations.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Nenhuma automação configurada</h3>
            <p className="text-slate-600">Crie automações para enviar emails automaticamente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => {
            const config = triggerConfig[automation.trigger_type] || triggerConfig.manual;
            const TriggerIcon = config.icon;
            const template = getTemplateById(automation.template_id);

            return (
              <Card key={automation.id} className={`transition-all ${!automation.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <TriggerIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">{automation.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          {automation.delay_minutes > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {automation.delay_minutes}min atraso
                            </Badge>
                          )}
                          {template && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {template.name}
                            </span>
                          )}
                        </div>
                        {automation.description && (
                          <p className="text-sm text-slate-600 mt-1">{automation.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="text-slate-600">{automation.emails_sent || 0} enviados</div>
                        {automation.last_triggered && (
                          <div className="text-xs text-slate-500">
                            Último: {format(new Date(automation.last_triggered), "dd/MM HH:mm")}
                          </div>
                        )}
                      </div>

                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: automation.id, is_active: checked })
                        }
                      />

                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(automation)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Eliminar automação "${automation.name}"?`)) {
                              deleteMutation.mutate(automation.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}