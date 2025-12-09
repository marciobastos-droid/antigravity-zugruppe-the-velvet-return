import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, MessageSquare, Send, Phone, Video, Calendar, 
  Clock, ArrowDownLeft, ArrowUpRight, Loader2, Eye, 
  Reply, Star, CheckCircle2, FileText, Sparkles, Copy,
  RefreshCw, AlertCircle, CheckCheck
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

export default function UnifiedCommunicationsHub({ 
  contact, // contact or opportunity object
  type = "contact" // 'contact' or 'opportunity'
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("history");
  const messagesEndRef = useRef(null);
  
  // Email state
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // WhatsApp state
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsappConversation, setWhatsappConversation] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: async () => {
      const all = await base44.entities.EmailTemplate.list();
      return all.filter(t => t.is_active);
    }
  });

  // Fetch all communications
  const { data: communicationLogs = [], refetch: refetchComms } = useQuery({
    queryKey: ['communicationLogs', contact?.id],
    queryFn: async () => {
      const all = await base44.entities.CommunicationLog.list('-communication_date', 100);
      return all.filter(c => c.contact_id === contact.id);
    },
    enabled: !!contact?.id
  });

  const { data: sentEmails = [] } = useQuery({
    queryKey: ['sentEmails', contact?.id],
    queryFn: async () => {
      const all = await base44.entities.SentEmail.list('-sent_at', 50);
      return all.filter(e => e.recipient_id === contact.id);
    },
    enabled: !!contact?.id
  });

  const { data: whatsappMessages = [], refetch: refetchWhatsApp } = useQuery({
    queryKey: ['whatsappMessages', contact?.phone || contact?.buyer_phone],
    queryFn: async () => {
      const phone = (contact.phone || contact.buyer_phone)?.replace(/\D/g, '');
      if (!phone) return [];
      const all = await base44.entities.WhatsAppMessage.list('-timestamp', 100);
      return all.filter(m => 
        m.contact_phone?.includes(phone) || 
        m.contact_id === contact.id
      );
    },
    enabled: !!(contact?.phone || contact?.buyer_phone)
  });

  // Merge all communications into unified timeline
  const unifiedHistory = React.useMemo(() => {
    const items = [];

    // From CommunicationLog
    communicationLogs.forEach(log => {
      items.push({
        id: `comm-${log.id}`,
        type: log.communication_type,
        direction: log.direction,
        subject: log.subject,
        message: log.summary,
        detailedNotes: log.detailed_notes,
        date: new Date(log.communication_date || log.created_date),
        outcome: log.outcome,
        agent: log.agent_name,
        duration: log.duration_minutes,
        // Email specific
        emailStatus: log.email_status,
        emailOpenedAt: log.email_opened_at,
        emailRepliedAt: log.email_replied_at,
        emailClicks: log.email_clicks,
        // Phone specific
        callOutcome: log.call_outcome,
        callDuration: log.call_duration_seconds,
        callQuality: log.call_quality_rating,
        // WhatsApp specific
        whatsappStatus: log.whatsapp_status,
        whatsappDeliveredAt: log.whatsapp_delivered_at,
        whatsappReadAt: log.whatsapp_read_at,
        whatsappRepliedAt: log.whatsapp_replied_at,
        source: 'log'
      });
    });

    // From SentEmail
    sentEmails.forEach(email => {
      items.push({
        id: `email-${email.id}`,
        type: 'email',
        direction: 'outbound',
        subject: email.subject,
        message: email.body,
        date: new Date(email.sent_at),
        emailStatus: email.status,
        emailOpenedAt: email.opened_at,
        emailClickedAt: email.clicked_at,
        template: email.template_name,
        agent: email.sent_by,
        source: 'sent_email'
      });
    });

    // From WhatsAppMessage
    whatsappMessages.forEach(msg => {
      const contactPhone = (contact.phone || contact.buyer_phone)?.replace(/\D/g, '');
      const isInbound = msg.direction === 'inbound';
      
      items.push({
        id: `wa-${msg.id}`,
        type: 'whatsapp',
        direction: msg.direction,
        message: msg.content,
        date: new Date(msg.timestamp || msg.created_date),
        whatsappStatus: msg.status,
        messageType: msg.message_type,
        mediaUrl: msg.media_url,
        source: 'whatsapp'
      });
    });

    return items.sort((a, b) => b.date - a.date);
  }, [communicationLogs, sentEmails, whatsappMessages, contact]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === "whatsapp") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [whatsappConversation, activeTab]);

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const replacements = {
        '{{nome_completo}}': contact.full_name || contact.buyer_name || contact.contact_name || '',
        '{{primeiro_nome}}': (contact.full_name || contact.buyer_name || '').split(' ')[0] || '',
        '{{email}}': contact.email || contact.buyer_email || '',
        '{{telefone}}': contact.phone || contact.buyer_phone || '',
        '{{cidade}}': contact.city || contact.location || '',
        '{{agente_nome}}': user?.full_name || '',
        '{{agente_email}}': user?.email || '',
        '{{data_atual}}': new Date().toLocaleDateString('pt-PT')
      };

      let processedSubject = template.subject;
      let processedBody = template.body;

      Object.entries(replacements).forEach(([key, value]) => {
        processedSubject = processedSubject.replace(new RegExp(key, 'g'), value);
        processedBody = processedBody.replace(new RegExp(key, 'g'), value);
      });

      setEmailSubject(processedSubject);
      setEmailBody(processedBody);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Preencha assunto e mensagem");
      return;
    }

    const recipientEmail = contact.email || contact.buyer_email;
    if (!recipientEmail) {
      toast.error("Contacto sem email");
      return;
    }

    setSendingEmail(true);
    try {
      // Send via Gmail integration
      const response = await base44.functions.invoke('gmailIntegration', {
        action: 'sendEmail',
        to: recipientEmail,
        subject: emailSubject,
        body: emailBody
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Log to SentEmail
      await base44.entities.SentEmail.create({
        recipient_id: contact.id,
        recipient_type: type,
        recipient_name: contact.full_name || contact.buyer_name || contact.contact_name,
        recipient_email: recipientEmail,
        subject: emailSubject,
        body: emailBody,
        template_id: selectedTemplate || null,
        sent_by: user?.email,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });

      // Log communication
      await base44.functions.invoke('logCommunication', {
        contact_id: contact.id,
        contact_email: recipientEmail,
        type: 'email',
        direction: 'outbound',
        subject: emailSubject,
        summary: emailBody.substring(0, 200),
        outcome: 'successful'
      });

      toast.success("Email enviado com sucesso!");
      setEmailSubject("");
      setEmailBody("");
      setSelectedTemplate("");
      
      queryClient.invalidateQueries({ queryKey: ['sentEmails'] });
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
    } catch (error) {
      console.error("Email error:", error);
      toast.error(`Erro ao enviar email: ${error.message}`);
    }
    setSendingEmail(false);
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappMessage.trim()) {
      toast.error("Escreva uma mensagem");
      return;
    }

    const phone = (contact.phone || contact.buyer_phone)?.replace(/\D/g, '');
    if (!phone) {
      toast.error("Contacto sem telefone");
      return;
    }

    setSendingWhatsApp(true);
    try {
      // Send via WhatsApp API
      const response = await base44.functions.invoke('sendWhatsApp', {
        phone: phone,
        message: whatsappMessage,
        contact_id: contact.id,
        contact_name: contact.full_name || contact.buyer_name
      });

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Log to WhatsAppMessage
      await base44.entities.WhatsAppMessage.create({
        contact_id: contact.id,
        contact_phone: phone,
        contact_name: contact.full_name || contact.buyer_name,
        agent_email: user?.email,
        direction: 'outbound',
        message_type: 'text',
        content: whatsappMessage,
        status: 'sent',
        timestamp: new Date().toISOString()
      });

      // Log communication
      await base44.functions.invoke('logCommunication', {
        contact_id: contact.id,
        type: 'whatsapp',
        direction: 'outbound',
        summary: whatsappMessage,
        outcome: 'successful'
      });

      toast.success("Mensagem WhatsApp enviada!");
      setWhatsappMessage("");
      
      queryClient.invalidateQueries({ queryKey: ['whatsappMessages'] });
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
    } catch (error) {
      console.error("WhatsApp error:", error);
      toast.error(`Erro ao enviar WhatsApp: ${error.message}`);
    }
    setSendingWhatsApp(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const getTypeIcon = (commType) => {
    const icons = {
      email: Mail,
      whatsapp: MessageSquare,
      phone_call: Phone,
      video_call: Video,
      meeting: Calendar,
      sms: MessageSquare,
      site_visit: Calendar
    };
    return icons[commType] || MessageSquare;
  };

  const getTypeColor = (commType) => {
    const colors = {
      email: 'blue',
      whatsapp: 'green',
      phone_call: 'purple',
      video_call: 'indigo',
      meeting: 'amber',
      sms: 'orange'
    };
    return colors[commType] || 'slate';
  };

  const stats = {
    total: unifiedHistory.length,
    emails: unifiedHistory.filter(h => h.type === 'email').length,
    whatsapp: unifiedHistory.filter(h => h.type === 'whatsapp').length,
    calls: unifiedHistory.filter(h => h.type === 'phone_call').length
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Mail className="w-5 h-5 mx-auto text-blue-600 mb-1" />
            <div className="text-2xl font-bold text-blue-900">{stats.emails}</div>
            <div className="text-xs text-blue-600">Emails</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <MessageSquare className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <div className="text-2xl font-bold text-green-900">{stats.whatsapp}</div>
            <div className="text-xs text-green-600">WhatsApp</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Phone className="w-5 h-5 mx-auto text-purple-600 mb-1" />
            <div className="text-2xl font-bold text-purple-900">{stats.calls}</div>
            <div className="text-xs text-purple-600">Chamadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Communication Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Comunicações</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchComms();
                refetchWhatsApp();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Email Tab */}
            <TabsContent value="email" className="space-y-4 mt-4">
              <div>
                <Label>Template (opcional)</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolher template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
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

              <div>
                <Label>Para</Label>
                <Input 
                  value={contact.email || contact.buyer_email || "Sem email"} 
                  disabled 
                  className="bg-slate-50" 
                />
              </div>

              <div>
                <Label>Assunto *</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Assunto do email..."
                />
              </div>

              <div>
                <Label className="flex items-center justify-between">
                  Mensagem *
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Campos dinâmicos
                  </Badge>
                </Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Olá {{primeiro_nome}},&#10;&#10;Escreva a sua mensagem aqui...&#10;&#10;Cumprimentos,&#10;{{agente_nome}}"
                  rows={10}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use: {"{{primeiro_nome}}"}, {"{{email}}"}, {"{{telefone}}"}, {"{{agente_nome}}"}
                </p>
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject || !emailBody || !(contact.email || contact.buyer_email)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {sendingEmail ? (
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
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div>
                <Label>Para</Label>
                <Input 
                  value={contact.phone || contact.buyer_phone || "Sem telefone"} 
                  disabled 
                  className="bg-slate-50" 
                />
              </div>

              {/* WhatsApp Conversation */}
              <ScrollArea className="h-[300px] border rounded-lg p-4 bg-slate-50">
                <div className="space-y-2">
                  {whatsappMessages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Nenhuma mensagem WhatsApp
                    </div>
                  ) : (
                    whatsappMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.direction === 'outbound'
                              ? 'bg-green-600 text-white'
                              : 'bg-white border border-slate-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs opacity-70">
                              {format(new Date(msg.timestamp || msg.created_date), 'HH:mm')}
                            </span>
                            {msg.direction === 'outbound' && msg.status === 'read' && (
                              <CheckCheck className="w-3 h-3 text-blue-300" />
                            )}
                            {msg.direction === 'outbound' && msg.status === 'delivered' && (
                              <CheckCheck className="w-3 h-3 opacity-70" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Send WhatsApp Message */}
              <div className="flex gap-2">
                <Textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Escreva a sua mensagem..."
                  rows={3}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendWhatsApp();
                    }
                  }}
                />
                <Button
                  onClick={handleSendWhatsApp}
                  disabled={sendingWhatsApp || !whatsappMessage.trim() || !(contact.phone || contact.buyer_phone)}
                  className="bg-green-600 hover:bg-green-700 self-end"
                >
                  {sendingWhatsApp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Pressione Enter para enviar, Shift+Enter para nova linha
              </p>
            </TabsContent>

            {/* Unified History Tab */}
            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[500px]">
                {unifiedHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma comunicação registada</p>
                    <p className="text-xs mt-1">Envie um email ou mensagem WhatsApp para começar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unifiedHistory.map((comm) => {
                      const Icon = getTypeIcon(comm.type);
                      const color = getTypeColor(comm.type);
                      
                      return (
                        <div
                          key={comm.id}
                          className={`border-l-4 border-l-${color}-500 bg-${color}-50/50 rounded-lg p-4 hover:shadow-sm transition-shadow`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-full bg-${color}-100`}>
                                <Icon className={`w-4 h-4 text-${color}-600`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-900 text-sm">
                                    {comm.type === 'email' ? 'Email' :
                                     comm.type === 'whatsapp' ? 'WhatsApp' :
                                     comm.type === 'phone_call' ? 'Chamada' :
                                     comm.type}
                                  </span>
                                  {comm.direction === 'inbound' ? (
                                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                      <ArrowDownLeft className="w-3 h-3 mr-1" />
                                      Recebido
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                                      <ArrowUpRight className="w-3 h-3 mr-1" />
                                      Enviado
                                    </Badge>
                                  )}
                                  {comm.source === 'sent_email' && comm.template && (
                                    <Badge variant="outline" className="text-xs">
                                      <FileText className="w-3 h-3 mr-1" />
                                      {comm.template}
                                    </Badge>
                                  )}
                                </div>
                                {comm.subject && (
                                  <p className="text-xs font-medium text-slate-700 mt-0.5">{comm.subject}</p>
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
                            <p className="text-sm text-slate-700 line-clamp-3 mb-2">
                              {comm.message}
                            </p>
                          )}

                          {/* Email Status */}
                          {comm.type === 'email' && comm.emailStatus && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              <Badge className={
                                comm.emailStatus === 'sent' ? 'bg-blue-100 text-blue-700' :
                                comm.emailStatus === 'opened' ? 'bg-green-100 text-green-700' :
                                comm.emailStatus === 'clicked' ? 'bg-emerald-100 text-emerald-700' :
                                comm.emailStatus === 'replied' ? 'bg-purple-100 text-purple-700' :
                                'bg-slate-100 text-slate-700'
                              }>
                                {comm.emailStatus === 'opened' && <Eye className="w-3 h-3 mr-1" />}
                                {comm.emailStatus === 'replied' && <Reply className="w-3 h-3 mr-1" />}
                                {comm.emailStatus === 'sent' && <Send className="w-3 h-3 mr-1" />}
                                {comm.emailStatus}
                              </Badge>
                              {comm.emailOpenedAt && (
                                <span className="text-xs text-green-600">
                                  Aberto: {format(new Date(comm.emailOpenedAt), "dd/MM HH:mm")}
                                </span>
                              )}
                            </div>
                          )}

                          {/* WhatsApp Status */}
                          {comm.type === 'whatsapp' && comm.whatsappStatus && (
                            <div className="flex items-center gap-2">
                              <Badge className={
                                comm.whatsappStatus === 'read' ? 'bg-green-100 text-green-700' :
                                comm.whatsappStatus === 'delivered' ? 'bg-cyan-100 text-cyan-700' :
                                comm.whatsappStatus === 'sent' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }>
                                {comm.whatsappStatus === 'read' && '✓✓ '}
                                {comm.whatsappStatus === 'delivered' && '✓✓ '}
                                {comm.whatsappStatus === 'sent' && '✓ '}
                                {comm.whatsappStatus}
                              </Badge>
                              {comm.whatsappReadAt && (
                                <span className="text-xs text-green-600">
                                  Lida: {format(new Date(comm.whatsappReadAt), "dd/MM HH:mm")}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(comm.date, "dd/MM/yyyy HH:mm")}
                            </span>
                            {comm.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {comm.duration} min
                              </span>
                            )}
                            {comm.agent && (
                              <span>por {comm.agent}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}