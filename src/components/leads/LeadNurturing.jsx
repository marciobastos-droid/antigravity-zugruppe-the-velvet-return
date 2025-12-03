import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Zap, Plus, Play, Pause, Trash2, Mail, Bell, CheckSquare,
  Clock, Users, ArrowRight, Edit2, Copy, BarChart3, RefreshCw,
  ChevronRight, ChevronDown, Circle, CheckCircle2, XCircle, AlertCircle, 
  Settings2, LogOut, Loader2, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function LeadNurturing() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sequences");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [showExitConditions, setShowExitConditions] = useState(false);
  const [sequenceForm, setSequenceForm] = useState({
    name: "",
    description: "",
    trigger_type: "new_lead",
    trigger_conditions: {},
    exit_conditions: {
      on_reply: true,
      on_conversion: true,
      on_appointment: true,
      on_status_change: []
    },
    send_time: {
      preferred_hour: 10,
      avoid_weekends: true
    },
    steps: [],
    is_active: true
  });

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['nurturingSequences'],
    queryFn: () => base44.entities.LeadNurturingSequence.list('-created_date')
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['leadEnrollments'],
    queryFn: () => base44.entities.LeadEnrollment.list('-created_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const createSequenceMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadNurturingSequence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurturingSequences'] });
      setDialogOpen(false);
      resetForm();
      toast.success("Sequência criada!");
    }
  });

  const updateSequenceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeadNurturingSequence.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurturingSequences'] });
      toast.success("Sequência atualizada!");
    }
  });

  const deleteSequenceMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadNurturingSequence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurturingSequences'] });
      toast.success("Sequência eliminada!");
    }
  });

  const enrollLeadMutation = useMutation({
    mutationFn: async ({ leadId, sequenceId }) => {
      const sequence = sequences.find(s => s.id === sequenceId);
      const lead = opportunities.find(o => o.id === leadId);
      
      await base44.entities.LeadEnrollment.create({
        lead_id: leadId,
        contact_id: lead?.contact_id,
        sequence_id: sequenceId,
        sequence_name: sequence?.name,
        enrolled_at: new Date().toISOString(),
        current_step: 0,
        status: "active",
        next_action_date: new Date(Date.now() + (sequence?.steps?.[0]?.delay_days || 0) * 24 * 60 * 60 * 1000).toISOString()
      });

      // Update sequence enrolled count
      await base44.entities.LeadNurturingSequence.update(sequenceId, {
        total_enrolled: (sequence?.total_enrolled || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadEnrollments'] });
      queryClient.invalidateQueries({ queryKey: ['nurturingSequences'] });
      toast.success("Lead inscrito na sequência!");
    }
  });

  const resetForm = () => {
    setSequenceForm({
      name: "",
      description: "",
      trigger_type: "new_lead",
      trigger_conditions: {},
      exit_conditions: {
        on_reply: true,
        on_conversion: true,
        on_appointment: true,
        on_status_change: []
      },
      send_time: {
        preferred_hour: 10,
        avoid_weekends: true
      },
      steps: [],
      is_active: true
    });
    setSelectedSequence(null);
    setShowConditions(false);
    setShowExitConditions(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (sequence) => {
    setSelectedSequence(sequence);
    setSequenceForm({
      name: sequence.name,
      description: sequence.description || "",
      trigger_type: sequence.trigger_type,
      trigger_conditions: sequence.trigger_conditions || {},
      exit_conditions: sequence.exit_conditions || {
        on_reply: true,
        on_conversion: true,
        on_appointment: true,
        on_status_change: []
      },
      send_time: sequence.send_time || {
        preferred_hour: 10,
        avoid_weekends: true
      },
      steps: sequence.steps || [],
      is_active: sequence.is_active
    });
    setShowConditions(Object.keys(sequence.trigger_conditions || {}).length > 0);
    setShowExitConditions(true);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!sequenceForm.name) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (selectedSequence) {
      updateSequenceMutation.mutate({ id: selectedSequence.id, data: sequenceForm });
    } else {
      createSequenceMutation.mutate(sequenceForm);
    }
    setDialogOpen(false);
  };

  const addStep = () => {
    const newStep = {
      step_number: sequenceForm.steps.length + 1,
      delay_days: sequenceForm.steps.length === 0 ? 0 : 3,
      delay_hours: 0,
      action_type: "email",
      email_subject: "",
      email_body: "",
      condition: {},
      is_active: true
    };
    setSequenceForm({ ...sequenceForm, steps: [...sequenceForm.steps, newStep] });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...sequenceForm.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSequenceForm({ ...sequenceForm, steps: newSteps });
  };

  const removeStep = (index) => {
    const newSteps = sequenceForm.steps.filter((_, i) => i !== index);
    newSteps.forEach((s, i) => s.step_number = i + 1);
    setSequenceForm({ ...sequenceForm, steps: newSteps });
  };

  const toggleSequenceActive = (sequence) => {
    updateSequenceMutation.mutate({
      id: sequence.id,
      data: { is_active: !sequence.is_active }
    });
  };

  const getEnrollmentStats = (sequenceId) => {
    const seqEnrollments = enrollments.filter(e => e.sequence_id === sequenceId);
    return {
      active: seqEnrollments.filter(e => e.status === 'active').length,
      completed: seqEnrollments.filter(e => e.status === 'completed').length,
      exited: seqEnrollments.filter(e => e.status === 'exited').length
    };
  };

  const getTriggerLabel = (type) => {
    const labels = {
      new_lead: "Novo Lead",
      status_change: "Mudança de Estado",
      inactivity: "Inatividade",
      no_contact: "Sem Contacto",
      property_view: "Visualização de Imóvel",
      manual: "Manual"
    };
    return labels[type] || type;
  };

  const processSequences = async () => {
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('processNurturingSequences');
      if (response.data.success) {
        const r = response.data.results;
        toast.success(
          `Processado: ${r.enrollments_created} inscritos, ${r.emails_sent} emails, ${r.tasks_created} tarefas`
        );
        queryClient.invalidateQueries({ queryKey: ['nurturingSequences'] });
        queryClient.invalidateQueries({ queryKey: ['leadEnrollments'] });
        queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      } else {
        toast.error(response.data.error || 'Erro ao processar');
      }
    } catch (error) {
      toast.error('Erro ao processar sequências');
    }
    setIsProcessing(false);
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'task': return <CheckSquare className="w-4 h-4 text-green-500" />;
      case 'notification': return <Bell className="w-4 h-4 text-amber-500" />;
      default: return <Zap className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-600" />
            Nurturing de Leads
          </h2>
          <p className="text-slate-600">Automatize o acompanhamento dos seus leads</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={processSequences}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Processar Agora
          </Button>
          <Button onClick={handleOpenCreate} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Sequência
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Sequências Ativas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {sequences.filter(s => s.is_active).length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Leads em Nurturing</p>
                <p className="text-2xl font-bold text-blue-600">
                  {enrollments.filter(e => e.status === 'active').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Completados</p>
                <p className="text-2xl font-bold text-green-600">
                  {enrollments.filter(e => e.status === 'completed').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Emails Enviados</p>
                <p className="text-2xl font-bold text-amber-600">
                  {enrollments.reduce((acc, e) => acc + (e.completed_steps?.length || 0), 0)}
                </p>
              </div>
              <Mail className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sequences">Sequências</TabsTrigger>
          <TabsTrigger value="enrollments">Leads Inscritos</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : sequences.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Sem sequências</h3>
                <p className="text-slate-500 mb-4">Crie a primeira sequência de nurturing</p>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Sequência
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sequences.map((sequence) => {
                const stats = getEnrollmentStats(sequence.id);
                return (
                  <Card key={sequence.id} className={`${!sequence.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-slate-900">{sequence.name}</h3>
                            <Badge variant="outline">{getTriggerLabel(sequence.trigger_type)}</Badge>
                            {sequence.is_active ? (
                              <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">Pausada</Badge>
                            )}
                          </div>
                          {sequence.description && (
                            <p className="text-sm text-slate-500 mt-1">{sequence.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Mail className="w-4 h-4" />
                              {sequence.steps?.length || 0} passos
                            </span>
                            <span className="flex items-center gap-1 text-blue-600">
                              <Users className="w-4 h-4" />
                              {stats.active} ativos
                            </span>
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              {stats.completed} completados
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSequenceActive(sequence)}
                          >
                            {sequence.is_active ? (
                              <Pause className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Play className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(sequence)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Eliminar esta sequência?')) {
                                deleteSequenceMutation.mutate(sequence.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Steps Preview */}
                      {sequence.steps?.length > 0 && (
                        <div className="mt-4 pt-4 border-t flex items-center gap-2 overflow-x-auto">
                          {sequence.steps.map((step, idx) => (
                            <React.Fragment key={idx}>
                              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg flex-shrink-0">
                                {getActionIcon(step.action_type)}
                                <span className="text-xs text-slate-600">
                                  {step.delay_days > 0 && `+${step.delay_days}d • `}
                                  {step.action_type === 'email' ? step.email_subject?.substring(0, 20) || 'Email' : step.task_title || step.action_type}
                                </span>
                              </div>
                              {idx < sequence.steps.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          {enrollments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Sem leads inscritos</h3>
                <p className="text-slate-500">Os leads serão inscritos automaticamente ou manualmente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment) => {
                const lead = opportunities.find(o => o.id === enrollment.lead_id);
                return (
                  <Card key={enrollment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-900">{lead?.buyer_name || 'Lead'}</h4>
                            <Badge variant="outline">{enrollment.sequence_name}</Badge>
                            <Badge className={
                              enrollment.status === 'active' ? 'bg-blue-100 text-blue-800' :
                              enrollment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              enrollment.status === 'paused' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-800'
                            }>
                              {enrollment.status === 'active' && <Circle className="w-2 h-2 mr-1 fill-current" />}
                              {enrollment.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {enrollment.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            Passo {enrollment.current_step + 1} • 
                            {enrollment.completed_steps?.length || 0} ações completadas
                          </p>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                          <p>Inscrito: {format(new Date(enrollment.enrolled_at), "d MMM yyyy", { locale: ptBR })}</p>
                          {enrollment.next_action_date && enrollment.status === 'active' && (
                            <p className="text-blue-600">
                              Próxima ação: {format(new Date(enrollment.next_action_date), "d MMM", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSequence ? 'Editar Sequência' : 'Nova Sequência de Nurturing'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome da Sequência *</Label>
                <Input
                  value={sequenceForm.name}
                  onChange={(e) => setSequenceForm({ ...sequenceForm, name: e.target.value })}
                  placeholder="Ex: Boas-vindas Novos Leads"
                />
              </div>
              <div>
                <Label>Gatilho</Label>
                <Select
                  value={sequenceForm.trigger_type}
                  onValueChange={(v) => setSequenceForm({ ...sequenceForm, trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_lead">Novo Lead (automático)</SelectItem>
                    <SelectItem value="no_contact">Sem Contacto X dias</SelectItem>
                    <SelectItem value="inactivity">Inatividade X dias</SelectItem>
                    <SelectItem value="status_change">Mudança de Estado</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={sequenceForm.description}
                onChange={(e) => setSequenceForm({ ...sequenceForm, description: e.target.value })}
                placeholder="Descreva o objetivo desta sequência..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={sequenceForm.is_active}
                onCheckedChange={(v) => setSequenceForm({ ...sequenceForm, is_active: v })}
              />
              <Label>Sequência ativa</Label>
            </div>

            {/* Trigger Conditions */}
            <Collapsible open={showConditions} onOpenChange={setShowConditions}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Condições do Gatilho
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showConditions ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {(sequenceForm.trigger_type === 'no_contact' || sequenceForm.trigger_type === 'inactivity') && (
                  <div>
                    <Label className="text-xs">
                      {sequenceForm.trigger_type === 'no_contact' ? 'Dias sem contacto' : 'Dias de inatividade'}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={sequenceForm.trigger_type === 'no_contact' 
                        ? sequenceForm.trigger_conditions.no_contact_days || 3
                        : sequenceForm.trigger_conditions.inactivity_days || 7}
                      onChange={(e) => setSequenceForm({
                        ...sequenceForm,
                        trigger_conditions: {
                          ...sequenceForm.trigger_conditions,
                          [sequenceForm.trigger_type === 'no_contact' ? 'no_contact_days' : 'inactivity_days']: parseInt(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                )}

                {sequenceForm.trigger_type === 'status_change' && (
                  <div>
                    <Label className="text-xs">Estado alvo</Label>
                    <Select
                      value={sequenceForm.trigger_conditions.target_status || ''}
                      onValueChange={(v) => setSequenceForm({
                        ...sequenceForm,
                        trigger_conditions: { ...sequenceForm.trigger_conditions, target_status: v }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Quando mudar para..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contacted">Contactado</SelectItem>
                        <SelectItem value="visit_scheduled">Visita Agendada</SelectItem>
                        <SelectItem value="proposal">Proposta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Filtrar por origem (opcional)</Label>
                  <Select
                    value={sequenceForm.trigger_conditions.lead_source?.[0] || 'all'}
                    onValueChange={(v) => setSequenceForm({
                      ...sequenceForm,
                      trigger_conditions: {
                        ...sequenceForm.trigger_conditions,
                        lead_source: v === 'all' ? [] : [v]
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as origens</SelectItem>
                      <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referência</SelectItem>
                      <SelectItem value="direct_contact">Contacto Direto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Filtrar por tipo de lead (opcional)</Label>
                  <Select
                    value={sequenceForm.trigger_conditions.lead_type?.[0] || 'all'}
                    onValueChange={(v) => setSequenceForm({
                      ...sequenceForm,
                      trigger_conditions: {
                        ...sequenceForm.trigger_conditions,
                        lead_type: v === 'all' ? [] : [v]
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="comprador">Comprador</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="parceiro_comprador">Parceiro Comprador</SelectItem>
                      <SelectItem value="parceiro_vendedor">Parceiro Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Exit Conditions */}
            <Collapsible open={showExitConditions} onOpenChange={setShowExitConditions}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Condições de Saída
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showExitConditions ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={sequenceForm.exit_conditions?.on_reply}
                      onCheckedChange={(v) => setSequenceForm({
                        ...sequenceForm,
                        exit_conditions: { ...sequenceForm.exit_conditions, on_reply: v }
                      })}
                    />
                    <Label className="text-sm">Sair quando lead responder/for contactada</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={sequenceForm.exit_conditions?.on_conversion}
                      onCheckedChange={(v) => setSequenceForm({
                        ...sequenceForm,
                        exit_conditions: { ...sequenceForm.exit_conditions, on_conversion: v }
                      })}
                    />
                    <Label className="text-sm">Sair quando converter em contacto</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={sequenceForm.exit_conditions?.on_appointment}
                      onCheckedChange={(v) => setSequenceForm({
                        ...sequenceForm,
                        exit_conditions: { ...sequenceForm.exit_conditions, on_appointment: v }
                      })}
                    />
                    <Label className="text-sm">Sair quando agendar visita</Label>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Máximo de dias na sequência (opcional)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ex: 30"
                    value={sequenceForm.exit_conditions?.max_days || ''}
                    onChange={(e) => setSequenceForm({
                      ...sequenceForm,
                      exit_conditions: {
                        ...sequenceForm.exit_conditions,
                        max_days: e.target.value ? parseInt(e.target.value) : null
                      }
                    })}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Steps */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Passos da Sequência</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Passo
                </Button>
              </div>

              <div className="space-y-3">
                {sequenceForm.steps.map((step, idx) => (
                  <Card key={idx} className="border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">
                          {step.step_number}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Dias</Label>
                              <Input
                                type="number"
                                min={0}
                                value={step.delay_days}
                                onChange={(e) => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Horas</Label>
                              <Input
                                type="number"
                                min={0}
                                max={23}
                                value={step.delay_hours || 0}
                                onChange={(e) => updateStep(idx, 'delay_hours', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Tipo de Ação</Label>
                              <Select
                                value={step.action_type}
                                onValueChange={(v) => updateStep(idx, 'action_type', v)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="task">Criar Tarefa</SelectItem>
                                  <SelectItem value="notification">Notificação</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {step.action_type === 'email' && (
                            <>
                              <div>
                                <Label className="text-xs">Assunto do Email</Label>
                                <Input
                                  value={step.email_subject || ''}
                                  onChange={(e) => updateStep(idx, 'email_subject', e.target.value)}
                                  placeholder="Assunto..."
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Corpo do Email</Label>
                                <Textarea
                                  value={step.email_body || ''}
                                  onChange={(e) => updateStep(idx, 'email_body', e.target.value)}
                                  placeholder="Use {{nome}} para personalizar o nome, {{localizacao}} para localização..."
                                  rows={4}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                  Variáveis: {"{{nome}}"}, {"{{localizacao}}"}
                                </p>
                              </div>
                            </>
                          )}

                          {step.action_type === 'task' && (
                            <>
                              <div>
                                <Label className="text-xs">Título da Tarefa</Label>
                                <Input
                                  value={step.task_title || ''}
                                  onChange={(e) => updateStep(idx, 'task_title', e.target.value)}
                                  placeholder="Ex: Fazer follow-up com {{nome}}"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Descrição (opcional)</Label>
                                <Textarea
                                  value={step.task_description || ''}
                                  onChange={(e) => updateStep(idx, 'task_description', e.target.value)}
                                  placeholder="Detalhes da tarefa..."
                                  rows={2}
                                />
                              </div>
                            </>
                          )}

                          {step.action_type === 'notification' && (
                            <div>
                              <Label className="text-xs">Mensagem da Notificação</Label>
                              <Input
                                value={step.notification_message || ''}
                                onChange={(e) => updateStep(idx, 'notification_message', e.target.value)}
                                placeholder="Ex: Follow-up necessário para {{nome}}"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-2">
                            <Checkbox
                              checked={step.condition?.skip_if_contacted}
                              onCheckedChange={(v) => updateStep(idx, 'condition', { ...step.condition, skip_if_contacted: v })}
                            />
                            <Label className="text-xs text-slate-600">Saltar se lead já foi contactada</Label>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(idx)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {sequenceForm.steps.length === 0 && (
                  <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>Adicione passos à sequência</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                {selectedSequence ? 'Guardar Alterações' : 'Criar Sequência'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}