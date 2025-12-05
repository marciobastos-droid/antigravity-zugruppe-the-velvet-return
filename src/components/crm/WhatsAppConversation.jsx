import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, Send, RefreshCw, CheckCheck, Check, 
  Clock, Image, FileText, Mic, Video, MapPin, Loader2,
  Phone, AlertCircle, ChevronDown
} from "lucide-react";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

export default function WhatsAppConversation({ contact, onMessageSent }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [useTemplate, setUseTemplate] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const messagesEndRef = React.useRef(null);
  const scrollAreaRef = React.useRef(null);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const MESSAGES_PER_PAGE = 20;

  const { data: allMessages = [], isLoading, refetch } = useQuery({
    queryKey: ['whatsappMessages', contact?.id],
    queryFn: async () => {
      if (!contact?.phone) return [];
      const allMessages = await base44.entities.WhatsAppMessage.list('-timestamp');
      // Normalizar telefone para comparação
      const contactPhone = contact.phone.replace(/\D/g, '');
      return allMessages.filter(m => {
        const msgPhone = m.contact_phone?.replace(/\D/g, '');
        return msgPhone === contactPhone || m.contact_id === contact.id;
      });
    },
    enabled: !!contact?.phone,
    refetchInterval: 10000 // Atualizar a cada 10 segundos
  });

  // Paginated messages
  const messages = React.useMemo(() => {
    return allMessages.slice(0, page * MESSAGES_PER_PAGE);
  }, [allMessages, page]);

  // Check if there are more messages to load
  React.useEffect(() => {
    setHasMore(messages.length < allMessages.length);
  }, [messages.length, allMessages.length]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (!isLoadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingMore]);

  // Handle scroll to load more
  const handleScroll = (event) => {
    const target = event.target;
    if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  const loadMoreMessages = async () => {
    setIsLoadingMore(true);
    const previousHeight = scrollAreaRef.current?.scrollHeight || 0;
    
    setTimeout(() => {
      setPage(prev => prev + 1);
      setIsLoadingMore(false);
      
      // Maintain scroll position
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const newHeight = scrollAreaRef.current.scrollHeight;
          scrollAreaRef.current.scrollTop = newHeight - previousHeight;
        }
      }, 100);
    }, 500);
  };

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      let dateKey;
      
      if (isToday(date)) {
        dateKey = 'Hoje';
      } else if (isYesterday(date)) {
        dateKey = 'Ontem';
      } else if (differenceInDays(new Date(), date) <= 7) {
        dateKey = format(date, "EEEE", { locale: pt });
      } else {
        dateKey = format(date, "d 'de' MMMM", { locale: pt });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  }, [messages]);

  // WhatsApp is configured via environment variables on the backend
  // We just need to check if user is authenticated
  const isWhatsAppConfigured = true;

  const sendMessage = async () => {
    if (!message.trim()) return;

    setSending(true);
    
    try {
      const response = await base44.functions.invoke('sendWhatsApp', {
        phoneNumber: contact.phone,
        message: message,
        contactId: contact.id,
        contactName: contact.full_name,
        useTemplate: useTemplate,
        templateName: 'hello_world'
      });

      const result = response?.data;
      
      if (result?.success) {
        setMessage("");
        setUseTemplate(false);
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['whatsappMessages', contact?.id] });
        queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
        toast.success("Mensagem enviada!");
        onMessageSent?.();
      } else {
        if (result?.config_missing) {
          toast.error("WhatsApp não configurado. Configure as credenciais nas variáveis de ambiente.");
        } else {
          toast.error("Erro ao enviar: " + (result?.error || 'Erro desconhecido'));
        }
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      toast.error("Erro ao enviar: " + (error.message || 'Erro desconhecido'));
    }
    setSending(false);
  };

  const syncMessages = async () => {
    if (!isWhatsAppConfigured) {
      toast.error("WhatsApp não configurado");
      return;
    }

    try {
      // Sincronizar mensagens pendentes para o histórico de comunicações
      const unsyncedMessages = messages.filter(m => !m.synced_to_communication_log);
      
      for (const msg of unsyncedMessages) {
        await base44.entities.CommunicationLog.create({
          contact_id: contact.id,
          contact_name: contact.full_name,
          communication_type: 'whatsapp',
          direction: msg.direction,
          summary: msg.content?.substring(0, 200) || `[${msg.message_type}]`,
          communication_date: msg.timestamp,
          agent_email: msg.agent_email || user.email
        });

        await base44.entities.WhatsAppMessage.update(msg.id, {
          synced_to_communication_log: true
        });
      }

      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
      refetch();
      toast.success(`${unsyncedMessages.length} mensagens sincronizadas!`);
    } catch (error) {
      toast.error("Erro ao sincronizar");
    }
  };

  const messageTypeIcons = {
    text: MessageSquare,
    image: Image,
    document: FileText,
    audio: Mic,
    video: Video,
    location: MapPin
  };

  const statusIcons = {
    sent: <Check className="w-3 h-3 text-slate-400" />,
    delivered: <CheckCheck className="w-3 h-3 text-slate-400" />,
    read: <CheckCheck className="w-3 h-3 text-blue-500" />,
    failed: <AlertCircle className="w-3 h-3 text-red-500" />
  };

  if (!contact?.phone) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">
          <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Este contacto não tem número de telefone</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{contact.full_name}</CardTitle>
              <p className="text-sm text-slate-500">{contact.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isWhatsAppConfigured && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Não configurado
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={syncMessages}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <ScrollArea 
        className="flex-1 p-4" 
        ref={scrollAreaRef}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma mensagem</p>
            <p className="text-xs mt-1">Inicie uma conversa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Load More Indicator */}
            {hasMore && (
              <div className="flex justify-center py-2">
                {isLoadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadMoreMessages}
                    className="text-xs text-slate-500"
                  >
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Carregar mensagens antigas ({allMessages.length - messages.length} restantes)
                  </Button>
                )}
              </div>
            )}

            {/* Messages grouped by date */}
            {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date separator */}
                <div className="flex items-center justify-center">
                  <div className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full">
                    {dateKey}
                  </div>
                </div>

                {/* Messages for this date */}
                {dateMessages.map((msg) => {
                  const Icon = messageTypeIcons[msg.message_type] || MessageSquare;
                  const isOutbound = msg.direction === 'outbound';
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                          isOutbound
                            ? 'bg-green-500 text-white rounded-br-none'
                            : 'bg-white text-slate-900 rounded-bl-none border border-slate-200'
                        }`}
                      >
                        {msg.message_type !== 'text' && (
                          <div className="flex items-center gap-1 text-xs opacity-75 mb-1">
                            <Icon className="w-3 h-3" />
                            {msg.message_type}
                          </div>
                        )}
                        
                        {msg.media_url && msg.message_type === 'image' && (
                          <img 
                            src={msg.media_url} 
                            alt="" 
                            className="max-w-full rounded mb-2"
                          />
                        )}
                        
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isOutbound ? 'justify-end text-green-100' : 'text-slate-500'
                        }`}>
                          <span>
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                          {isOutbound && statusIcons[msg.status]}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Primeiro contacto? Ative "Usar Template" para garantir entrega.</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="rounded border-slate-300"
            />
            Usar Template (primeiro contacto)
          </label>
        </div>
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={useTemplate ? "Template será enviado..." : "Escreva uma mensagem..."}
            disabled={sending || useTemplate}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={(!message.trim() && !useTemplate) || sending}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}