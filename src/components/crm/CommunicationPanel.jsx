import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, MessageSquare, Send, Clock, CheckCircle2, Loader2, Copy, Phone, History, ArrowDownLeft, ArrowUpRight, Smartphone } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const EMAIL_TEMPLATES = {
  first_contact: {
    name: "Primeiro Contacto",
    subject: "Obrigado pelo seu interesse",
    body: `Olá {name},

Obrigado por manifestar interesse nos nossos serviços.

Gostaria de saber mais sobre o que procura e como podemos ajudar. Pode partilhar mais detalhes sobre as suas necessidades?

Estou disponível para conversar por telefone ou agendar uma reunião.

Cumprimentos,
{agent_name}`
  },
  follow_up: {
    name: "Follow-up",
    subject: "Continuação da nossa conversa",
    body: `Olá {name},

Espero que esteja bem. Estou a dar seguimento ao nosso último contacto.

{custom_message}

Fico a aguardar o seu retorno.

Cumprimentos,
{agent_name}`
  },
  property_suggestion: {
    name: "Sugestão de Imóvel",
    subject: "Imóvel que pode interessar",
    body: `Olá {name},

Encontrei um imóvel que corresponde ao seu perfil e penso que pode interessar:

{property_details}

Está disponível para uma visita? Posso agendar para um dia que lhe seja conveniente.

Cumprimentos,
{agent_name}`
  },
  meeting_confirm: {
    name: "Confirmação de Reunião",
    subject: "Confirmação de reunião",
    body: `Olá {name},

Confirmo a nossa reunião para:
Data: {meeting_date}
Hora: {meeting_time}
Local: {meeting_location}

Por favor confirme a sua presença.

Cumprimentos,
{agent_name}`
  }
};

export default function CommunicationPanel({ lead, onUpdate }) {
  const [activeTab, setActiveTab] = React.useState("email");
  const [sending, setSending] = React.useState(false);
  
  // Email state
  const [selectedTemplate, setSelectedTemplate] = React.useState("");
  const [emailSubject, setEmailSubject] = React.useState("");
  const [emailBody, setEmailBody] = React.useState("");
  
  // WhatsApp state
  const [whatsappMessage, setWhatsappMessage] = React.useState("");
  
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const applyTemplate = (templateKey) => {
    const template = EMAIL_TEMPLATES[templateKey];
    if (!template) return;

    const replacements = {
      '{name}': lead.buyer_name || 'Cliente',
      '{agent_name}': user?.full_name || 'Equipa',
      '{custom_message}': '',
      '{property_details}': lead.property_title ? `${lead.property_title}\nLocalização: ${lead.location || 'N/A'}` : '',
      '{meeting_date}': '',
      '{meeting_time}': '',
      '{meeting_location}': ''
    };

    let subject = template.subject;
    let body = template.body;

    Object.entries(replacements).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key, 'g'), value);
      body = body.replace(new RegExp(key, 'g'), value);
    });

    setEmailSubject(subject);
    setEmailBody(body);
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Preencha assunto e mensagem");
      return;
    }

    setSending(true);

    try {
      await base44.integrations.Core.SendEmail({
        to: lead.buyer_email,
        subject: emailSubject,
        body: emailBody
      });

      // Log communication
      const updatedHistory = [
        ...(lead.communication_history || []),
        {
          type: "email",
          subject: emailSubject,
          message: emailBody,
          sent_at: new Date().toISOString(),
          sent_by: user?.email,
          status: "sent"
        }
      ];

      await onUpdate(lead.id, { communication_history: updatedHistory });

      toast.success("Email enviado com sucesso!");
      setEmailSubject("");
      setEmailBody("");
      setSelectedTemplate("");
    } catch (error) {
      toast.error("Erro ao enviar email");
      console.error(error);
    }

    setSending(false);
  };

  const handleSendWhatsApp = () => {
    if (!lead.buyer_phone) {
      toast.error("Lead não tem número de telefone");
      return;
    }

    const message = whatsappMessage.trim() || `Olá ${lead.buyer_name}, aqui é ${user?.full_name || 'a equipa'}. Como posso ajudar?`;
    const phoneNumber = lead.buyer_phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    // Log communication
    const updatedHistory = [
      ...(lead.communication_history || []),
      {
        type: "whatsapp",
        message: message,
        sent_at: new Date().toISOString(),
        sent_by: user?.email,
        status: "opened"
      }
    ];

    onUpdate(lead.id, { communication_history: updatedHistory });
    setWhatsappMessage("");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const communicationHistory = [...(lead.communication_history || [])].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Comunicações</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === "email" ? "default" : "outline"}
              onClick={() => setActiveTab("email")}
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTab === "whatsapp" ? "default" : "outline"}
              onClick={() => setActiveTab("whatsapp")}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
            >
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTab === "email" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Template</label>
              <Select value={selectedTemplate} onValueChange={(value) => {
                setSelectedTemplate(value);
                applyTemplate(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar template..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Para</label>
              <Input value={lead.buyer_email} disabled className="bg-slate-50" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Assunto</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Assunto do email..."
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Mensagem</label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Escreva a sua mensagem..."
                rows={8}
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={sending || !emailSubject || !emailBody}
              className="w-full bg-blue-600 hover:bg-blue-700"
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
        )}

        {activeTab === "whatsapp" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Para</label>
              <Input value={lead.buyer_phone || "Sem telefone"} disabled className="bg-slate-50" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Mensagem</label>
              <Textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Escreva a sua mensagem (opcional)..."
                rows={6}
              />
              <p className="text-xs text-slate-500 mt-1">
                Deixe vazio para usar mensagem padrão
              </p>
            </div>

            <Button
              onClick={handleSendWhatsApp}
              disabled={!lead.buyer_phone}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            {communicationHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhuma comunicação registada
              </div>
            ) : (
              communicationHistory.map((comm, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${
                    comm.type === 'email' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {comm.type === 'email' ? (
                        <Mail className="w-4 h-4 text-blue-600" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {comm.type === 'email' ? 'Email' : 'WhatsApp'}
                          {comm.subject && `: ${comm.subject}`}
                        </p>
                        <p className="text-xs text-slate-600">
                          {format(new Date(comm.sent_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {comm.status === 'sent' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                            Enviado
                          </>
                        ) : (
                          'Aberto'
                        )}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(comm.message)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">
                    {comm.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}