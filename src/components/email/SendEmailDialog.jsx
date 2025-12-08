import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, FileText, Eye, Sparkles, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export default function SendEmailDialog({ 
  open, 
  onOpenChange, 
  recipient, // { type: 'client' | 'opportunity', id, name, email, data }
}) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.EmailTemplate.list()
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: smtpSettings } = useQuery({
    queryKey: ['smtpSettings'],
    queryFn: async () => {
      const settings = await base44.entities.SMTPSettings.list();
      return settings.find(s => s.is_active);
    }
  });

  // Replace dynamic fields with actual data
  const replaceDynamicFields = (text, data) => {
    if (!text) return "";
    let result = text;
    
    // Get first name from full name
    const fullName = data?.name || recipient?.name || data?.full_name || "";
    const firstName = fullName.split(' ')[0] || "";
    
    // Contact/Opportunity fields
    result = result.replace(/\{\{nome_completo\}\}/g, fullName);
    result = result.replace(/\{\{primeiro_nome\}\}/g, firstName);
    result = result.replace(/\{\{nome\}\}/g, fullName); // backwards compatibility
    result = result.replace(/\{\{email\}\}/g, data?.email || recipient?.email || "");
    result = result.replace(/\{\{telefone\}\}/g, data?.phone || data?.buyer_phone || "");
    result = result.replace(/\{\{cidade\}\}/g, data?.city || data?.location || "");
    result = result.replace(/\{\{empresa\}\}/g, data?.company_name || "");
    result = result.replace(/\{\{imovel\}\}/g, data?.property_title || "");
    result = result.replace(/\{\{orcamento\}\}/g, data?.budget ? `€${data.budget.toLocaleString()}` : "");
    result = result.replace(/\{\{localizacao\}\}/g, data?.location || data?.city || "");
    
    // Agent fields
    result = result.replace(/\{\{agente_nome\}\}/g, user?.full_name || "");
    result = result.replace(/\{\{agente_email\}\}/g, user?.email || "");
    result = result.replace(/\{\{agente_telefone\}\}/g, user?.phone || "");
    
    // General fields
    result = result.replace(/\{\{data_atual\}\}/g, new Date().toLocaleDateString('pt-PT'));
    
    return result;
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const getProcessedContent = () => {
    const data = recipient?.data || {};
    return {
      subject: replaceDynamicFields(subject, data),
      body: replaceDynamicFields(body, data)
    };
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const { data } = await base44.functions.invoke('uploadFile', { file });
        uploadedFiles.push({
          filename: file.name,
          url: data.file_url
        });
      }
      setAttachments([...attachments, ...uploadedFiles]);
      toast.success(`${files.length} ficheiro(s) anexado(s)`);
    } catch (error) {
      toast.error("Erro ao carregar ficheiro");
    }
    setUploading(false);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!recipient?.email) {
      toast.error("Destinatário sem email");
      return;
    }

    if (!subject || !subject.trim()) {
      toast.error("Assunto obrigatório");
      return;
    }

    if (!body || !body.trim()) {
      toast.error("Mensagem obrigatória");
      return;
    }

    setSending(true);
    try {
      const processed = getProcessedContent();
      
      // Send email using Gmail via App Connector
      const response = await base44.functions.invoke('gmailIntegration', {
        action: 'sendEmail',
        to: recipient.email,
        subject: processed.subject,
        body: processed.body
      });
      
      if (!response || !response.data) {
        throw new Error('Resposta inválida do servidor');
      }
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      
      if (!response.data?.success) {
        throw new Error('Falha ao enviar email. Tente novamente.');
      }

      // Log to SentEmail entity
      await base44.entities.SentEmail.create({
        recipient_id: recipient.id,
        recipient_type: recipient.type,
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        subject: processed.subject,
        body: processed.body,
        template_id: selectedTemplate || null,
        template_name: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : null,
        sent_by: user?.email,
        sent_at: new Date().toISOString(),
        status: 'sent',
        attachments: attachments
      });

      // Log the communication automatically
      await base44.functions.invoke('logCommunication', {
        contact_id: recipient.type === 'client' ? recipient.id : null,
        contact_email: recipient.email,
        opportunity_id: recipient.type === 'opportunity' ? recipient.id : null,
        type: 'email',
        direction: 'outbound',
        subject: processed.subject,
        summary: processed.body?.substring(0, 500) || '',
        outcome: 'successful',
        metadata: {
          template_used: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : null,
          attachments_count: attachments.length
        }
      });

      // Update template usage count
      if (selectedTemplate) {
        const template = templates.find(t => t.id === selectedTemplate);
        if (template) {
          await base44.entities.EmailTemplate.update(selectedTemplate, {
            usage_count: (template.usage_count || 0) + 1
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['sentEmails'] });
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
      toast.success("Email enviado com sucesso!");
      onOpenChange(false);
      
      // Reset form
      setSubject("");
      setBody("");
      setAttachments([]);
      setSelectedTemplate("");
    } catch (error) {
      console.error("Error sending email:", error);
      
      let errorMessage = "Erro desconhecido";
      
      // Parse different error formats
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Log failed email
      try {
        await base44.entities.SentEmail.create({
          recipient_id: recipient.id,
          recipient_type: recipient.type,
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          subject: getProcessedContent().subject,
          body: getProcessedContent().body,
          template_id: selectedTemplate || null,
          template_name: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.name : null,
          sent_by: user?.email,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: errorMessage,
          attachments: attachments
        });
      } catch (logError) {
        console.error("Error logging failed email:", logError);
      }

      // Log failed communication automatically
      try {
        await base44.functions.invoke('logCommunication', {
          contact_id: recipient.type === 'client' ? recipient.id : null,
          contact_email: recipient.email,
          opportunity_id: recipient.type === 'opportunity' ? recipient.id : null,
          type: 'email',
          direction: 'outbound',
          subject: getProcessedContent().subject,
          summary: `[FALHOU] ${errorMessage}`,
          outcome: 'failed'
        });
      } catch (logError) {
        console.error("Error logging failed communication:", logError);
      }

      toast.error(`Erro ao enviar email: ${errorMessage}`);
    }
    setSending(false);
  };

  const processed = getProcessedContent();
  const filteredTemplates = templates.filter(t => 
    t.is_active && (t.category === recipient?.type || t.category === 'general')
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Enviar Email para {recipient?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Para:</span>
            <Badge variant="outline">{recipient?.email}</Badge>
          </div>

          {/* Template Selection */}
          <div>
            <Label>Template (opcional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher template ou escrever manualmente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Escrever manualmente</SelectItem>
                {filteredTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={previewMode ? "preview" : "edit"} onValueChange={(v) => setPreviewMode(v === "preview")}>
            <TabsList>
              <TabsTrigger value="edit">Editar</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-1" />
                Pré-visualizar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div>
                <Label>Assunto *</Label>
                <Input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Assunto do email..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Mensagem *</Label>
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Suporta campos dinâmicos
                  </Badge>
                </div>
                <Textarea
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Conteúdo do email..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Campos disponíveis: {"{{nome_completo}}"}, {"{{email}}"}, {"{{telefone}}"}, {"{{cidade}}"}, {"{{imovel}}"}, {"{{orcamento}}"}
                </p>
              </div>

              {/* Attachments */}
              <div>
                <Label>Anexos</Label>
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">{file.filename}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <div>
                    <input
                      type="file"
                      id="email-attachments"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('email-attachments').click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Paperclip className="w-4 h-4 mr-2" />
                      )}
                      {uploading ? "A carregar..." : "Anexar Ficheiro"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-slate-100 border-b">
                  <p className="text-sm text-slate-600">Assunto:</p>
                  <p className="font-medium">{processed.subject}</p>
                </div>
                <div className="p-4 bg-white min-h-[200px]">
                  <div 
                    className="prose prose-sm max-w-none whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: processed.body }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={sending || !subject || !body || !recipient?.email}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
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