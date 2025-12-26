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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Heart, Search, MessageSquare, Calendar, TrendingUp, 
  Clock, CheckCircle, XCircle, Home, User, Send, Loader2,
  MapPin, Bed, Bath, Maximize, Euro, Eye, Filter, FileText, Mail, Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PropertyCard from "../components/browse/PropertyCard";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ViewingHistory from "../components/portal/ViewingHistory";
import ClientPropertyInterests from "../components/portal/ClientPropertyInterests";
import ClientPreferences from "../components/portal/ClientPreferences";
import ProposalsViewer from "../components/portal/ProposalsViewer";
import CommunicationsHistory from "../components/portal/CommunicationsHistory";

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
  
  // New Inquiry Dialog
  const [newInquiryDialog, setNewInquiryDialog] = useState(false);
  const [inquiryType, setInquiryType] = useState("property"); // property or general
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({
    property_type: "",
    location: "",
    budget_max: "",
    bedrooms: "",
    message: ""
  });
  const [creatingInquiry, setCreatingInquiry] = useState(false);
  
  // Inquiry Filters
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");
  const [inquiryDateFilter, setInquiryDateFilter] = useState("all");
  
  // Add Property Dialog
  const [addPropertyDialog, setAddPropertyDialog] = useState(false);
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [selectedPropertyType, setSelectedPropertyType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch saved properties with notes
  const { data: savedPropertyRecords = [] } = useQuery({
    queryKey: ['savedPropertyRecords', user?.email],
    queryFn: () => base44.entities.SavedProperty.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const { data: savedProperties = [] } = useQuery({
    queryKey: ['savedProperties', user?.email],
    queryFn: async () => {
      if (savedPropertyRecords.length === 0) return [];
      
      const propertyIds = savedPropertyRecords.map(s => s.property_id);
      const properties = await base44.entities.Property.list();
      
      return properties
        .filter(p => propertyIds.includes(p.id))
        .map(p => {
          const savedRecord = savedPropertyRecords.find(sr => sr.property_id === p.id);
          return { ...p, savedNotes: savedRecord?.notes, savedId: savedRecord?.id };
        });
    },
    enabled: !!user?.email && savedPropertyRecords.length > 0
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

  // Fetch all active properties for inquiry selection
  const { data: allProperties = [] } = useQuery({
    queryKey: ['allActiveProperties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' })
  });

  // Filter properties for search
  const filteredPropertiesForSearch = allProperties.filter(property => {
    const matchesSearch = !propertySearchQuery || 
      property.title?.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
      property.city?.toLowerCase().includes(propertySearchQuery.toLowerCase()) ||
      property.state?.toLowerCase().includes(propertySearchQuery.toLowerCase());
    
    const matchesType = selectedPropertyType === 'all' || property.property_type === selectedPropertyType;
    const matchesLocation = selectedLocation === 'all' || property.city === selectedLocation;
    
    const notAlreadySaved = !savedPropertyRecords.some(sp => sp.property_id === property.id);
    
    return matchesSearch && matchesType && matchesLocation && notAlreadySaved;
  });

  // Get unique cities for filter
  const uniqueCities = [...new Set(allProperties.map(p => p.city).filter(Boolean))].sort();

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

  // Save/Unsave property mutation
  const toggleSavePropertyMutation = useMutation({
    mutationFn: async ({ propertyId, isSaved }) => {
      if (isSaved) {
        const saved = savedPropertyRecords.find(sp => sp.property_id === propertyId);
        if (saved) await base44.entities.SavedProperty.delete(saved.id);
      } else {
        const property = allProperties.find(p => p.id === propertyId);
        await base44.entities.SavedProperty.create({
          property_id: propertyId,
          property_title: property?.title || '',
          property_image: property?.images?.[0] || '',
          user_email: user.email,
          notes: ''
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['savedPropertyRecords'] });
      queryClient.invalidateQueries({ queryKey: ['savedProperties'] });
      toast.success(variables.isSaved ? "Imóvel removido dos guardados" : "Imóvel guardado!");
    }
  });

  // Update saved property notes
  const updateSavedNoteMutation = useMutation({
    mutationFn: async ({ savedId, notes }) => {
      await base44.entities.SavedProperty.update(savedId, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedPropertyRecords'] });
      queryClient.invalidateQueries({ queryKey: ['savedProperties'] });
      toast.success("Nota atualizada!");
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error("Escreva uma mensagem");
      return;
    }

    setSendingMessage(true);
    await sendMessageMutation.mutateAsync({
      client_email: user.email,
      client_name: user.full_name,
      message: message,
      direction: 'client_to_agent',
      is_read: false
    });
    setSendingMessage(false);
  };

  // Create new inquiry mutation
  const createInquiryMutation = useMutation({
    mutationFn: async (data) => {
      const refData = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
      return await base44.entities.Opportunity.create({
        ref_id: refData.data.ref_id,
        lead_type: 'comprador',
        buyer_name: user.full_name,
        buyer_email: user.email,
        buyer_phone: user.phone || '',
        status: 'new',
        lead_source: 'website',
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userOpportunities'] });
      toast.success("Consulta criada com sucesso!");
      setNewInquiryDialog(false);
      setInquiryForm({ property_type: "", location: "", budget_max: "", bedrooms: "", message: "" });
      setSelectedProperty(null);
    }
  });

  const handleCreateInquiry = async () => {
    if (inquiryType === 'property' && !selectedProperty) {
      toast.error("Selecione um imóvel");
      return;
    }
    if (inquiryType === 'general' && !inquiryForm.message.trim()) {
      toast.error("Descreva o que procura");
      return;
    }

    setCreatingInquiry(true);
    const data = inquiryType === 'property' ? {
      property_id: selectedProperty.id,
      property_title: selectedProperty.title,
      message: inquiryForm.message || `Interesse no imóvel ${selectedProperty.title}`
    } : {
      property_type_interest: inquiryForm.property_type,
      location: inquiryForm.location,
      budget: inquiryForm.budget_max ? Number(inquiryForm.budget_max) : undefined,
      message: inquiryForm.message
    };

    await createInquiryMutation.mutateAsync(data);
    setCreatingInquiry(false);
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    // Status filter
    if (inquiryStatusFilter !== 'all') {
      if (inquiryStatusFilter === 'active' && ['won', 'lost'].includes(opp.status)) return false;
      if (inquiryStatusFilter === 'closed' && !['won', 'lost'].includes(opp.status)) return false;
      if (inquiryStatusFilter !== 'active' && inquiryStatusFilter !== 'closed' && opp.status !== inquiryStatusFilter) return false;
    }
    
    // Date filter
    if (inquiryDateFilter !== 'all') {
      const oppDate = new Date(opp.created_date);
      const now = new Date();
      const daysDiff = Math.floor((now - oppDate) / (1000 * 60 * 60 * 24));
      
      if (inquiryDateFilter === 'week' && daysDiff > 7) return false;
      if (inquiryDateFilter === 'month' && daysDiff > 30) return false;
      if (inquiryDateFilter === 'quarter' && daysDiff > 90) return false;
    }
    
    return true;
  });

  // Get appointments for each opportunity
  const getOpportunityAppointments = (opportunityId) => {
    return appointments.filter(apt => apt.lead_id === opportunityId);
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
          <TabsList className="grid w-full grid-cols-9 bg-white shadow-lg rounded-lg">
            <TabsTrigger value="saved" className="text-xs lg:text-sm">
              <Heart className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Guardados</span>
            </TabsTrigger>
            <TabsTrigger value="recommended" className="text-xs lg:text-sm">
              <TrendingUp className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Selecionados</span>
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="relative text-xs lg:text-sm">
              <Search className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Consultas</span>
              {opportunities.filter(o => !['won', 'lost'].includes(o.status)).length > 0 && (
                <Badge className="ml-1 lg:ml-2 bg-blue-600 text-white text-xs">
                  {opportunities.filter(o => !['won', 'lost'].includes(o.status)).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="viewings" className="text-xs lg:text-sm">
              <Calendar className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Visitas</span>
            </TabsTrigger>
            <TabsTrigger value="proposals" className="text-xs lg:text-sm">
              <FileText className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Propostas</span>
            </TabsTrigger>
            <TabsTrigger value="communications" className="text-xs lg:text-sm">
              <MessageSquare className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Comunicações</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs lg:text-sm">
              <Settings className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Preferências</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="relative text-xs lg:text-sm">
              <Mail className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Mensagens</span>
              {unreadMessages > 0 && (
                <Badge className="ml-1 lg:ml-2 bg-red-600 text-white text-xs">{unreadMessages}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs lg:text-sm">
              <Eye className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Saved Properties */}
          <TabsContent value="saved" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Imóveis Guardados</CardTitle>
                    <CardDescription>Imóveis que marcou como favoritos</CardDescription>
                  </div>
                  <Button onClick={() => setAddPropertyDialog(true)} className="bg-green-600 hover:bg-green-700">
                    <Search className="w-4 h-4 mr-2" />
                    Adicionar Imóvel
                  </Button>
                </div>
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
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedProperties.map(property => (
                      <div key={property.id} className="relative">
                        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} className="block">
                          <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                            <div className="relative h-48 overflow-hidden bg-slate-100">
                              <img
                                src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                                alt={property.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSavePropertyMutation.mutate({ propertyId: property.id, isSaved: true });
                                }}
                                className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors z-10"
                                disabled={toggleSavePropertyMutation.isPending}
                              >
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                              </button>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>
                              <p className="text-sm text-slate-600 flex items-center gap-1 mb-3">
                                <MapPin className="w-4 h-4" />
                                {property.city}, {property.state}
                              </p>
                              
                              <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                                {property.bedrooms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="w-4 h-4" />
                                    {property.bedrooms}
                                  </span>
                                )}
                                {property.bathrooms > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bath className="w-4 h-4" />
                                    {property.bathrooms}
                                  </span>
                                )}
                                {(property.useful_area || property.square_feet) > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Maximize className="w-4 h-4" />
                                    {property.useful_area || property.square_feet}m²
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t">
                                <div className="font-bold text-lg text-blue-600">
                                  €{property.price?.toLocaleString()}
                                </div>
                                <Badge variant="outline">
                                  {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                        
                        {/* Notes Section */}
                        <div className="mt-2">
                          <Textarea
                            value={property.savedNotes || ''}
                            onChange={(e) => {
                              const newNote = e.target.value;
                              // Debounced update
                              clearTimeout(window.noteUpdateTimeout);
                              window.noteUpdateTimeout = setTimeout(() => {
                                updateSavedNoteMutation.mutate({ 
                                  savedId: property.savedId, 
                                  notes: newNote 
                                });
                              }, 1000);
                            }}
                            placeholder="Adicione notas sobre este imóvel..."
                            className="text-sm resize-none"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>As Suas Consultas</CardTitle>
                    <CardDescription>Acompanhe o estado dos seus pedidos e crie novas consultas</CardDescription>
                  </div>
                  <Button onClick={() => setNewInquiryDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Search className="w-4 h-4 mr-2" />
                    Nova Consulta
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                {opportunities.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Estado:</Label>
                      <Select value={inquiryStatusFilter} onValueChange={setInquiryStatusFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Ativos</SelectItem>
                          <SelectItem value="new">Novos</SelectItem>
                          <SelectItem value="contacted">Contactado</SelectItem>
                          <SelectItem value="visit_scheduled">Com Visita</SelectItem>
                          <SelectItem value="negotiation">Em Negociação</SelectItem>
                          <SelectItem value="closed">Fechados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Período:</Label>
                      <Select value={inquiryDateFilter} onValueChange={setInquiryDateFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="week">Última Semana</SelectItem>
                          <SelectItem value="month">Último Mês</SelectItem>
                          <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Badge variant="outline" className="ml-auto">
                      {filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'consulta' : 'consultas'}
                    </Badge>
                  </div>
                )}

                {filteredOpportunities.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">
                      {opportunities.length === 0 ? 'Ainda não realizou nenhuma consulta' : 'Nenhuma consulta encontrada com os filtros selecionados'}
                    </p>
                    <Button onClick={() => setNewInquiryDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Search className="w-4 h-4 mr-2" />
                      Criar Primeira Consulta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOpportunities.map(opp => {
                      const StatusIcon = statusIcons[opp.status] || Clock;
                      const oppAppointments = getOpportunityAppointments(opp.id);
                      const hasActiveAppointments = oppAppointments.some(apt => 
                        apt.status === 'scheduled' || apt.status === 'confirmed'
                      );
                      
                      return (
                        <Card key={opp.id} className="border-l-4" style={{ borderLeftColor: statusColors[opp.status]?.includes('blue') ? '#3b82f6' : '#94a3b8' }}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <StatusIcon className="w-5 h-5 text-slate-600" />
                                  <h3 className="font-semibold text-lg">{opp.property_title || 'Consulta Geral'}</h3>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <Badge className={statusColors[opp.status]}>
                                    {statusLabels[opp.status] || opp.status}
                                  </Badge>
                                  {opp.ref_id && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {opp.ref_id}
                                    </Badge>
                                  )}
                                  {hasActiveAppointments && (
                                    <Badge className="bg-blue-500 text-white">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      Visita Agendada
                                    </Badge>
                                  )}
                                </div>

                                {opp.message && (
                                  <p className="text-sm text-slate-600 mb-3">{opp.message}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
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

                            {/* Appointments for this inquiry */}
                            {oppAppointments.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Visitas Agendadas ({oppAppointments.length})
                                </h4>
                                <div className="space-y-2">
                                  {oppAppointments.map(apt => (
                                    <div key={apt.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                      <div className="flex items-center gap-3">
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
                                        <span className="text-slate-700">
                                          {format(new Date(apt.appointment_date), "dd/MM/yyyy 'às' HH:mm")}
                                        </span>
                                      </div>
                                      {apt.notes && (
                                        <span className="text-slate-500 text-xs truncate max-w-xs">
                                          {apt.notes}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent-Selected Properties */}
          <TabsContent value="recommended" className="mt-6">
            <ClientPropertyInterests userEmail={user?.email} />
          </TabsContent>

          {/* Viewing History */}
          <TabsContent value="history" className="mt-6">
            <ViewingHistory userEmail={user?.email} />
          </TabsContent>

          {/* Proposals and Documents */}
          <TabsContent value="proposals" className="mt-6">
            <ProposalsViewer userEmail={user?.email} />
          </TabsContent>

          {/* Communications History */}
          <TabsContent value="communications" className="mt-6">
            <CommunicationsHistory userEmail={user?.email} />
          </TabsContent>

          {/* Client Preferences */}
          <TabsContent value="preferences" className="mt-6">
            <ClientPreferences userEmail={user?.email} />
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
              <Label>Mensagem</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva a sua mensagem à nossa equipa..."
                rows={5}
              />
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={sendingMessage || !message.trim()}
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

      {/* Add Property Dialog */}
      <Dialog open={addPropertyDialog} onOpenChange={setAddPropertyDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Imóvel aos Guardados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <Input
                placeholder="Procurar por título, cidade..."
                value={propertySearchQuery}
                onChange={(e) => setPropertySearchQuery(e.target.value)}
                className="w-full"
              />
              
              <div className="flex gap-3">
                <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="apartment">Apartamento</SelectItem>
                    <SelectItem value="house">Moradia</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Cidades</SelectItem>
                    {uniqueCities.slice(0, 20).map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge variant="outline" className="ml-auto">
                  {filteredPropertiesForSearch.length} imóveis
                </Badge>
              </div>
            </div>

            {/* Properties Grid */}
            {filteredPropertiesForSearch.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum imóvel encontrado</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {filteredPropertiesForSearch.slice(0, 20).map(property => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex gap-3 p-3">
                      <img
                        src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=150"}
                        alt={property.title}
                        className="w-24 h-24 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1">{property.title}</h4>
                        <p className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {property.city}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                          {property.bedrooms > 0 && <span>{property.bedrooms} quartos</span>}
                          {property.useful_area > 0 && <span>{property.useful_area}m²</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-blue-600">
                            €{property.price?.toLocaleString()}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              toggleSavePropertyMutation.mutate({ propertyId: property.id, isSaved: false });
                              setPropertySearchQuery("");
                            }}
                            disabled={toggleSavePropertyMutation.isPending}
                            className="h-7 text-xs"
                          >
                            <Heart className="w-3 h-3 mr-1" />
                            Guardar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Inquiry Dialog */}
      <Dialog open={newInquiryDialog} onOpenChange={setNewInquiryDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Consulta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Inquiry Type Selection */}
            <div>
              <Label>Tipo de Consulta</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  type="button"
                  variant={inquiryType === 'property' ? 'default' : 'outline'}
                  onClick={() => setInquiryType('property')}
                  className="h-auto py-4"
                >
                  <div className="text-center">
                    <Home className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-semibold">Imóvel Específico</div>
                    <div className="text-xs opacity-70">Consultar sobre um imóvel</div>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={inquiryType === 'general' ? 'default' : 'outline'}
                  onClick={() => setInquiryType('general')}
                  className="h-auto py-4"
                >
                  <div className="text-center">
                    <Search className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-semibold">Critérios Gerais</div>
                    <div className="text-xs opacity-70">Descrever o que procura</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Property Specific Inquiry */}
            {inquiryType === 'property' && (
              <div>
                <Label>Selecione o Imóvel</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  value={selectedProperty?.id || ''}
                  onChange={(e) => setSelectedProperty(allProperties.find(p => p.id === e.target.value))}
                >
                  <option value="">Escolha um imóvel...</option>
                  {allProperties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.title} - €{property.price?.toLocaleString()} - {property.city}
                    </option>
                  ))}
                </select>
                
                {selectedProperty && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-start gap-3">
                      {selectedProperty.images?.[0] && (
                        <img 
                          src={selectedProperty.images[0]} 
                          alt={selectedProperty.title}
                          className="w-20 h-20 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{selectedProperty.title}</h4>
                        <p className="text-sm text-slate-600">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {selectedProperty.city}, {selectedProperty.state}
                        </p>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          €{selectedProperty.price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Inquiry Form */}
            {inquiryType === 'general' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Imóvel</Label>
                    <Select 
                      value={inquiryForm.property_type} 
                      onValueChange={(v) => setInquiryForm({...inquiryForm, property_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartamento</SelectItem>
                        <SelectItem value="house">Moradia</SelectItem>
                        <SelectItem value="land">Terreno</SelectItem>
                        <SelectItem value="commercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Localização Preferida</Label>
                    <Input
                      value={inquiryForm.location}
                      onChange={(e) => setInquiryForm({...inquiryForm, location: e.target.value})}
                      placeholder="Ex: Lisboa, Porto..."
                    />
                  </div>

                  <div>
                    <Label>Orçamento Máximo</Label>
                    <Input
                      type="number"
                      value={inquiryForm.budget_max}
                      onChange={(e) => setInquiryForm({...inquiryForm, budget_max: e.target.value})}
                      placeholder="250000"
                    />
                  </div>

                  <div>
                    <Label>Quartos (mínimo)</Label>
                    <Input
                      type="number"
                      value={inquiryForm.bedrooms}
                      onChange={(e) => setInquiryForm({...inquiryForm, bedrooms: e.target.value})}
                      placeholder="2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Message for both types */}
            <div>
              <Label>Mensagem / Observações</Label>
              <Textarea
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                placeholder={inquiryType === 'property' 
                  ? "Informações adicionais sobre o seu interesse..." 
                  : "Descreva o que procura em detalhe..."}
                rows={4}
              />
            </div>

            <Button 
              onClick={handleCreateInquiry}
              disabled={creatingInquiry}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {creatingInquiry ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar consulta...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Consulta
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}