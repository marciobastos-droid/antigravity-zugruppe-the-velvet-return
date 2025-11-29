import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Brain, Search, Users, Building2, Target, Sparkles,
  TrendingUp, Clock, CheckCircle2, AlertCircle, Filter,
  ChevronRight, MapPin, Euro, Bed, RefreshCw, Zap, BarChart3, 
  Calendar, Settings, Eye, Mail, Phone, Send, Loader2, 
  Home, Heart, MessageCircle, FileText, User
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import ContactMatching from "@/components/crm/ContactMatching";
import MatchingReport from "@/components/matching/MatchingReport";
import MatchingDashboard from "@/components/matching/MatchingDashboard";

export default function MatchingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [matchingOpen, setMatchingOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("contacts"); // "contacts", "opportunities", "dashboard"
  const [activeSubTab, setActiveSubTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Get current user
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Check user permissions
  const userType = user?.user_type?.toLowerCase() || '';
  const isAdmin = user?.role === 'admin' || userType === 'admin' || userType === 'gestor';
  const permissions = user?.permissions || {};
  const canViewAll = isAdmin || permissions.canViewAllLeads === true;

  // Fetch contacts with permission filtering
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['clientContacts', user?.email],
    queryFn: async () => {
      const allContacts = await base44.entities.ClientContact.list('-created_date');
      if (canViewAll) return allContacts;
      return allContacts.filter(c => c.assigned_agent === user?.email || c.created_by === user?.email);
    },
    enabled: !!user
  });

  // Fetch opportunities with permission filtering
  const { data: opportunities = [], isLoading: loadingOpportunities } = useQuery({
    queryKey: ['opportunities', user?.email],
    queryFn: async () => {
      const allOpportunities = await base44.entities.Opportunity.list('-updated_date');
      if (canViewAll) return allOpportunities;
      return allOpportunities.filter(o => 
        o.seller_email === user?.email || 
        o.assigned_to === user?.email || 
        o.created_by === user?.email
      );
    },
    enabled: !!user
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: matchAlerts = [] } = useQuery({
    queryKey: ['matchAlerts'],
    queryFn: () => base44.entities.MatchAlert.list('-created_date')
  });

  const { data: sentMatches = [] } = useQuery({
    queryKey: ['sentMatches'],
    queryFn: () => base44.entities.SentMatch.list('-sent_date')
  });

  const activeProperties = properties.filter(p => p.status === 'active' && p.availability_status === 'available');

  // Contacts with requirements
  const contactsWithRequirements = contacts.filter(c => 
    c.property_requirements && 
    (c.property_requirements.locations?.length > 0 || 
     c.property_requirements.budget_max || 
     c.property_requirements.property_types?.length > 0)
  );

  const contactsWithoutRequirements = contacts.filter(c => 
    !c.property_requirements || 
    (!c.property_requirements.locations?.length && 
     !c.property_requirements.budget_max && 
     !c.property_requirements.property_types?.length)
  );

  // Opportunities that are buyers
  const buyerOpportunities = opportunities.filter(o => 
    o.lead_type === 'comprador' || o.lead_type === 'parceiro_comprador'
  );

  // Pending alerts
  const pendingAlerts = matchAlerts.filter(a => a.status === 'pending' || a.status === 'notified');

  // Filter contacts
  const filteredContacts = (activeSubTab === 'with_requirements' ? contactsWithRequirements : 
    activeSubTab === 'without_requirements' ? contactsWithoutRequirements : contacts)
    .filter(c => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return c.full_name?.toLowerCase().includes(search) ||
             c.email?.toLowerCase().includes(search) ||
             c.phone?.includes(search);
    })
    .filter(c => {
      if (statusFilter === "all") return true;
      return c.status === statusFilter;
    })
    .filter(c => {
      if (typeFilter === "all") return true;
      return c.contact_type === typeFilter;
    });

  // Filter opportunities
  const filteredOpportunities = buyerOpportunities
    .filter(o => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return o.buyer_name?.toLowerCase().includes(search) ||
             o.buyer_email?.toLowerCase().includes(search) ||
             o.buyer_phone?.includes(search);
    })
    .filter(o => {
      if (statusFilter === "all") return true;
      return o.status === statusFilter;
    });

  const getRequirementsSummary = (req) => {
    if (!req) return null;
    const parts = [];
    if (req.budget_max) parts.push(`até €${(req.budget_max/1000).toFixed(0)}k`);
    if (req.locations?.length) parts.push(req.locations.slice(0, 2).join(', '));
    if (req.bedrooms_min) parts.push(`T${req.bedrooms_min}+`);
    return parts.join(' • ') || null;
  };

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setSelectedOpportunity(null);
  };

  const handleSelectOpportunity = (opp) => {
    // Convert opportunity to contact-like format for matching
    const contactLike = {
      id: opp.id,
      full_name: opp.buyer_name,
      email: opp.buyer_email,
      phone: opp.buyer_phone,
      city: opp.location,
      property_requirements: {
        listing_type: 'sale',
        budget_max: opp.budget,
        locations: opp.location ? [opp.location] : [],
        property_types: opp.property_type_interest ? [opp.property_type_interest] : []
      },
      _isOpportunity: true,
      _opportunityId: opp.id
    };
    setSelectedContact(contactLike);
    setSelectedOpportunity(opp);
  };

  // Stats
  const stats = {
    totalContacts: contacts.length,
    withRequirements: contactsWithRequirements.length,
    activeProperties: activeProperties.length,
    pendingAlerts: pendingAlerts.length,
    buyerOpportunities: buyerOpportunities.length,
    recentMatches: sentMatches.filter(m => 
      new Date(m.sent_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              Central de Matching
            </h1>
            <p className="text-slate-600 mt-1">
              Encontre imóveis ideais para os seus clientes com IA
              {!canViewAll && (
                <span className="ml-2 text-sm text-amber-600">
                  (A visualizar apenas os seus leads)
                </span>
              )}
            </p>
          </div>
          {selectedContact && (
            <Button
              variant="outline"
              onClick={() => { setSelectedContact(null); setSelectedOpportunity(null); }}
            >
              ← Voltar à Lista
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-xs">Contactos</p>
                  <p className="text-2xl font-bold">{stats.totalContacts}</p>
                </div>
                <Users className="w-8 h-8 text-indigo-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs">Com Requisitos</p>
                  <p className="text-2xl font-bold">{stats.withRequirements}</p>
                </div>
                <Target className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">Oportunidades</p>
                  <p className="text-2xl font-bold">{stats.buyerOpportunities}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs">Imóveis</p>
                  <p className="text-2xl font-bold">{stats.activeProperties}</p>
                </div>
                <Building2 className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs">Alertas</p>
                  <p className="text-2xl font-bold">{stats.pendingAlerts}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-600 to-slate-800 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-xs">Matches 7d</p>
                  <p className="text-2xl font-bold">{stats.recentMatches}</p>
                </div>
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {selectedContact ? (
          /* Matching Interface for Selected Contact */
          <div className="space-y-6">
            {/* Selected Contact Header */}
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                      {selectedContact.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {selectedContact.full_name}
                        {selectedOpportunity && (
                          <Badge className="bg-blue-100 text-blue-700">Oportunidade</Badge>
                        )}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        {selectedContact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {selectedContact.email}
                          </span>
                        )}
                        {selectedContact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {selectedContact.phone}
                          </span>
                        )}
                        {selectedContact.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {selectedContact.city}
                          </span>
                        )}
                      </div>
                      {getRequirementsSummary(selectedContact.property_requirements) && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full w-fit">
                          <Target className="w-4 h-4" />
                          {getRequirementsSummary(selectedContact.property_requirements)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setMatchingOpen(true)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Gerar Relatório
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Matching Component */}
            <ContactMatching contact={selectedContact} />
          </div>
        ) : (
          /* List View */
          <div>
            {/* Main Tabs */}
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-white border">
                  <TabsTrigger value="contacts" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Contactos ({contacts.length})
                  </TabsTrigger>
                  <TabsTrigger value="opportunities" className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Oportunidades ({buyerOpportunities.length})
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </TabsTrigger>
                </TabsList>

                {/* Search and Filters */}
                {activeMainTab !== "dashboard" && (
                  <div className="flex items-center gap-3">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Pesquisar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="inactive">Inativos</SelectItem>
                        {activeMainTab === "opportunities" && (
                          <>
                            <SelectItem value="new">Novos</SelectItem>
                            <SelectItem value="contacted">Contactados</SelectItem>
                            <SelectItem value="qualified">Qualificados</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Contacts Tab */}
              <TabsContent value="contacts">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Clientes para Matching</CardTitle>
                      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                        <TabsList className="h-8">
                          <TabsTrigger value="all" className="text-xs h-7">
                            Todos ({contacts.length})
                          </TabsTrigger>
                          <TabsTrigger value="with_requirements" className="text-xs h-7">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Com Requisitos ({contactsWithRequirements.length})
                          </TabsTrigger>
                          <TabsTrigger value="without_requirements" className="text-xs h-7">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Sem Requisitos ({contactsWithoutRequirements.length})
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-3 pr-4">
                        {loadingContacts ? (
                          <div className="text-center py-12">
                            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
                          </div>
                        ) : filteredContacts.length === 0 ? (
                          <div className="text-center py-12">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Nenhum contacto encontrado</p>
                          </div>
                        ) : (
                          filteredContacts.map((contact) => {
                            const reqSummary = getRequirementsSummary(contact.property_requirements);
                            const hasRequirements = !!reqSummary;
                            const contactMatches = sentMatches.filter(m => m.contact_id === contact.id);

                            return (
                              <div
                                key={contact.id}
                                className={`p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${
                                  hasRequirements 
                                    ? 'border-green-200 bg-gradient-to-r from-green-50 to-white hover:border-green-300' 
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                                onClick={() => handleSelectContact(contact)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold">
                                      {contact.full_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">{contact.full_name}</h4>
                                        {hasRequirements ? (
                                          <Badge className="bg-green-100 text-green-700 text-xs">
                                            <Target className="w-3 h-3 mr-1" />
                                            Pronto
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-xs text-slate-500">
                                            Sem requisitos
                                          </Badge>
                                        )}
                                        {contactMatches.length > 0 && (
                                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                                            {contactMatches.length} enviado{contactMatches.length !== 1 ? 's' : ''}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-500 mt-0.5">{contact.email || contact.phone}</p>
                                      {reqSummary && (
                                        <div className="flex items-center gap-2 mt-1 text-sm text-green-700">
                                          <Filter className="w-3.5 h-3.5" />
                                          {reqSummary}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm"
                                      className={hasRequirements 
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
                                        : 'bg-slate-600 hover:bg-slate-700'
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectContact(contact);
                                      }}
                                    >
                                      <Sparkles className="w-4 h-4 mr-1" />
                                      Matching
                                      <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Opportunities Tab */}
              <TabsContent value="opportunities">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Oportunidades de Compra</CardTitle>
                    <p className="text-sm text-slate-500">
                      Leads interessados em comprar imóveis
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-3 pr-4">
                        {loadingOpportunities ? (
                          <div className="text-center py-12">
                            <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
                          </div>
                        ) : filteredOpportunities.length === 0 ? (
                          <div className="text-center py-12">
                            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Nenhuma oportunidade encontrada</p>
                          </div>
                        ) : (
                          filteredOpportunities.map((opp) => {
                            const statusColors = {
                              new: 'bg-blue-100 text-blue-700',
                              contacted: 'bg-amber-100 text-amber-700',
                              qualified: 'bg-green-100 text-green-700',
                              proposal: 'bg-purple-100 text-purple-700',
                              negotiation: 'bg-indigo-100 text-indigo-700',
                              won: 'bg-emerald-100 text-emerald-700',
                              lost: 'bg-red-100 text-red-700'
                            };
                            const statusLabels = {
                              new: 'Novo',
                              contacted: 'Contactado',
                              qualified: 'Qualificado',
                              proposal: 'Proposta',
                              negotiation: 'Negociação',
                              won: 'Ganho',
                              lost: 'Perdido'
                            };

                            return (
                              <div
                                key={opp.id}
                                className="p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                                onClick={() => handleSelectOpportunity(opp)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                                      {opp.buyer_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">{opp.buyer_name}</h4>
                                        <Badge className={statusColors[opp.status] || statusColors.new}>
                                          {statusLabels[opp.status] || 'Novo'}
                                        </Badge>
                                        {opp.qualification_status === 'hot' && (
                                          <span className="text-lg">🔥</span>
                                        )}
                                        {opp.priority === 'high' && (
                                          <span className="text-lg">⭐</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                                        {opp.buyer_email && <span>{opp.buyer_email}</span>}
                                        {opp.buyer_phone && <span>{opp.buyer_phone}</span>}
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 text-sm">
                                        {opp.budget > 0 && (
                                          <span className="flex items-center gap-1 text-green-700">
                                            <Euro className="w-3 h-3" />
                                            €{opp.budget.toLocaleString()}
                                          </span>
                                        )}
                                        {opp.location && (
                                          <span className="flex items-center gap-1 text-slate-600">
                                            <MapPin className="w-3 h-3" />
                                            {opp.location}
                                          </span>
                                        )}
                                        {opp.property_type_interest && (
                                          <span className="flex items-center gap-1 text-slate-600">
                                            <Home className="w-3 h-3" />
                                            {opp.property_type_interest}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm"
                                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectOpportunity(opp);
                                      }}
                                    >
                                      <Sparkles className="w-4 h-4 mr-1" />
                                      Matching
                                      <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard">
                <MatchingDashboard />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Matching Report Dialog */}
        {selectedContact && (
          <MatchingReport
            contact={selectedContact}
            open={matchingOpen}
            onOpenChange={setMatchingOpen}
          />
        )}
      </div>
    </div>
  );
}