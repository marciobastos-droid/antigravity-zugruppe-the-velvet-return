import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Search, Users, Building2, Target, Sparkles,
  TrendingUp, Clock, CheckCircle2, AlertCircle, Filter,
  ChevronRight, MapPin, Euro, Bed, RefreshCw, Zap, BarChart3, Calendar, Settings
} from "lucide-react";
import MatchingReport from "@/components/matching/MatchingReport";
import AIMatchingInsights from "@/components/matching/AIMatchingInsights";
import MatchingDashboard from "@/components/matching/MatchingDashboard";
import ScheduledReports from "@/components/matching/ScheduledReports";

export default function MatchingTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [matchingOpen, setMatchingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");
  const [viewMode, setViewMode] = useState("list"); // "list", "ai", "dashboard", "scheduled"

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: matchAlerts = [] } = useQuery({
    queryKey: ['matchAlerts'],
    queryFn: () => base44.entities.MatchAlert.list('-created_date')
  });

  const activeProperties = properties.filter(p => p.status === 'active' && p.availability_status === 'available');

  // Clients with requirements defined
  const clientsWithRequirements = contacts.filter(c => 
    c.property_requirements && 
    (c.property_requirements.locations?.length > 0 || 
     c.property_requirements.budget_max || 
     c.property_requirements.property_types?.length > 0)
  );

  // Clients without requirements
  const clientsWithoutRequirements = contacts.filter(c => 
    !c.property_requirements || 
    (!c.property_requirements.locations?.length && 
     !c.property_requirements.budget_max && 
     !c.property_requirements.property_types?.length)
  );

  // Recent match alerts
  const pendingAlerts = matchAlerts.filter(a => a.status === 'pending' || a.status === 'notified');

  // Filter contacts based on search
  const filteredContacts = (activeTab === 'with_requirements' ? clientsWithRequirements : 
    activeTab === 'without_requirements' ? clientsWithoutRequirements : contacts)
    .filter(c => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return c.full_name?.toLowerCase().includes(search) ||
             c.email?.toLowerCase().includes(search) ||
             c.phone?.includes(search);
    });

  const handleOpenMatching = (contact) => {
    setSelectedContact(contact);
    setMatchingOpen(true);
  };

  const getRequirementsSummary = (req) => {
    if (!req) return null;
    const parts = [];
    if (req.budget_max) parts.push(`até €${(req.budget_max/1000).toFixed(0)}k`);
    if (req.locations?.length) parts.push(req.locations.slice(0, 2).join(', '));
    if (req.bedrooms_min) parts.push(`T${req.bedrooms_min}+`);
    return parts.join(' • ') || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-600" />
            Matching Inteligente
          </h2>
          <p className="text-slate-600 mt-1">
            Encontre imóveis ideais para os seus clientes com IA
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Clientes Ativos</p>
                <p className="text-3xl font-bold">{contacts.length}</p>
              </div>
              <Users className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Com Requisitos</p>
                <p className="text-3xl font-bold">{clientsWithRequirements.length}</p>
              </div>
              <Target className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Imóveis Disponíveis</p>
                <p className="text-3xl font-bold">{activeProperties.length}</p>
              </div>
              <Building2 className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Alertas Pendentes</p>
                <p className="text-3xl font-bold">{pendingAlerts.length}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-none"
          >
            <Users className="w-4 h-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === "ai" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("ai")}
            className="rounded-none"
          >
            <Zap className="w-4 h-4 mr-2" />
            Análise IA
          </Button>
          <Button
            variant={viewMode === "dashboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("dashboard")}
            className="rounded-none"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={viewMode === "scheduled" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("scheduled")}
            className="rounded-none"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Agendados
          </Button>
        </div>
      </div>

      {viewMode === "dashboard" && (
        <MatchingDashboard />
      )}

      {viewMode === "scheduled" && (
        <ScheduledReports />
      )}

      {viewMode === "ai" && selectedContact ? (
        <AIMatchingInsights 
          contact={selectedContact} 
          onSelectProperty={(property) => {
            setMatchingOpen(true);
          }}
        />
      ) : viewMode === "ai" ? (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Selecione um Cliente</h3>
            <p className="text-slate-500 mb-4">
              Escolha um cliente da lista abaixo para iniciar a análise IA avançada
            </p>
            <Button onClick={() => setViewMode("list")}>
              <Users className="w-4 h-4 mr-2" />
              Ver Lista de Clientes
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Main Content */}
      {viewMode === "list" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Clientes para Matching</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Pesquisar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="clients" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Todos ({contacts.length})
                  </TabsTrigger>
                  <TabsTrigger value="with_requirements" className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Com Requisitos ({clientsWithRequirements.length})
                  </TabsTrigger>
                  <TabsTrigger value="without_requirements" className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Sem Requisitos ({clientsWithoutRequirements.length})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 pr-4">
                    {loadingContacts ? (
                      <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
                      </div>
                    ) : filteredContacts.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Nenhum cliente encontrado</p>
                      </div>
                    ) : (
                      filteredContacts.map((contact) => {
                        const reqSummary = getRequirementsSummary(contact.property_requirements);
                        const hasRequirements = !!reqSummary;

                        return (
                          <div
                            key={contact.id}
                            className={`p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${
                              hasRequirements 
                                ? 'border-green-200 bg-gradient-to-r from-green-50 to-white hover:border-green-300' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            onClick={() => handleOpenMatching(contact)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
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
                                </div>
                                <p className="text-sm text-slate-500 mt-0.5">{contact.email}</p>
                                {reqSummary && (
                                  <div className="flex items-center gap-2 mt-2 text-sm text-green-700">
                                    <Filter className="w-3.5 h-3.5" />
                                    {reqSummary}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedContact(contact);
                                    setViewMode("ai");
                                  }}
                                >
                                  <Zap className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm"
                                  className={hasRequirements 
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
                                    : 'bg-slate-600 hover:bg-slate-700'
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenMatching(contact);
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
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Quick Tips */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Como funciona
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <p className="text-slate-700">Defina os requisitos do cliente (orçamento, localização, tipologia)</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <p className="text-slate-700">A IA analisa a compatibilidade com todos os imóveis disponíveis</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <p className="text-slate-700">Gere um relatório PDF personalizado para enviar ao cliente</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          {pendingAlerts.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Alertas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{alert.contact_name}</p>
                          <p className="text-xs text-slate-600">{alert.property_title}</p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800">
                          {alert.match_score}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Properties */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Imóveis em Destaque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeProperties.slice(0, 4).map((property) => (
                  <div key={property.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      {property.images?.[0] ? (
                        <img src={property.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{property.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {property.city}
                        </span>
                        <span className="font-medium text-slate-700">
                          €{property.price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      )}

      {/* Matching Dialog */}
      {selectedContact && (
        <MatchingReport
          contact={selectedContact}
          open={matchingOpen}
          onOpenChange={setMatchingOpen}
        />
      )}
    </div>
  );
}