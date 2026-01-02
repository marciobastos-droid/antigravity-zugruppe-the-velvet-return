import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Copy, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmailTemplatesManager() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState(null);
  const [previewTemplate, setPreviewTemplate] = React.useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list('-created_date')
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      toast.success("Template criado com sucesso!");
      setIsCreating(false);
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      toast.success("Template atualizado!");
      setEditingTemplate(null);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      toast.success("Template eliminado!");
    }
  });

  const eventTypes = {
    subscription_confirmed: "Subscrição Confirmada",
    subscription_rejected: "Subscrição Rejeitada",
    payment_reminder: "Lembrete de Pagamento",
    subscription_renewal: "Renovação de Subscrição",
    subscription_expiring: "Subscrição a Expirar",
    welcome_email: "Email de Boas-vindas",
    custom: "Personalizado"
  };

  const defaultVariables = {
    subscription_confirmed: ["{{user_name}}", "{{user_email}}", "{{plan}}", "{{valid_until}}", "{{amount}}"],
    subscription_rejected: ["{{user_name}}", "{{user_email}}", "{{plan}}", "{{reason}}"],
    payment_reminder: ["{{user_name}}", "{{user_email}}", "{{plan}}", "{{amount}}", "{{due_date}}"],
    subscription_renewal: ["{{user_name}}", "{{user_email}}", "{{plan}}", "{{renewal_date}}", "{{amount}}"],
    subscription_expiring: ["{{user_name}}", "{{user_email}}", "{{plan}}", "{{expiry_date}}"],
    welcome_email: ["{{user_name}}", "{{user_email}}"],
    custom: ["{{user_name}}", "{{user_email}}"]
  };

  const TemplateForm = ({ template, onSave, onCancel }) => {
    const [formData, setFormData] = React.useState(template || {
      name: "",
      event_type: "custom",
      subject: "",
      body: "",
      variables: [],
      is_active: true
    });

    React.useEffect(() => {
      if (formData.event_type) {
        setFormData(prev => ({
          ...prev,
          variables: defaultVariables[formData.event_type] || []
        }));
      }
    }, [formData.event_type]);

    return (
      <div className="space-y-4">
        <div>
          <Label>Nome do Template</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Email de Confirmação Premium"
          />
        </div>

        <div>
          <Label>Tipo de Evento</Label>
          <Select
            value={formData.event_type}
            onValueChange={(value) => setFormData({ ...formData, event_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(eventTypes).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Assunto do Email</Label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Ex: Sua Subscrição foi Confirmada!"
          />
        </div>

        <div>
          <Label>Corpo do Email</Label>
          <Textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            placeholder="Escreva o corpo do email aqui..."
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="text-sm">
              <strong>Variáveis disponíveis:</strong>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.variables?.map((variable) => (
                  <Badge
                    key={variable}
                    variant="outline"
                    className="cursor-pointer hover:bg-slate-100"
                    onClick={() => {
                      navigator.clipboard.writeText(variable);
                      toast.success("Variável copiada!");
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {variable}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Clique para copiar. Use estas variáveis no assunto e corpo do email.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4"
          />
          <Label>Template ativo</Label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={() => onSave(formData)} className="flex-1">
            Guardar Template
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">A carregar templates...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Templates de Email
            </CardTitle>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">Nenhum template configurado</p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">{template.name}</h3>
                          {template.is_active ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {eventTypes[template.event_type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          <strong>Assunto:</strong> {template.subject}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {template.body.substring(0, 150)}...
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewTemplate(template)}
                          title="Pré-visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTemplate(template)}
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Eliminar template "${template.name}"?`)) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                          className="text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Template</DialogTitle>
            <DialogDescription>
              Configure um template de email personalizado para eventos do sistema
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            onSave={(data) => createTemplateMutation.mutate(data)}
            onCancel={() => setIsCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              template={editingTemplate}
              onSave={(data) => updateTemplateMutation.mutate({ id: editingTemplate.id, data })}
              onCancel={() => setEditingTemplate(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pré-visualização: {previewTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-xs text-slate-500">Tipo de Evento</Label>
                <Badge variant="outline" className="mt-1">
                  {eventTypes[previewTemplate.event_type]}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Assunto</Label>
                <p className="text-lg font-semibold text-slate-900 mt-1">
                  {previewTemplate.subject}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Corpo do Email</Label>
                <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                    {previewTemplate.body}
                  </pre>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Variáveis Disponíveis</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {previewTemplate.variables?.map((variable) => (
                    <Badge key={variable} variant="outline" className="font-mono text-xs">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setPreviewTemplate(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}