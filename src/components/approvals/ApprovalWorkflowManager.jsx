import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Settings, ArrowRight, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";

export default function ApprovalWorkflowManager() {
  const queryClient = useQueryClient();
  const [editingWorkflow, setEditingWorkflow] = React.useState(null);

  const { data: workflows = [] } = useQuery({
    queryKey: ['approval-workflows'],
    queryFn: () => base44.entities.ApprovalWorkflow.list()
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (data) => base44.entities.ApprovalWorkflow.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success("Workflow criado com sucesso");
      setEditingWorkflow(null);
    }
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ApprovalWorkflow.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success("Workflow atualizado");
      setEditingWorkflow(null);
    }
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: (id) => base44.entities.ApprovalWorkflow.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-workflows'] });
      toast.success("Workflow eliminado");
    }
  });

  const handleCreateDefault = () => {
    setEditingWorkflow({
      name: "Aprovação Padrão",
      description: "Workflow de aprovação padrão para imóveis",
      is_default: true,
      is_active: true,
      steps: [
        {
          step_number: 1,
          step_name: "Revisão do Consultor",
          required_role: "consultant",
          timeout_hours: 24
        },
        {
          step_number: 2,
          step_name: "Validação do Gestor",
          required_role: "gestor",
          timeout_hours: 48
        },
        {
          step_number: 3,
          step_name: "Aprovação Final do Admin",
          required_role: "admin",
          timeout_hours: 72
        }
      ],
      notification_templates: {
        pending_approval: "Novo imóvel aguarda sua aprovação: {{property_title}}",
        approved: "Imóvel aprovado no passo {{step_name}}",
        rejected: "Imóvel rejeitado: {{rejection_reason}}",
        escalated: "Aprovação escalada devido a timeout"
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Workflows de Aprovação</h2>
          <p className="text-slate-600">Configure processos de aprovação em múltiplos passos</p>
        </div>
        <Button onClick={handleCreateDefault} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Workflow
        </Button>
      </div>

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className={workflow.is_default ? "border-blue-300 shadow-sm" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    {workflow.is_default && (
                      <Badge className="bg-blue-600">Padrão</Badge>
                    )}
                    {!workflow.is_active && (
                      <Badge variant="outline" className="text-red-600">Inativo</Badge>
                    )}
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-slate-600">{workflow.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingWorkflow(workflow)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Eliminar este workflow?')) {
                        deleteWorkflowMutation.mutate(workflow.id);
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {workflow.steps?.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex-1">
                      <div className="bg-slate-100 rounded-lg p-3 border-2 border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {step.step_number}
                          </div>
                          <p className="font-semibold text-sm">{step.step_name}</p>
                        </div>
                        <p className="text-xs text-slate-600">
                          Papel: <Badge variant="outline" className="ml-1">{step.required_role}</Badge>
                        </p>
                        {step.timeout_hours && (
                          <p className="text-xs text-slate-500 mt-1">
                            Timeout: {step.timeout_hours}h
                          </p>
                        )}
                      </div>
                    </div>
                    {idx < workflow.steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {(workflow.price_range_min || workflow.price_range_max || workflow.property_types?.length > 0) && (
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                  {workflow.price_range_min && (
                    <Badge variant="secondary">
                      Min: €{workflow.price_range_min.toLocaleString()}
                    </Badge>
                  )}
                  {workflow.price_range_max && (
                    <Badge variant="secondary">
                      Max: €{workflow.price_range_max.toLocaleString()}
                    </Badge>
                  )}
                  {workflow.property_types?.length > 0 && (
                    <Badge variant="secondary">
                      Tipos: {workflow.property_types.join(', ')}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {workflows.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 mb-4">Nenhum workflow configurado</p>
              <Button onClick={handleCreateDefault}>
                Criar Workflow Padrão
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {editingWorkflow && (
        <WorkflowEditor
          workflow={editingWorkflow}
          onSave={(data) => {
            if (editingWorkflow.id) {
              updateWorkflowMutation.mutate({ id: editingWorkflow.id, data });
            } else {
              createWorkflowMutation.mutate(data);
            }
          }}
          onCancel={() => setEditingWorkflow(null)}
        />
      )}
    </div>
  );
}

function WorkflowEditor({ workflow, onSave, onCancel }) {
  const [formData, setFormData] = React.useState(workflow);

  const addStep = () => {
    const newStep = {
      step_number: (formData.steps?.length || 0) + 1,
      step_name: "",
      required_role: "consultant",
      timeout_hours: 24
    };
    setFormData({
      ...formData,
      steps: [...(formData.steps || []), newStep]
    });
  };

  const removeStep = (index) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      steps: newSteps.map((step, i) => ({ ...step, step_number: i + 1 }))
    });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {workflow.id ? "Editar Workflow" : "Novo Workflow"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Workflow</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Aprovação Premium"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Workflow Padrão</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Ativo</span>
              </label>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Passos de Aprovação</Label>
              <Button onClick={addStep} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Passo
              </Button>
            </div>

            <div className="space-y-3">
              {formData.steps?.map((step, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {step.step_number}
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Nome do Passo</Label>
                          <Input
                            value={step.step_name}
                            onChange={(e) => updateStep(index, 'step_name', e.target.value)}
                            placeholder="Ex: Revisão Inicial"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Papel Necessário</Label>
                          <Select
                            value={step.required_role}
                            onValueChange={(value) => updateStep(index, 'required_role', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Utilizador</SelectItem>
                              <SelectItem value="consultant">Consultor</SelectItem>
                              <SelectItem value="gestor">Gestor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Timeout (horas)</Label>
                          <Input
                            type="number"
                            value={step.timeout_hours || ""}
                            onChange={(e) => updateStep(index, 'timeout_hours', Number(e.target.value))}
                            placeholder="24"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!formData.steps || formData.steps.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  <p>Nenhum passo configurado</p>
                  <Button onClick={addStep} variant="outline" size="sm" className="mt-2">
                    Adicionar Primeiro Passo
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço Mínimo (opcional)</Label>
              <Input
                type="number"
                value={formData.price_range_min || ""}
                onChange={(e) => setFormData({ ...formData, price_range_min: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Preço Máximo (opcional)</Label>
              <Input
                type="number"
                value={formData.price_range_max || ""}
                onChange={(e) => setFormData({ ...formData, price_range_max: Number(e.target.value) })}
                placeholder="∞"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={() => onSave(formData)}
              disabled={!formData.name || !formData.steps?.length}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Workflow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}