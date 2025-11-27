import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, MessageSquare, BarChart3, Target, Brain } from "lucide-react";
import ClientDatabase from "../components/crm/ClientDatabase";
import AppointmentScheduler from "../components/crm/AppointmentScheduler";
import CRMDashboard from "../components/crm/CRMDashboard";
import OpportunitiesContent from "../components/crm/OpportunitiesContent";
import MatchingTab from "../components/crm/MatchingTab";

export default function CRMAdvanced() {
  const [activeTab, setActiveTab] = React.useState("clients");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">CRM</h1>
          <p className="text-slate-600">Gestão completa de contactos, oportunidades e comunicações</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Contactos</span>
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Oportunidades</span>
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Matching</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Agendamentos</span>
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Comunicações</span>
            </TabsTrigger>
          </TabsList>

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
  const { data: communications = [], isLoading } = React.useMemo(() => ({ data: [], isLoading: false }), []);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Histórico de Comunicações</h2>
          <p className="text-slate-600">Todas as comunicações registadas</p>
        </div>
      </div>

      <CommunicationsList />
    </div>
  );
}

function CommunicationsList() {
  const { useQuery } = require("@tanstack/react-query");
  const { base44 } = require("@/api/base44Client");
  const { Card, CardContent } = require("@/components/ui/card");
  const { Badge } = require("@/components/ui/badge");
  const { format } = require("date-fns");
  const { ptBR } = require("date-fns/locale");
  const { Phone, Mail, MessageSquare, Video, MapPin, Calendar, ArrowDownLeft, ArrowUpRight } = require("lucide-react");

  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['allCommunicationLogs'],
    queryFn: () => base44.entities.CommunicationLog.list('-communication_date')
  });

  const typeIcons = {
    phone_call: Phone,
    email: Mail,
    whatsapp: MessageSquare,
    sms: MessageSquare,
    meeting: Calendar,
    video_call: Video,
    site_visit: MapPin,
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
    other: "Outro"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma comunicação registada</h3>
          <p className="text-slate-600">As comunicações aparecerão aqui quando forem registadas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {communications.map((comm) => {
        const Icon = typeIcons[comm.communication_type] || MessageSquare;
        
        return (
          <Card key={comm.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-slate-900">
                      {comm.contact_name || "Contacto"}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">
                      {typeLabels[comm.communication_type]}
                    </span>
                    {comm.direction === 'inbound' ? (
                      <Badge variant="outline" className="text-xs">
                        <ArrowDownLeft className="w-3 h-3 mr-1" />
                        Recebido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        Enviado
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-600">{comm.summary}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span>
                      {format(new Date(comm.communication_date || comm.created_date), "d MMM yyyy, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}