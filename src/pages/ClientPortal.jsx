import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Heart, Search, MessageSquare, Calendar, TrendingUp, 
  Clock, CheckCircle, XCircle, Home, User, Send, Loader2,
  MapPin, Bed, Bath, Maximize, Euro, Eye, Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PropertyCard from "../components/browse/PropertyCard";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Status colors and labels
const statusColors = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-purple-100 text-purple-800",
  visit_scheduled: "bg-amber-100 text-amber-800",
  proposal: "bg-orange-100 text-orange-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800"
};

const statusLabels = {
  new: "Nova",
  contacted: "Contactado",
  visit_scheduled: "Visita Agendada",
  proposal: "Proposta",
  negotiation: "Negociação",
  won: "Concluída",
  lost: "Não Concretizada"
};

const statusIcons = {
  new: Clock,
  contacted: MessageSquare,
  visit_scheduled: Calendar,
  proposal: TrendingUp,
  negotiation: TrendingUp,
  won: CheckCircle,
  lost: XCircle
};

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState("saved");
  const [messageDialog, setMessageDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch saved properties
  const { data: savedProperties = [] } = useQuery({
    queryKey: ['savedProperties', user?.email],
    queryFn: async () => {
      const saved = await base44.entities.SavedProperty.filter({ user_email: user.email });
      const propertyIds = saved.map(s => s.property_id);
      
      if (propertyIds.length === 0) return [];
      
      const properties = await base44.entities.Property.list();
      return properties.filter(p => propertyIds.includes(p.id));
    },
    enabled: !!user?.email
  });

  // Fetch user opportunities/inquiries
  const { data: opportunities = [] } = useQuery({
    queryKey: ['userOpportunities', user?.email],
    queryFn: () => base44.entities.Opportunity.filter({ buyer_email: user.email }),
    enabled: !!user?.email
  });

  // Fetch user appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['userAppointments', user?.email],
    queryFn: () => base44.entities.Appointment.filter({ client_email: user.email }),
    enabled: !!user?.email
  });

  // Fetch buyer profile for recommendations
  const { data: buyerProfile } = useQuery({
    queryKey: ['buyerProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.BuyerProfile.filter({ buyer_email: user.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email
  });

  // Fetch recommended properties
  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', buyerProfile?.id],
    queryFn: async () => {
      if (!buyerProfile) return [];
      
      const allProperties = await base44.entities.Property.filter({ status: 'active' });
      
      return allProperties.filter(p => {
        // Match listing type
        if (buyerProfile.listing_type && buyerProfile.listing_type !== 'both' && 
            p.listing_type !== buyerProfile.listing_type) return false;
        
        // Match property types
        if (buyerProfile.property_types?.length > 0 && 
            !buyerProfile.property_types.includes(p.property_type)) return false;
        
        // Match locations
        if (buyerProfile.locations?.length > 0 && 
            !buyerProfile.locations.includes(p.city)) return false;
        
        // Match budget
        if (buyerProfile.budget_min && p.price < buyerProfile.budget_min) return false;
        if (buyerProfile.budget_max && p.price > buyerProfile.budget_max) return false;
        
        // Match bedrooms
        if (buyerProfile.bedrooms_min && p.bedrooms < buyerProfile.bedrooms_min) return false;
        
        return true;
      }).slice(0, 12);
    },
    enabled: !!buyerProfile
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['userMessages', user?.email],
    queryFn: () => base44.entities.ClientPortalMessage.filter({ client_email: user.email }),
    enabled: !!user?.email
  });

  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientPortalMessage.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMessages'] });
      toast.success("Mensagem enviada!");
      setMessage("");
      setMessageDialog(false);
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgent) {
      toast.error("Selecione um agente e escreva uma mensagem");
      return;
    }

    setSendingMessage(true);
    await sendMessageMutation.mutateAsync({
      client_email: user.email,
      client_name: user.full_name,
      agent_email: selectedAgent.email,
      agent_name: selectedAgent.full_name,
      message: message,
      direction: 'client_to_agent',
      is_read: false
    });
    setSendingMessage(false);
  };

  const unreadMessages = messages.filter(m => !m.is_read && m.direction === 'agent_to_client').length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Portal do Cliente</CardTitle>
            <CardDescription>Faça login para aceder ao seu portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => base44.auth.redirectToLogin()} className="w-full">
              <User className="w-4 h-4 mr-2" />
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Bem-vindo, {user.full_name}</h1>
          <p className="text-blue-100">O seu portal pessoal de imóveis</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-lg rounded-lg">
            <TabsTrigger value="saved" className="relative">
              <Heart className="w-4 h-4 mr-2" />
              Guardados
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="relative">
              <Search className="w-4 h-4 mr-2" />
              Consultas
              {opportunities.filter(o => !['won', 'lost'].includes(o.status)).length > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white">
                  {opportunities.filter(o => !['won', 'lost'].includes(o.status)).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <TrendingUp className="w-4 h-4 mr-2" />
              Recomendações
            </TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagens
              {unreadMessages > 0 && (
                <Badge className="ml-2 bg-red-600 text-white">{unreadMessages}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="viewings">
              <Calendar className="w-4 h-4 mr-2" />
              Visitas
            </TabsTrigger>
          </TabsList>

          {/* Saved Properties */}
          <TabsContent value="saved" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Imóveis Guardados</CardTitle>
                <CardDescription>Imóveis que marcou como favoritos</CardDescription>
              </CardHeader>
              <CardContent>
                {savedProperties.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Ainda não guardou nenhum imóvel</p>
                    <Link to={createPageUrl("ZuGruppe")}>
                      <Button className="mt-4">
                        <Search className="w-4 h-4 mr-2" />
                        Procurar Imóveis
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedProperties.map(property => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries/Opportunities */}
          <TabsContent value="inquiries" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>As Suas Consultas</CardTitle>
                <CardDescription>Acompanhe o estado dos seus pedidos</CardDescription>
              </CardHeader>
              <CardContent>
                {opportunities.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Ainda não realizou nenhuma consulta</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {opportunities.map(opp => {
                      const StatusIcon = statusIcons[opp.status] || Clock;
                      return (
                        <Card key={opp.id} className="border-l-4" style={{ borderLeftColor: statusColors[opp.status]?.includes('blue') ? '#3b82f6' : '#94a3b8' }}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <StatusIcon className="w-5 h-5 text-slate-600" />
                                  <h3 className="font-semibold text-lg">{opp.property_title || 'Consulta Geral'}</h3>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={statusColors[opp.status]}>
                                    {statusLabels[opp.status] || opp.status}
                                  </Badge>
                                  {opp.ref_id && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {opp.ref_id}
                                    </Badge>
                                  )}
                                </div>

                                {opp.message && (
                                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{opp.message}</p>
                                )}

                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(opp.created_date), "dd/MM/yyyy")}
                                  </span>
                                  {opp.assigned_agent_name && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-4 h-4" />
                                      {opp.assigned_agent_name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {opp.property_id && (
                                <Link to={`${createPageUrl("PropertyDetails")}?id=${opp.property_id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Imóvel
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations */}
          <TabsContent value="recommendations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recomendações Personalizadas</CardTitle>
                <CardDescription>
                  Imóveis selecionados com base nas suas preferências
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!buyerProfile ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">
                      Configure as suas preferências para receber recomendações personalizadas
                    </p>
                    <Button>
                      <Filter className="w-4 h-4 mr-2" />
                      Definir Preferências
                    </Button>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">
                      Não encontrámos imóveis que correspondam às suas preferências no momento
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendations.map(property => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mensagens</CardTitle>
                    <CardDescription>Comunique com os nossos agentes</CardDescription>
                  </div>
                  <Button onClick={() => setMessageDialog(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Nova Mensagem
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Ainda não tem mensagens</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(msg => (
                      <Card key={msg.id} className={!msg.is_read && msg.direction === 'agent_to_client' ? 'border-blue-300 bg-blue-50' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                msg.direction === 'agent_to_client' ? 'bg-blue-100' : 'bg-slate-100'
                              }`}>
                                <User className="w-5 h-5 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {msg.direction === 'agent_to_client' ? msg.agent_name : 'Você'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {format(new Date(msg.created_date), "dd/MM/yyyy HH:mm")}
                                </p>
                              </div>
                            </div>
                            {!msg.is_read && msg.direction === 'agent_to_client' && (
                              <Badge className="bg-blue-600 text-white">Nova</Badge>
                            )}
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{msg.message}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Viewings/Appointments */}
          <TabsContent value="viewings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Visitas Agendadas</CardTitle>
                <CardDescription>Gerir as suas visitas aos imóveis</CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Ainda não tem visitas agendadas</p>
                    <Link to={createPageUrl("ZuGruppe")}>
                      <Button className="mt-4">
                        <Search className="w-4 h-4 mr-2" />
                        Procurar Imóveis
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments
                      .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
                      .map(apt => (
                        <Card key={apt.id} className={apt.status === 'scheduled' || apt.status === 'confirmed' ? 'border-l-4 border-l-blue-500' : ''}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-2">{apt.property_title}</h3>
                                
                                <div className="flex items-center gap-2 mb-3">
                                  <Badge className={
                                    apt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                    apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    apt.status === 'completed' ? 'bg-slate-100 text-slate-800' :
                                    'bg-red-100 text-red-800'
                                  }>
                                    {apt.status === 'scheduled' ? 'Agendada' :
                                     apt.status === 'confirmed' ? 'Confirmada' :
                                     apt.status === 'completed' ? 'Concluída' : 'Cancelada'}
                                  </Badge>
                                </div>

                                <div className="space-y-2 text-sm text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>{format(new Date(apt.appointment_date), "dd/MM/yyyy 'às' HH:mm")}</span>
                                  </div>
                                  {apt.property_address && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      <span>{apt.property_address}</span>
                                    </div>
                                  )}
                                  {apt.assigned_agent && (
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4" />
                                      <span>{apt.assigned_agent}</span>
                                    </div>
                                  )}
                                </div>

                                {apt.notes && (
                                  <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    {apt.notes}
                                  </p>
                                )}
                              </div>

                              {apt.property_id && (
                                <Link to={`${createPageUrl("PropertyDetails")}?id=${apt.property_id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Imóvel
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Message Dialog */}
      <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Agente</Label>
              <select
                className="w-full mt-1 px-3 py-2 border rounded-lg"
                value={selectedAgent?.id || ''}
                onChange={(e) => setSelectedAgent(agents.find(a => a.id === e.target.value))}
              >
                <option value="">Selecione um agente...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.display_name || agent.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva a sua mensagem..."
                rows={5}
              />
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={sendingMessage || !message.trim() || !selectedAgent}
              className="w-full"
            >
              {sendingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}