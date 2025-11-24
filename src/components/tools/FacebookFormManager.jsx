import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Trash2, Eye, RefreshCw, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";

export default function FacebookFormManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingForm, setEditingForm] = React.useState(null);
  const [syncing, setSyncing] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: "",
    greeting: "",
    thank_you_message: "",
    privacy_policy_url: "",
    questions: []
  });

  const { data: fbSettings } = useQuery({
    queryKey: ['fb_settings'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.fb_lead_settings || { configured: false, campaigns: [] };
    },
  });

  // Mock forms data - in production would fetch from Facebook API
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['facebookForms', fbSettings?.access_token],
    queryFn: async () => {
      if (!fbSettings?.access_token) return [];
      
      // Mock data - In production: GET /{page-id}/leadgen_forms
      return [
        {
          id: "form_1",
          name: "Formulário Lisboa - Apartamentos",
          status: "ACTIVE",
          leads_count: 45,
          locale: "pt_PT",
          privacy_policy_url: "https://example.com/privacy",
          questions: [
            { key: "full_name", label: "Nome Completo", type: "FULL_NAME" },
            { key: "email", label: "Email", type: "EMAIL" },
            { key: "phone", label: "Telefone", type: "PHONE" },
            { key: "city", label: "Cidade", type: "CITY" }
          ]
        },
        {
          id: "form_2",
          name: "Formulário Porto - Moradias",
          status: "ACTIVE",
          leads_count: 28,
          locale: "pt_PT",
          privacy_policy_url: "https://example.com/privacy",
          questions: [
            { key: "full_name", label: "Nome", type: "FULL_NAME" },
            { key: "email", label: "Email", type: "EMAIL" },
            { key: "budget", label: "Orçamento", type: "CUSTOM", custom: true }
          ]
        }
      ];
    },
    enabled: !!fbSettings?.access_token
  });

  const syncForms = async () => {
    if (!fbSettings?.access_token) {
      toast.error("Configure o Access Token primeiro");
      return;
    }

    setSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      queryClient.invalidateQueries({ queryKey: ['facebookForms'] });
      toast.success("Formulários sincronizados");
    } catch (error) {
      toast.error("Erro ao sincronizar formulários");
    }
    setSyncing(false);
  };

  const handleCreateForm = async () => {
    if (!fbSettings?.access_token) {
      toast.error("Configure o Access Token primeiro");
      return;
    }

    try {
      // In production: POST /{page-id}/leadgen_forms
      // const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/leadgen_forms`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...formData, access_token: fbSettings.access_token })
      // });

      toast.success("Formulário criado com sucesso");
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['facebookForms'] });
    } catch (error) {
      toast.error("Erro ao criar formulário");
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm("Tem certeza que deseja eliminar este formulário?")) return;

    try {
      // In production: DELETE /{form-id}
      toast.success("Formulário eliminado");
      queryClient.invalidateQueries({ queryKey: ['facebookForms'] });
    } catch (error) {
      toast.error("Erro ao eliminar formulário");
    }
  };

  const duplicateForm = (form) => {
    setFormData({
      name: `${form.name} (Cópia)`,
      greeting: "",
      thank_you_message: "",
      privacy_policy_url: form.privacy_policy_url,
      questions: [...form.questions]
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      greeting: "",
      thank_you_message: "",
      privacy_policy_url: "",
      questions: []
    });
    setEditingForm(null);
  };

  const addQuestion = (type) => {
    const newQuestion = {
      key: `question_${formData.questions.length + 1}`,
      label: "",
      type: type,
      custom: type === "CUSTOM"
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQuestion]
    });
  };

  const removeQuestion = (index) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index][field] = value;
    setFormData({
      ...formData,
      questions: updatedQuestions
    });
  };

  if (!fbSettings?.access_token) {
    return (
      <Card className="border-amber-500">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Configuração Necessária
          </h3>
          <p className="text-slate-600 mb-4">
            Configure o Access Token do Facebook para gerir formulários de leads.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestor de Formulários</h2>
          <p className="text-slate-600">Criar e gerir formulários de Lead Ads</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={syncForms} disabled={syncing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Formulário
          </Button>
        </div>
      </div>

      {/* Forms List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto" />
            </CardContent>
          </Card>
        ) : forms.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Nenhum formulário encontrado
              </h3>
              <p className="text-slate-600 mb-4">
                Crie o seu primeiro formulário de leads
              </p>
            </CardContent>
          </Card>
        ) : (
          forms.map(form => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{form.name}</h3>
                      <Badge className={form.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                        {form.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>ID: {form.id}</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {form.leads_count} leads geradas
                      </span>
                      <span>{form.locale}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => duplicateForm(form)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteForm(form.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-slate-500 mb-2">Campos do Formulário:</p>
                  <div className="flex flex-wrap gap-2">
                    {form.questions.map((q, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {q.label}
                      </Badge>
                    ))}
                  </div>
                  {form.privacy_policy_url && (
                    <p className="text-xs text-slate-500 mt-2">
                      Política de Privacidade: <a href={form.privacy_policy_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ver</a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Formulário de Leads</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div>
              <Label>Nome do Formulário *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Formulário Lisboa - Apartamentos"
              />
            </div>

            <div>
              <Label>Mensagem de Boas-Vindas</Label>
              <Textarea
                value={formData.greeting}
                onChange={(e) => setFormData({...formData, greeting: e.target.value})}
                placeholder="Mensagem exibida quando o utilizador abre o formulário"
                rows={3}
              />
            </div>

            <div>
              <Label>Mensagem de Agradecimento</Label>
              <Textarea
                value={formData.thank_you_message}
                onChange={(e) => setFormData({...formData, thank_you_message: e.target.value})}
                placeholder="Mensagem exibida após submissão"
                rows={3}
              />
            </div>

            <div>
              <Label>URL da Política de Privacidade *</Label>
              <Input
                type="url"
                value={formData.privacy_policy_url}
                onChange={(e) => setFormData({...formData, privacy_policy_url: e.target.value})}
                placeholder="https://example.com/privacy"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Campos do Formulário</Label>
                <Select onValueChange={addQuestion}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="+ Adicionar campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_NAME">Nome Completo</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="PHONE">Telefone</SelectItem>
                    <SelectItem value="CITY">Cidade</SelectItem>
                    <SelectItem value="ZIP_CODE">Código Postal</SelectItem>
                    <SelectItem value="CUSTOM">Campo Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {formData.questions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Label do campo"
                          value={question.label}
                          onChange={(e) => updateQuestion(index, 'label', e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{question.type}</Badge>
                          {question.custom && (
                            <span className="text-xs text-slate-500">Campo personalizado</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(index)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {formData.questions.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Adicione campos ao formulário usando o menu acima
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateForm} 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!formData.name || !formData.privacy_policy_url || formData.questions.length === 0}
              >
                Criar Formulário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}