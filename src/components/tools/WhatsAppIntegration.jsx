import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, Send, Phone, CheckCircle2, XCircle, 
  Loader2, RefreshCw, User, Clock, ArrowDownLeft, ArrowUpRight,
  Settings, TestTube, Search, Filter, MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function WhatsAppIntegration() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("conversations");
  const [selectedContact, setSelectedContact] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do CRM Zugruppe.");
  const [testing, setTesting] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['whatsappMessages'],
    queryFn: () => base44.entities.WhatsAppMessage.list('-timestamp', 100),
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date', 500)
  });

  // Group messages by contact
  const conversationsByContact = React.useMemo(() => {
    const grouped = {};
    messages.forEach(msg => {
      const key = msg.contact_id || msg.contact_phone;
      if (!grouped[key]) {
        grouped[key] = {
          contact_id: msg.contact_id,
          contact_phone: msg.contact_phone,
          contact_name: msg.contact_name || 'Desconhecido',
          messages: [],
          lastMessage: null,
          unreadCount: 0
        };
      }
      grouped[key].messages.push(msg);
      if (!grouped[key].lastMessage || new Date(msg.timestamp) > new Date(grouped[key].lastMessage.timestamp)) {
        grouped[key].lastMessage = msg;
      }
      if (msg.direction === 'inbound' && msg.status !== 'read') {
        grouped[key].unreadCount++;
      }
    });

    // Sort by last message timestamp
    return Object.values(grouped).sort((a, b) => 
      new Date(b.lastMessage?.timestamp || 0) - new Date(a.lastMessage?.timestamp || 0)
    );
  }, [messages]);

  // Filter conversations
  const filteredConversations = conversationsByContact.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.contact_name?.toLowerCase().includes(search) ||
      conv.contact_phone?.includes(search)
    );
  });

  // Get messages for selected contact
  const selectedMessages = React.useMemo(() => {
    if (!selectedContact) return [];
    const conv = conversationsByContact.find(c => 
      c.contact_id === selectedContact.contact_id || 
      c.contact_phone === selectedContact.contact_phone
    );
    return (conv?.messages || []).sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }, [selectedContact, conversationsByContact]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact?.contact_phone) {
      toast.error("Escreva uma mensagem");
      return;
    }

    setSending(true);
    try {
      const response = await base44.functions.invoke('sendWhatsApp', {
        phoneNumber: selectedContact.contact_phone,
        message: newMessage,
        contactId: selectedContact.contact_id,
        contactName: selectedContact.contact_name
      });

      if (response.data?.success) {
        toast.success("Mensagem enviada!");
        setNewMessage("");
        refetchMessages();
      } else {
        toast.error(response.data?.error || "Erro ao enviar");
      }
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
    setSending(false);
  };

  // Send test message
  const handleTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast.error("Preencha o número e a mensagem");
      return;
    }

    setTesting(true);
    try {
      const response = await base44.functions.invoke('sendWhatsApp', {
        phoneNumber: testPhone,
        message: testMessage,
        useTemplate: true // Use template for first contact
      });

      if (response.data?.success) {
        toast.success("Mensagem de teste enviada!");
        setTestPhone("");
        refetchMessages();
      } else {
        const errorMsg = response.data?.error || "Erro ao enviar";
        if (response.data?.config_missing) {
          toast.error("Configure as credenciais WhatsApp nas variáveis de ambiente");
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
    setTesting(false);
  };

  // Start new conversation
  const startConversation = (contact) => {
    setSelectedContact({
      contact_id: contact.id,
      contact_phone: contact.phone,
      contact_name: contact.full_name
    });
    setActiveTab("conversations");
  };

  // Stats
  const stats = React.useMemo(() => ({
    totalMessages: messages.length,
    sentToday: messages.filter(m => 
      m.direction === 'outbound' && 
      new Date(m.timestamp).toDateString() === new Date().toDateString()
    ).length,
    receivedToday: messages.filter(m => 
      m.direction === 'inbound' && 
      new Date(m.timestamp).toDateString() === new Date().toDateString()
    ).length,
    activeConversations: conversationsByContact.length
  }), [messages, conversationsByContact]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activeConversations}</div>
            <div className="text-xs text-slate-500">Conversas Ativas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.sentToday}</div>
            <div className="text-xs text-slate-500">Enviadas Hoje</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.receivedToday}</div>
            <div className="text-xs text-slate-500">Recebidas Hoje</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-600">{stats.totalMessages}</div>
            <div className="text-xs text-slate-500">Total Mensagens</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="conversations">
            <MessageSquare className="w-4 h-4 mr-2" />
            Conversas
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <User className="w-4 h-4 mr-2" />
            Contactos
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="w-4 h-4 mr-2" />
            Testar
          </TabsTrigger>
        </TabsList>

        {/* Conversations Tab */}
        <TabsContent value="conversations" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4 h-[600px]">
            {/* Conversation List */}
            <Card className="md:col-span-1">
              <CardHeader className="py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar conversas..."
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conversa</p>
                    </div>
                  ) : (
                    filteredConversations.map((conv, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedContact(conv)}
                        className={`p-3 border-b cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedContact?.contact_phone === conv.contact_phone ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-900 truncate">{conv.contact_name}</span>
                              {conv.unreadCount > 0 && (
                                <Badge className="bg-green-500 text-xs">{conv.unreadCount}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">{conv.contact_phone}</p>
                            <p className="text-sm text-slate-600 truncate mt-1">
                              {conv.lastMessage?.content?.substring(0, 40)}...
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {conv.lastMessage?.timestamp && format(new Date(conv.lastMessage.timestamp), "dd/MM HH:mm", { locale: pt })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat View */}
            <Card className="md:col-span-2">
              {selectedContact ? (
                <>
                  <CardHeader className="py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{selectedContact.contact_name}</h3>
                        <p className="text-sm text-slate-500">{selectedContact.contact_phone}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col h-[500px]">
                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-3">
                        {selectedMessages.map((msg, idx) => (
                          <div 
                            key={idx}
                            className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] rounded-lg px-3 py-2 ${
                              msg.direction === 'outbound' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-slate-100 text-slate-900'
                            }`}>
                              <p className="text-sm">{msg.content}</p>
                              <div className={`flex items-center gap-1 mt-1 text-xs ${
                                msg.direction === 'outbound' ? 'text-green-100' : 'text-slate-500'
                              }`}>
                                <span>{format(new Date(msg.timestamp), "HH:mm", { locale: pt })}</span>
                                {msg.direction === 'outbound' && (
                                  msg.status === 'read' ? (
                                    <span className="text-blue-200">✓✓</span>
                                  ) : msg.status === 'delivered' ? (
                                    <span>✓✓</span>
                                  ) : (
                                    <span>✓</span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-3 border-t bg-slate-50">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Escreva uma mensagem..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          disabled={sending}
                        />
                        <Button 
                          onClick={handleSendMessage}
                          disabled={sending || !newMessage.trim()}
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
                  </CardContent>
                </>
              ) : (
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Selecione uma conversa para ver as mensagens</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contactos com Telefone</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {contacts.filter(c => c.phone).map(contact => (
                    <div 
                      key={contact.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.full_name}</p>
                          <p className="text-sm text-slate-500">{contact.phone}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startConversation(contact)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Enviar Mensagem de Teste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> Para primeiro contacto com um número, será usada a template "hello_world" aprovada pelo Meta. 
                  Mensagens de texto livre só funcionam dentro de uma janela de conversa de 24 horas.
                </p>
              </div>

              <div>
                <Label>Número de Telefone</Label>
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Ex: 912345678 ou +351912345678"
                />
                <p className="text-xs text-slate-500 mt-1">Números portugueses sem código serão convertidos automaticamente</p>
              </div>

              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Escreva a sua mensagem..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleTestMessage}
                disabled={testing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Mensagem de Teste
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}