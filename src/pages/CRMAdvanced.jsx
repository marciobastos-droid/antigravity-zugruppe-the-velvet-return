import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, MessageSquare, BarChart3, Brain, PieChart, Target } from "lucide-react";
import ClientDatabase from "../components/crm/ClientDatabase";
import AppointmentScheduler from "../components/crm/AppointmentScheduler";
import CRMDashboard from "../components/crm/CRMDashboard";
import MatchingTab from "@/components/crm/MatchingTab";
import CRMMetricsDashboard from "../components/crm/CRMMetricsDashboard";
import OpportunitiesContent from "../components/crm/OpportunitiesContent";

export default function CRMAdvanced() {
  const [activeTab, setActiveTab] = React.useState("clients");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">CRM</h1>
          <p className="text-sm sm:text-base text-slate-600">Gestão de contactos e comunicações</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto mb-4 sm:mb-8 gap-1 sm:grid sm:grid-cols-7">
            <TabsTrigger value="metrics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <PieChart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Contactos</span>
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Target className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Oportunidades</span>
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Matching</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 min-w-fit">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Msgs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <CRMMetricsDashboard />
          </TabsContent>

          <TabsContent value="dashboard">
            <CRMDashboard />
          </TabsContent>

          <TabsContent value="clients">
            <ClientDatabase />
          </TabsContent>

          <TabsContent value="opportunities">
            <OpportunitiesContent />
          </TabsContent>

          <TabsContent value="matching">
            <MatchingTab />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentScheduler />
          </TabsContent>

          <TabsContent value="communications">
            <CommunicationsOverview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CommunicationsOverview() {
  const { useQuery } = require("@tanstack/react-query");
  const { base44 } = require("@/api/base44Client");
  const { Card, CardContent } = require("@/components/ui/card");
  const { Badge } = require("@/components/ui/badge");
  const { Button } = require("@/components/ui/button");
  const { Input } = require("@/components/ui/input");
  const { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } = require("@/components/ui/select");
  const { format } = require("date-fns");
  const { ptBR } = require("date-fns/locale");
  const { Phone, Mail, MessageSquare, Video, MapPin, Calendar, ArrowDownLeft, ArrowUpRight, Search, Filter, User, Building2, ChevronDown, X } = require("lucide-react");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [directionFilter, setDirectionFilter] = React.useState("all");
  const [agentFilter, setAgentFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState("all");

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['allCommunicationLogs'],
    queryFn: () => base44.entities.CommunicationLog.list('-communication_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const typeIcons = {
    phone_call: Phone,
    email: Mail,
    whatsapp: MessageSquare,
    sms: MessageSquare,
    meeting: Calendar,
    video_call: Video,
    site_visit: MapPin,
    property_match: Building2,
    other: MessageSquare
  };

  const typeLabels = {
    phone_call: "Chamada",
    email: "Email",
    whatsapp: "WhatsApp",
    sms: "SMS",
    meeting: "Reunião",
    video_call: "Videochamada",
    site_visit: "Visita",
    property_match: "Match",
    other: "Outro"
  };

  const typeColors = {
    phone_call: "bg-green-50 text-green-600",
    email: "bg-blue-50 text-blue-600",
    whatsapp: "bg-emerald-50 text-emerald-600",
    sms: "bg-purple-50 text-purple-600",
    meeting: "bg-amber-50 text-amber-600",
    video_call: "bg-indigo-50 text-indigo-600",
    site_visit: "bg-red-50 text-red-600",
    property_match: "bg-pink-50 text-pink-600",
    other: "bg-slate-50 text-slate-600"
  };

  // Get unique agents from communications
  const agentOptions = React.useMemo(() => {
    const agents = [...new Set(communications.map(c => c.agent_email).filter(Boolean))];
    return agents.map(email => {
      const user = users.find(u => u.email === email);
      return {
        value: email,
        label: user?.display_name || user?.full_name || email.split('@')[0]
      };
    });
  }, [communications, users]);

  // Filter communications
  const filteredCommunications = React.useMemo(() => {
    const now = new Date();
    const searchLower = searchTerm.toLowerCase();
    
    return communications.filter(comm => {
      // Type filter
      if (typeFilter !== "all" && comm.communication_type !== typeFilter) return false;
      
      // Direction filter
      if (directionFilter !== "all" && comm.direction !== directionFilter) return false;
      
      // Agent filter
      if (agentFilter !== "all" && comm.agent_email !== agentFilter) return false;
      
      // Date filter
      if (dateFilter !== "all") {
        const commDate = new Date(comm.communication_date || comm.created_date);
        const daysDiff = Math.floor((now - commDate) / (1000 * 60 * 60 * 24));
        if (dateFilter === "today" && daysDiff > 0) return false;
        if (dateFilter === "week" && daysDiff > 7) return false;
        if (dateFilter === "month" && daysDiff > 30) return false;
      }
      
      // Search filter
      if (searchTerm) {
        const matchesSearch = 
          comm.contact_name?.toLowerCase().includes(searchLower) ||
          comm.summary?.toLowerCase().includes(searchLower) ||
          comm.subject?.toLowerCase().includes(searchLower) ||
          comm.agent_name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [communications, searchTerm, typeFilter, directionFilter, agentFilter, dateFilter]);

  // Stats
  const stats = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      total: communications.length,
      today: communications.filter(c => new Date(c.communication_date || c.created_date) >= today).length,
      calls: communications.filter(c => c.communication_type === 'phone_call').length,
      emails: communications.filter(c => c.communication_type === 'email').length,
      whatsapp: communications.filter(c => c.communication_type === 'whatsapp').length
    };
  }, [communications]);

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setDirectionFilter("all");
    setAgentFilter("all");
    setDateFilter("all");
  };

  const hasActiveFilters = searchTerm || typeFilter !== "all" || directionFilter !== "all" || agentFilter !== "all" || dateFilter !== "all";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Histórico de Comunicações</h2>
          <p className="text-slate-600">{filteredCommunications.length} de {communications.length} comunicações</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-slate-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
            <p className="text-xs text-slate-600">Hoje</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.calls}</p>
            <p className="text-xs text-slate-600">Chamadas</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats.emails}</p>
            <p className="text-xs text-slate-600">Emails</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.whatsapp}</p>
            <p className="text-xs text-slate-600">WhatsApp</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar contacto, assunto..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="phone_call">Chamadas</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="meeting">Reuniões</SelectItem>
                <SelectItem value="video_call">Videochamadas</SelectItem>
                <SelectItem value="site_visit">Visitas</SelectItem>
                <SelectItem value="property_match">Matches</SelectItem>
              </SelectContent>
            </Select>

            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="outbound">Enviadas</SelectItem>
                <SelectItem value="inbound">Recebidas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Agentes</SelectItem>
                {agentOptions.map(agent => (
                  <SelectItem key={agent.value} value={agent.value}>{agent.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Type Filters */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            <span className="text-xs text-slate-500 flex items-center mr-1">Tipo:</span>
            {Object.entries(typeLabels).map(([type, label]) => {
              const Icon = typeIcons[type];
              return (
                <Badge 
                  key={type}
                  variant={typeFilter === type ? "default" : "outline"}
                  className="cursor-pointer hover:bg-slate-100"
                  onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {label}
                </Badge>
              );
            })}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Communications List */}
      {filteredCommunications.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {communications.length === 0 ? "Nenhuma comunicação registada" : "Nenhum resultado encontrado"}
            </h3>
            <p className="text-slate-600">
              {communications.length === 0 
                ? "As comunicações aparecerão aqui quando forem registadas"
                : "Tente ajustar os filtros de pesquisa"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCommunications.map((comm) => {
            const Icon = typeIcons[comm.communication_type] || MessageSquare;
            const colorClass = typeColors[comm.communication_type] || typeColors.other;
            const agentUser = users.find(u => u.email === comm.agent_email);
            const agentName = agentUser?.display_name || agentUser?.full_name || comm.agent_name || comm.agent_email?.split('@')[0];
            
            return (
              <Card key={comm.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {comm.contact_name || "Contacto"}
                        </span>
                        <Badge className={`text-xs ${colorClass}`}>
                          {typeLabels[comm.communication_type]}
                        </Badge>
                        {comm.direction === 'inbound' ? (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                            Recebido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                      </div>

                      {comm.subject && (
                        <p className="text-sm font-medium text-slate-700 mb-1">{comm.subject}</p>
                      )}
                      
                      {comm.summary && (
                        <p className="text-sm text-slate-600 line-clamp-2">{comm.summary}</p>
                      )}

                      {comm.property_title && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-purple-600">
                          <Building2 className="w-3 h-3" />
                          {comm.property_title}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                        <span>
                          {format(new Date(comm.communication_date || comm.created_date), "d MMM yyyy, HH:mm", { locale: ptBR })}
                        </span>
                        {agentName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {agentName}
                          </span>
                        )}
                        {comm.duration_minutes && (
                          <span>{comm.duration_minutes} min</span>
                        )}
                        {comm.outcome && (
                          <Badge variant="outline" className="text-xs">
                            {comm.outcome === 'successful' ? '✓ Sucesso' : 
                             comm.outcome === 'no_answer' ? 'Sem resposta' :
                             comm.outcome === 'callback_requested' ? 'Callback' :
                             comm.outcome === 'scheduled_meeting' ? 'Agendado' :
                             comm.outcome}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}