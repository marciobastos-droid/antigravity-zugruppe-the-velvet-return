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
  const [activeTab, setActiveTab] = React.useState("history");
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

  // Fetch all communications from different sources
  const { data: communicationLogs = [] } = useQuery({
    queryKey: ['communicationLogs', lead.contact_id, lead.profile_id, lead.id],
    queryFn: async () => {
      const all = await base44.entities.CommunicationLog.list('-communication_date', 200);
      return all.filter(c => 
        c.contact_id === lead.contact_id || 
        c.contact_id === lead.profile_id ||
        c.contact_id === lead.id
      );
    },
    enabled: !!(lead.contact_id || lead.profile_id || lead.id)
  });

  const { data: emailLogs = [] } = useQuery({
    queryKey: ['emailLogs', lead.contact_id, lead.profile_id],
    queryFn: async () => {
      const all = await base44.entities.EmailLog.list('-sent_date', 200);
      return all.filter(e => 
        e.contact_id === lead.contact_id || 
        e.contact_id === lead.profile_id
      );
    },
    enabled: !!(lead.contact_id || lead.profile_id)
  });

  const { data: whatsappMessages = [] } = useQuery({
    queryKey: ['whatsappMessages', lead.buyer_phone],
    queryFn: async () => {
      if (!lead.buyer_phone) return [];
      const all = await base44.entities.WhatsAppMessage.list('-created_date', 100);
      const phone = lead.buyer_phone.replace(/\D/g, '');
      return all.filter(m => m.from_number?.includes(phone) || m.to_number?.includes(phone));
    },
    enabled: !!lead.buyer_phone
  });

  // Merge all communications into a unified timeline
  const unifiedHistory = React.useMemo(() => {
    const items = [];

    // From lead's communication_history
    (lead.communication_history || []).forEach(comm => {
      items.push({
        id: `lead-${comm.sent_at}`,
        type: comm.type,
        direction: 'outbound',
        subject: comm.subject,
        message: comm.message,
        date: new Date(comm.sent_at),
        status: comm.status,
        source: 'lead'
      });
    });

    // From CommunicationLog
    communicationLogs.forEach(log => {
      items.push({
        id: `comm-${log.id}`,
        type: log.communication_type,
        direction: log.direction,
        subject: log.subject,
        message: log.summary || log.notes,
        date: new Date(log.communication_date),
        status: log.outcome,
        agent: log.agent_email,
        source: 'communication_log'
      });
    });

    // From EmailLog (only if not already in communication logs)
    emailLogs.forEach(log => {
      const exists = items.some(i => i.id === `email-${log.gmail_message_id}`);
      if (!exists) {
        items.push({
          id: `email-${log.gmail_message_id}`,
          type: 'email',
          direction: log.direction,
          subject: log.subject,
          message: '',
          date: new Date(log.sent_date),
          status: 'synced',
          source: 'gmail'
        });
      }
    });

    // From WhatsApp messages
    whatsappMessages.forEach(msg => {
      const phone = lead.buyer_phone?.replace(/\D/g, '');
      const isInbound = msg.from_number?.includes(phone);
      items.push({
        id: `wa-${msg.id}`,
        type: 'whatsapp',
        direction: isInbound ? 'inbound' : 'outbound',
        subject: null,
        message: msg.message_body,
        date: new Date(msg.created_date),
        status: msg.status,
        source: 'whatsapp'
      });
    });

    // Sort by date descending
    return items.sort((a, b) => b.date - a.date);
  }, [lead.communication_history, communicationLogs, emailLogs, whatsappMessages, lead.buyer_phone]);

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
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <Mail className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                <div className="text-lg font-bold text-blue-900">
                  {unifiedHistory.filter(h => h.type === 'email').length}
                </div>
                <div className="text-xs text-blue-600">Emails</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <MessageSquare className="w-4 h-4 mx-auto text-green-600 mb-1" />
                <div className="text-lg font-bold text-green-900">
                  {unifiedHistory.filter(h => h.type === 'whatsapp').length}
                </div>
                <div className="text-xs text-green-600">WhatsApp</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <Phone className="w-4 h-4 mx-auto text-purple-600 mb-1" />
                <div className="text-lg font-bold text-purple-900">
                  {unifiedHistory.filter(h => h.type === 'call').length}
                </div>
                <div className="text-xs text-purple-600">Chamadas</div>
              </div>
              <div className="text-center p-2 bg-slate-50 rounded-lg">
                <History className="w-4 h-4 mx-auto text-slate-600 mb-1" />
                <div className="text-lg font-bold text-slate-900">
                  {unifiedHistory.length}
                </div>
                <div className="text-xs text-slate-600">Total</div>
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              {unifiedHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhuma comunicação registada
                </div>
              ) : (
                <div className="space-y-2">
                  {unifiedHistory.map((comm) => {
                    const getTypeConfig = () => {
                      switch(comm.type) {
                        case 'email': return { icon: Mail, color: 'blue', label: 'Email' };
                        case 'whatsapp': return { icon: MessageSquare, color: 'green', label: 'WhatsApp' };
                        case 'call': return { icon: Phone, color: 'purple', label: 'Chamada' };
                        case 'sms': return { icon: Smartphone, color: 'orange', label: 'SMS' };
                        case 'meeting': return { icon: Clock, color: 'indigo', label: 'Reunião' };
                        default: return { icon: MessageSquare, color: 'slate', label: comm.type };
                      }
                    };
                    const config = getTypeConfig();
                    const Icon = config.icon;

                    return (
                      <div
                        key={comm.id}
                        className={`border rounded-lg p-3 bg-${config.color}-50/50 border-${config.color}-200`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-full bg-${config.color}-100`}>
                              <Icon className={`w-3.5 h-3.5 text-${config.color}-600`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {config.label}
                                </span>
                                {comm.direction === 'inbound' ? (
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                    <ArrowDownLeft className="w-3 h-3 mr-1" />
                                    Recebido
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                    Enviado
                                  </Badge>
                                )}
                                {comm.source === 'gmail' && (
                                  <Badge variant="outline" className="text-xs">Gmail</Badge>
                                )}
                              </div>
                              {comm.subject && (
                                <p className="text-xs text-slate-600 font-medium">{comm.subject}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-slate-500">
                              {formatDistanceToNow(comm.date, { addSuffix: true, locale: pt })}
                            </span>
                            {comm.message && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(comm.message)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {comm.message && (
                          <p className="text-sm text-slate-700 line-clamp-2 mt-1 pl-8">
                            {comm.message}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1 pl-8">
                          {format(comm.date, 'dd/MM/yyyy HH:mm', { locale: pt })}
                          {comm.agent && ` • ${comm.agent.split('@')[0]}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}