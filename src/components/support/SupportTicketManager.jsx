import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Ticket, Plus, Clock, CheckCircle2, AlertCircle, 
  MessageSquare, Crown, Star, Loader2, Calendar, User, Send
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription } from "../subscription/useSubscription";
import PremiumBadge from "../subscription/PremiumBadge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SupportTicketManager() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { subscription, isPremium, isEnterprise } = useSubscription();

  const { data: tickets = [] } = useQuery({
    queryKey: ['supportTickets', user?.email],
    queryFn: async () => {
      const isAdmin = user.role === 'admin' || user.user_type === 'admin';
      if (isAdmin) {
        return await base44.entities.SupportTicket.list('-created_date');
      }
      return await base44.entities.SupportTicket.filter({ user_email: user.email });
    },
    enabled: !!user
  });

  const [newTicket, setNewTicket] = useState({
    category: 'general',
    subject: '',
    description: ''
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData) => {
      const { data: refData } = await base44.functions.invoke('generateRefId', { 
        entity_type: 'SupportTicket' 
      });

      // Calculate SLA deadline based on plan
      const slaHours = isEnterprise ? 2 : isPremium ? 4 : 24;
      const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

      return await base44.entities.SupportTicket.create({
        ...ticketData,
        ticket_number: refData.ref_id,
        user_email: user.email,
        user_name: user.full_name,
        subscription_plan: subscription?.plan || 'free',
        priority: isEnterprise ? 'urgent' : isPremium ? 'high' : 'medium',
        sla_deadline: slaDeadline,
        status: 'open',
        responses: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      setCreateDialogOpen(false);
      setNewTicket({ category: 'general', subject: '', description: '' });
      toast.success("Ticket criado com sucesso!");
    }
  });

  const addResponseMutation = useMutation({
    mutationFn: async ({ ticketId, message }) => {
      const ticket = tickets.find(t => t.id === ticketId);
      const responses = ticket.responses || [];
      
      responses.push({
        author_email: user.email,
        author_name: user.full_name,
        message,
        timestamp: new Date().toISOString(),
        is_internal: false
      });

      return await base44.entities.SupportTicket.update(ticketId, { responses });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      setReplyMessage("");
      toast.success("Resposta enviada!");
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }) => 
      base44.entities.SupportTicket.update(ticketId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      toast.success("Estado atualizado!");
    }
  });

  const statusConfig = {
    open: { color: "bg-blue-600", label: "Aberto", icon: AlertCircle },
    in_progress: { color: "bg-yellow-600", label: "Em Progresso", icon: Clock },
    waiting_response: { color: "bg-orange-600", label: "Aguarda Resposta", icon: MessageSquare },
    resolved: { color: "bg-green-600", label: "Resolvido", icon: CheckCircle2 },
    closed: { color: "bg-slate-600", label: "Fechado", icon: CheckCircle2 }
  };

  const categoryLabels = {
    technical: "Técnico",
    billing: "Faturação",
    feature_request: "Nova Funcionalidade",
    bug: "Bug",
    general: "Geral",
    account: "Conta"
  };

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_response');
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="w-6 h-6" />
            Suporte
          </h2>
          <p className="text-slate-600">
            {isPremium ? (
              <span className="flex items-center gap-2 mt-1">
                <Crown className="w-4 h-4 text-blue-600" />
                Suporte prioritário com SLA {isEnterprise ? '2h' : '4h'}
              </span>
            ) : (
              "Suporte standard - resposta em até 24h"
            )}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Ticket de Suporte</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {!isPremium && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Crown className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-1">Upgrade para Suporte Prioritário</h4>
                      <p className="text-sm text-amber-700 mb-2">
                        Utilizadores Premium têm resposta garantida em 4h. Enterprise em 2h.
                      </p>
                      <Link to={createPageUrl("Subscriptions")}>
                        <Button size="sm" variant="outline" className="border-amber-600 text-amber-600">
                          Ver Planos Premium
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>Categoria *</Label>
                <Select value={newTicket.category} onValueChange={(v) => setNewTicket({...newTicket, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assunto *</Label>
                <Input
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  placeholder="Resumo do problema..."
                />
              </div>

              <div>
                <Label>Descrição *</Label>
                <Textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Descreva o problema em detalhe..."
                  rows={6}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createTicketMutation.mutate(newTicket)}
                  disabled={!newTicket.subject || !newTicket.description || createTicketMutation.isPending}
                  className="flex-1"
                >
                  {createTicketMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Criar Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total</div>
            <div className="text-2xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Abertos</div>
            <div className="text-2xl font-bold text-blue-600">{openTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Resolvidos</div>
            <div className="text-2xl font-bold text-green-600">{closedTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Tempo Médio</div>
            <div className="text-2xl font-bold">{isPremium ? '2-4h' : '24h'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Abertos ({openTickets.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Resolvidos ({closedTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-3 mt-4">
          {openTickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                Nenhum ticket aberto
              </CardContent>
            </Card>
          ) : (
            openTickets.map(ticket => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onClick={() => setSelectedTicket(ticket)}
                statusConfig={statusConfig}
                categoryLabels={categoryLabels}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-3 mt-4">
          {closedTickets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                Nenhum ticket resolvido
              </CardContent>
            </Card>
          ) : (
            closedTickets.map(ticket => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                onClick={() => setSelectedTicket(ticket)}
                statusConfig={statusConfig}
                categoryLabels={categoryLabels}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5" />
                    {selectedTicket.ticket_number}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <PremiumBadge plan={selectedTicket.subscription_plan} size="sm" />
                    <Badge className={statusConfig[selectedTicket.status].color}>
                      {statusConfig[selectedTicket.status].label}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="text-xs text-slate-500">Categoria</div>
                    <div className="font-medium">{categoryLabels[selectedTicket.category]}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Prioridade</div>
                    <Badge variant="outline" className="capitalize">{selectedTicket.priority}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Criado</div>
                    <div className="text-sm">{new Date(selectedTicket.created_date).toLocaleString('pt-PT')}</div>
                  </div>
                  {selectedTicket.sla_deadline && (
                    <div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        SLA Garantido
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        {new Date(selectedTicket.sla_deadline).toLocaleString('pt-PT')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subject & Description */}
                <div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">{selectedTicket.subject}</h3>
                  <p className="text-slate-700 whitespace-pre-line">{selectedTicket.description}</p>
                </div>

                {/* Responses */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Histórico de Respostas</h4>
                  <div className="space-y-3">
                    {selectedTicket.responses?.map((response, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-lg ${
                          response.author_email === user.email 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-500" />
                            <span className="font-medium text-sm">{response.author_name}</span>
                            {response.author_email !== user.email && (
                              <Badge className="bg-purple-600 text-white text-xs">Suporte</Badge>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(response.timestamp).toLocaleString('pt-PT')}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm whitespace-pre-line">{response.message}</p>
                      </div>
                    ))}

                    {(!selectedTicket.responses || selectedTicket.responses.length === 0) && (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Aguardando primeira resposta do suporte...
                      </p>
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t pt-4">
                    <Label>Adicionar Resposta</Label>
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Escreva a sua mensagem..."
                      rows={4}
                      className="mt-2"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => addResponseMutation.mutate({ 
                          ticketId: selectedTicket.id, 
                          message: replyMessage 
                        })}
                        disabled={!replyMessage.trim() || addResponseMutation.isPending}
                      >
                        {addResponseMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Enviar
                      </Button>
                      {user.role === 'admin' && (
                        <Select 
                          value={selectedTicket.status} 
                          onValueChange={(status) => updateStatusMutation.mutate({ 
                            ticketId: selectedTicket.id, 
                            status 
                          })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ticket Card Component
function TicketCard({ ticket, onClick, statusConfig, categoryLabels }) {
  const config = statusConfig[ticket.status];
  const Icon = config.icon;
  const isOverdue = ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date() && ticket.status === 'open';

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all ${
        isOverdue ? 'border-2 border-red-500' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="font-mono text-xs">{ticket.ticket_number}</Badge>
              <Badge variant="outline" className="text-xs">{categoryLabels[ticket.category]}</Badge>
              <PremiumBadge plan={ticket.subscription_plan} size="sm" />
              {isOverdue && (
                <Badge className="bg-red-600 text-white text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  SLA Expirado
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-slate-900 mb-1">{ticket.subject}</h3>
            <p className="text-sm text-slate-600 line-clamp-2">{ticket.description}</p>
            
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(ticket.created_date).toLocaleDateString('pt-PT')}
              </span>
              {ticket.responses?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {ticket.responses.length} resposta{ticket.responses.length !== 1 ? 's' : ''}
                </span>
              )}
              {ticket.sla_deadline && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-blue-600'}`}>
                  <Clock className="w-3 h-3" />
                  SLA: {new Date(ticket.sla_deadline).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          
          <Badge className={`${config.color} text-white`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}