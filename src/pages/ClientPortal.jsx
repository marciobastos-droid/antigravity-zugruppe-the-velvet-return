import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, Calendar, MessageSquare, Heart, Star, 
  MapPin, Bed, Bath, Ruler, Send, Clock, Check,
  ThumbsUp, ThumbsDown, Eye, User, Phone, Mail
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

// Mark page as public - no authentication required
ClientPortal.public = true;

export default function ClientPortal() {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("properties");
  const [portalAccess, setPortalAccess] = useState(null);
  const [client, setClient] = useState(null);
  const [interests, setInterests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [agent, setAgent] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);
  
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get("token");

  // Load portal data on mount
  useEffect(() => {
    const loadPortalData = async () => {
      if (!accessToken) {
        setAccessError({ message: "Token não fornecido" });
        setAccessLoading(false);
        return;
      }

      try {
        // Validate access token
        const accesses = await base44.entities.ClientPortalAccess.filter({ access_token: accessToken });
        if (!accesses || accesses.length === 0) {
          setAccessError({ message: "Acesso inválido" });
          setAccessLoading(false);
          return;
        }
        
        const access = accesses[0];
        if (!access.is_active) {
          setAccessError({ message: "Acesso desativado" });
          setAccessLoading(false);
          return;
        }
        if (access.expires_at && new Date(access.expires_at) < new Date()) {
          setAccessError({ message: "Acesso expirado" });
          setAccessLoading(false);
          return;
        }
        
        setPortalAccess(access);

        // Update last access
        await base44.entities.ClientPortalAccess.update(access.id, {
          last_access: new Date().toISOString(),
          access_count: (access.access_count || 0) + 1
        });

        // Load client data
        const clients = await base44.entities.ClientContact.filter({ id: access.contact_id });
        if (clients && clients.length > 0) {
          setClient(clients[0]);
          
          // Load agent info if assigned
          if (clients[0].assigned_agent) {
            const users = await base44.entities.User.filter({ email: clients[0].assigned_agent });
            if (users && users.length > 0) {
              setAgent(users[0]);
            }
          }

          // Load appointments
          if (clients[0].email) {
            const apts = await base44.entities.Appointment.filter({ client_email: clients[0].email });
            setAppointments(apts || []);
          }
        }

        // Load interests
        const ints = await base44.entities.ClientPropertyInterest.filter({ contact_id: access.contact_id });
        setInterests(ints || []);

        // Load messages
        const msgs = await base44.entities.ClientPortalMessage.filter({ contact_id: access.contact_id }, 'created_date');
        setMessages(msgs || []);

        setAccessLoading(false);
      } catch (error) {
        console.error("Error loading portal:", error);
        setAccessError({ message: "Erro ao carregar portal" });
        setAccessLoading(false);
      }
    };

    loadPortalData();
  }, [accessToken]);

  const sendMessage = async (message) => {
    try {
      await base44.entities.ClientPortalMessage.create({
        contact_id: portalAccess.contact_id,
        agent_email: client?.assigned_agent,
        sender_type: "client",
        message
      });
      toast.success("Mensagem enviada!");
      setNewMessage("");
      // Reload messages
      const msgs = await base44.entities.ClientPortalMessage.filter({ contact_id: portalAccess.contact_id }, 'created_date');
      setMessages(msgs || []);
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
    }
  };

  const updateInterest = async (id, data) => {
    try {
      await base44.entities.ClientPropertyInterest.update(id, data);
      toast.success("Atualizado!");
      // Reload interests
      const ints = await base44.entities.ClientPropertyInterest.filter({ contact_id: portalAccess.contact_id });
      setInterests(ints || []);
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Acesso Inválido</h1>
            <p className="text-slate-600">
              Por favor utilize o link fornecido pelo seu agente para aceder ao portal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Acesso Negado</h1>
            <p className="text-slate-600">{accessError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(a => 
    new Date(a.appointment_date) > new Date() && a.status !== 'cancelled'
  );

  const statusLabels = {
    suggested: "Sugerido",
    interested: "Interessado",
    visited: "Visitado",
    not_interested: "Não Interessado",
    negotiating: "Em Negociação"
  };

  const statusColors = {
    suggested: "bg-blue-100 text-blue-800",
    interested: "bg-green-100 text-green-800",
    visited: "bg-purple-100 text-purple-800",
    not_interested: "bg-slate-100 text-slate-800",
    negotiating: "bg-amber-100 text-amber-800"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Portal do Cliente</h1>
              <p className="text-sm text-slate-600">Bem-vindo(a), {client?.full_name}</p>
            </div>
            {agent && (
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{agent.full_name}</p>
                <p className="text-xs text-slate-500">O seu agente</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{interests.length}</p>
              <p className="text-xs text-slate-600">Imóveis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{upcomingAppointments.length}</p>
              <p className="text-xs text-slate-600">Visitas Agendadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">
                {interests.filter(i => i.status === 'interested').length}
              </p>
              <p className="text-xs text-slate-600">Favoritos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-slate-900">{messages.length}</p>
              <p className="text-xs text-slate-600">Mensagens</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Imóveis
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Visitas
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Mensagens
            </TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="properties">
            <div className="space-y-4">
              {interests.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">O seu agente ainda não adicionou imóveis.</p>
                  </CardContent>
                </Card>
              ) : (
                interests.map((interest) => (
                  <Card key={interest.id} className="overflow-hidden">
                    <div className="md:flex">
                      {interest.property_image && (
                        <div className="md:w-48 h-48 md:h-auto flex-shrink-0">
                          <img 
                            src={interest.property_image} 
                            alt={interest.property_title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4 flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">{interest.property_title}</h3>
                            {interest.property_address && (
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {interest.property_address}
                              </p>
                            )}
                          </div>
                          <Badge className={statusColors[interest.status]}>
                            {statusLabels[interest.status]}
                          </Badge>
                        </div>

                        {interest.property_price && (
                          <p className="text-lg font-bold text-slate-900 mb-3">
                            €{interest.property_price.toLocaleString()}
                          </p>
                        )}

                        {interest.agent_notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-medium text-blue-800 mb-1">Nota do agente:</p>
                            <p className="text-sm text-blue-900">{interest.agent_notes}</p>
                          </div>
                        )}

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-slate-600">A sua avaliação:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => updateInterest(interest.id, { client_rating: star })}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Star 
                                  className={`w-5 h-5 ${
                                    interest.client_rating >= star 
                                      ? 'text-amber-400 fill-amber-400' 
                                      : 'text-slate-300'
                                  }`} 
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={interest.status === 'interested' ? 'default' : 'outline'}
                            onClick={() => updateInterestMutation.mutate({
                              id: interest.id,
                              data: { status: 'interested' }
                            })}
                            className="flex items-center gap-1"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Interessado
                          </Button>
                          <Button
                            size="sm"
                            variant={interest.status === 'not_interested' ? 'destructive' : 'outline'}
                            onClick={() => updateInterestMutation.mutate({
                              id: interest.id,
                              data: { status: 'not_interested' }
                            })}
                            className="flex items-center gap-1"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            Não Interessado
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">Ainda não tem visitas agendadas.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {upcomingAppointments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Próximas Visitas</h3>
                      {upcomingAppointments.map((apt) => (
                        <Card key={apt.id} className="mb-3 border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-slate-900">{apt.title}</h4>
                                <p className="text-sm text-slate-600">{apt.property_title}</p>
                                {apt.property_address && (
                                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {apt.property_address}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">
                                  {format(new Date(apt.appointment_date), "d MMM", { locale: pt })}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {format(new Date(apt.appointment_date), "HH:mm")}
                                </p>
                                <Badge className="mt-1 bg-green-100 text-green-800">
                                  {apt.status === 'confirmed' ? 'Confirmada' : 'Agendada'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {appointments.filter(a => new Date(a.appointment_date) <= new Date()).length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Histórico</h3>
                      {appointments
                        .filter(a => new Date(a.appointment_date) <= new Date())
                        .map((apt) => (
                          <Card key={apt.id} className="mb-3 opacity-75">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium text-slate-700">{apt.title}</h4>
                                  <p className="text-sm text-slate-500">{apt.property_title}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-600">
                                    {format(new Date(apt.appointment_date), "d MMM yyyy", { locale: pt })}
                                  </p>
                                  <Badge variant="outline" className="mt-1">
                                    {apt.status === 'completed' ? 'Realizada' : 
                                     apt.status === 'cancelled' ? 'Cancelada' : 'Passada'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Conversa com {agent?.full_name || 'o seu agente'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Messages List */}
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4 p-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Inicie uma conversa com o seu agente</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.sender_type === 'client' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_type === 'client' ? 'text-blue-200' : 'text-slate-500'
                          }`}>
                            {format(new Date(msg.created_date), "d MMM, HH:mm", { locale: pt })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Send Message */}
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva a sua mensagem..."
                    className="flex-1 min-h-[80px]"
                  />
                  <Button
                    onClick={() => sendMessageMutation.mutate(newMessage)}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Agent Contact Info */}
            {agent && (
              <Card className="mt-4">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Contacto do Agente</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{agent.full_name}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <a href={`mailto:${agent.email}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Mail className="w-3 h-3" />
                          {agent.email}
                        </a>
                        {agent.phone && (
                          <a href={`tel:${agent.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                            <Phone className="w-3 h-3" />
                            {agent.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-slate-500">
          Portal do Cliente • Powered by Zugruppe
        </div>
      </footer>
    </div>
  );
}