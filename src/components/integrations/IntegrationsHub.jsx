import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, Mail, Plug, RefreshCw, Globe, Users, Database, BarChart3, Zap, CheckCircle, AlertCircle, Clock } from "lucide-react";
import GoogleCalendarIntegration from "./GoogleCalendarIntegration";
import PushNotificationManager from "./PushNotificationManager";
import EmailSyncStatus from "./EmailSyncStatus";
import GmailSyncManager from "./GmailSyncManager";
import CRMIntegrations from "../tools/CRMIntegrations";
import PortalIntegrations from "../tools/PortalIntegrations";
import ExternalDataSync from "../tools/ExternalDataSync";

export default function IntegrationsHub() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: crmIntegrations = [] } = useQuery({
    queryKey: ['crmIntegrations'],
    queryFn: () => base44.entities.CRMIntegration.list('-created_date'),
    onError: () => []
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['crmSyncLogs'],
    queryFn: () => base44.entities.CRMSyncLog.list('-created_date', 10),
    onError: () => []
  });

  const activeCRMCount = crmIntegrations.filter(c => c.is_active).length;
  const recentSyncs = syncLogs.filter(log => {
    const logDate = new Date(log.created_date);
    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours() - 24);
    return logDate > dayAgo;
  });
  const successfulSyncs = recentSyncs.filter(l => l.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
          <Plug className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Central de Integrações</h2>
          <p className="text-slate-600">Conecte e sincronize com plataformas externas</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">CRMs Ativos</p>
                <p className="text-2xl font-bold text-slate-900">{activeCRMCount}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Syncs (24h)</p>
                <p className="text-2xl font-bold text-slate-900">{recentSyncs.length}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <RefreshCw className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-slate-900">
                  {recentSyncs.length > 0 ? Math.round((successfulSyncs / recentSyncs.length) * 100) : 0}%
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Status Geral</p>
                <div className="flex items-center gap-1 mt-1">
                  {activeCRMCount > 0 || recentSyncs.length > 0 ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-600">Operacional</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-400">Inativo</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg">
                <Zap className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden md:inline">CRM</span>
          </TabsTrigger>
          <TabsTrigger value="portals" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden md:inline">Portais</span>
          </TabsTrigger>
          <TabsTrigger value="gmail" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden md:inline">Gmail</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden md:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden md:inline">Push</span>
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Plug className="w-4 h-4" />
            <span className="hidden md:inline">Externa</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* CRM Status */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Integrações CRM
                </CardTitle>
                <CardDescription>
                  {activeCRMCount > 0 
                    ? `${activeCRMCount} integração(ões) ativa(s)`
                    : 'Nenhuma integração CRM configurada'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {crmIntegrations.length > 0 ? (
                  <div className="space-y-2">
                    {crmIntegrations.slice(0, 3).map(crm => (
                      <div key={crm.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                        <span className="text-sm font-medium">{crm.name}</span>
                        <Badge className={crm.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}>
                          {crm.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    ))}
                    {crmIntegrations.length > 3 && (
                      <p className="text-xs text-slate-500 text-center">+{crmIntegrations.length - 3} mais</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Configure integrações CRM para sincronizar contactos e leads</p>
                )}
              </CardContent>
            </Card>

            {/* Portal Integrations Status */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-600" />
                  Portais Imobiliários
                </CardTitle>
                <CardDescription>
                  Importação inteligente de listagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Idealista, Imovirtual, Casa Sapo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Extração com IA de qualquer URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Sincronização automática</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Integration */}
            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-red-600" />
                  Gmail & Email
                </CardTitle>
                <CardDescription>
                  Sincronização de emails e comunicações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Gmail Sync ativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Deteção automática de clientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500">SMTP configurado</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar & Notifications */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Calendar & Notificações
                </CardTitle>
                <CardDescription>
                  Agendamento e alertas automáticos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Google Calendar integrado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Push notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Lembretes automáticos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Atividade Recente (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncLogs.length > 0 ? (
                <div className="space-y-2">
                  {syncLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{log.integration_name}</p>
                        <p className="text-xs text-slate-600">{log.property_title || log.action}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {new Date(log.created_date).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {log.status === 'success' ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma atividade recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRM Tab */}
        <TabsContent value="crm" className="mt-6">
          <CRMIntegrations />
        </TabsContent>

        {/* Portals Tab */}
        <TabsContent value="portals" className="mt-6">
          <PortalIntegrations />
        </TabsContent>

        {/* Gmail Tab */}
        <TabsContent value="gmail" className="mt-6">
          <GmailSyncManager />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-6">
          <GoogleCalendarIntegration />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <PushNotificationManager user={user} />
        </TabsContent>

        {/* External Data Sync Tab */}
        <TabsContent value="external" className="mt-6">
          <ExternalDataSync />
        </TabsContent>
      </Tabs>
    </div>
  );
}