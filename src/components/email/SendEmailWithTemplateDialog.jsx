import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, User, Mail as MailIcon, Building2, Euro, MapPin } from "lucide-react";
import { toast } from "sonner";
import TemplateSelector from "./TemplateSelector";
import { Badge } from "@/components/ui/badge";

export default function SendEmailWithTemplateDialog({ 
  open, 
  onOpenChange, 
  recipientEmail = "",
  recipientName = "",
  category = "all",
  prefilledVariables = {},
  onSuccess
}) {
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [to, setTo] = React.useState(recipientEmail);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [variables, setVariables] = React.useState(prefilledVariables);

  // Fetch selected template details
  const { data: selectedTemplate } = useQuery({
    queryKey: ['emailTemplate', selectedTemplateId],
    queryFn: async () => {
      if (!selectedTemplateId) return null;
      const templates = await base44.entities.EmailTemplate.filter({ id: selectedTemplateId });
      return templates[0] || null;
    },
    enabled: !!selectedTemplateId
  });

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      if (selectedTemplateId) {
        return base44.functions.invoke('sendGmailWithTemplate', {
          to: data.to,
          templateId: selectedTemplateId,
          variables: data.variables
        });
      } else {
        return base44.functions.invoke('sendGmail', {
          to: data.to,
          subject: data.subject,
          body: data.body
        });
      }
    },
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
      onSuccess?.();
      handleClose();
    },
    onError: (error) => {
      toast.error("Erro ao enviar email: " + error.message);
    }
  });

  React.useEffect(() => {
    setTo(recipientEmail);
  }, [recipientEmail]);

  React.useEffect(() => {
    setVariables(prefilledVariables);
  }, [prefilledVariables]);

  React.useEffect(() => {
    if (selectedTemplate) {
      // Pre-fill subject and body with template
      let previewSubject = selectedTemplate.subject;
      let previewBody = selectedTemplate.body;
      
      // Replace variables with current values
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        previewSubject = previewSubject.replace(regex, value || `[${key}]`);
        previewBody = previewBody.replace(regex, value || `[${key}]`);
      }
      
      setSubject(previewSubject);
      setBody(previewBody);
    } else {
      setSubject("");
      setBody("");
    }
  }, [selectedTemplate, variables]);

  const handleSend = () => {
    if (!to) {
      toast.error("Email do destinatário é obrigatório");
      return;
    }

    if (!selectedTemplateId && (!subject || !body)) {
      toast.error("Assunto e corpo são obrigatórios quando não usa template");
      return;
    }

    sendMutation.mutate({ to, subject, body, variables });
  };

  const handleClose = () => {
    setSelectedTemplateId("");
    setTo(recipientEmail);
    setSubject("");
    setBody("");
    setVariables(prefilledVariables);
    onOpenChange(false);
  };

  // Extract variable keys from template
  const templateVariables = React.useMemo(() => {
    if (!selectedTemplate) return [];
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...selectedTemplate.body.matchAll(regex), ...selectedTemplate.subject.matchAll(regex)];
    return [...new Set(matches.map(m => m[1]))];
  }, [selectedTemplate]);

  const commonVariableLabels = {
    nome_completo: { label: "Nome Completo", icon: User },
    primeiro_nome: { label: "Primeiro Nome", icon: User },
    email: { label: "Email", icon: MailIcon },
    telefone: { label: "Telefone", icon: User },
    cidade: { label: "Cidade", icon: MapPin },
    empresa: { label: "Empresa", icon: Building2 },
    imovel: { label: "Imóvel", icon: Building2 },
    orcamento: { label: "Orçamento", icon: Euro },
    localizacao: { label: "Localização", icon: MapPin },
    agente_nome: { label: "Nome Agente", icon: User },
    agente_email: { label: "Email Agente", icon: MailIcon },
    agente_telefone: { label: "Tel. Agente", icon: User },
    data_atual: { label: "Data Atual", icon: User }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Email</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Recipient */}
          <div>
            <Label>Para *</Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>

          {/* Template Selector */}
          <div>
            <Label>Template</Label>
            <TemplateSelector
              category={category}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={setSelectedTemplateId}
              showPreview={true}
            />
          </div>

          {/* Variables (if template selected) */}
          {selectedTemplateId && templateVariables.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Label className="mb-3 block">Variáveis do Template</Label>
              <div className="grid grid-cols-2 gap-3">
                {templateVariables.map(varKey => {
                  const varInfo = commonVariableLabels[varKey];
                  const Icon = varInfo?.icon || User;
                  return (
                    <div key={varKey}>
                      <Label className="text-xs flex items-center gap-1 mb-1">
                        <Icon className="w-3 h-3" />
                        {varInfo?.label || varKey}
                      </Label>
                      <Input
                        size="sm"
                        value={variables[varKey] || ""}
                        onChange={(e) => setVariables({ ...variables, [varKey]: e.target.value })}
                        placeholder={`Digite ${varInfo?.label || varKey}...`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview or Manual Input */}
          {selectedTemplateId ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Pré-visualização</Badge>
                <span className="text-xs text-slate-600">O email será preenchido com as variáveis acima</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-slate-600">Assunto:</p>
                  <p className="text-sm">{subject}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">Corpo:</p>
                  <div 
                    className="text-sm bg-white p-3 rounded border max-h-60 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: body.replace(/\n/g, '<br>') }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label>Assunto *</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Assunto do email"
                  required
                />
              </div>
              <div>
                <Label>Mensagem *</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escreva a sua mensagem aqui..."
                  rows={10}
                  required
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}