import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, ArrowDownToLine, ArrowUpFromLine, Activity, 
  CheckCircle, XCircle, AlertTriangle, Settings, Clock,
  TrendingUp, Users, Building2, Zap
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function CRMSyncDashboard() {
  const queryClient = useQueryClient();
  const [syncingIntegration, setSyncingIntegration] = useState(null);
  const [syncDirection, setSyncDirection] = useState(null);

  const { data: integrations = [] } = useQuery({
    queryKey: ['crmIntegrations'],
    queryFn: () => base44.entities.CRMIntegration.list()
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['crmSyncLogs'],
    queryFn: () => base44.entities.CRMSyncLog.list('-created_date', 50),
    refetchInterval: 30000 // Refresh every 30s
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const pullSyncMutation = useMutation({
    mutationFn: async ({ integrationId, entityTypes }) => {
      const response = await base44.functions.invoke('pullCRMUpdates', {
        integration_id: integrationId,
        entity_types: entityTypes
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Sincronização concluída: ${data.results.contacts_synced + data.results.opportunities_synced} registos`);
      queryClient.invalidateQueries({ queryKey: ['crmSyncLogs', 'contacts', 'opportunities'] });
      setSyncingIntegration(null);
      setSyncDirection(null);
    },
    onError: () => {
      toast.error("Erro na sincronização");
      setSyncingIntegration(null);
      setSyncDirection(null);
    }
  });

  const autoSyncMutation = useMutation({
    mutationFn: async ({ integrationId, direction, entityTypes }) => {
      const response = await base44.functions.invoke('autoSyncCRM', {
        integration_id: integrationId,
        direction,
        entity_types: entityTypes
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Sincronização automática: ${data.results.total_synced} registos`);
      queryClient.invalidateQueries({ queryKey: ['crmSyncLogs', 'crmIntegrations'] });
      setSyncingIntegration(null);
      setSyncDirection(null);
    },
    onError: () => {
      toast.error("Erro na sincronização automática");
      setSyncingIntegration(null);
      setSyncDirection(null);
    }
  });

  const toggleIntegrationMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.CRMIntegration.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crmIntegrations'] });
    }
  });

  // Calculate sync statistics
  const syncStats = React.useMemo(() => {
    const last24h = syncLogs.filter(log => 
      new Date(log.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return {
      total: syncLogs.length,
      last24h: last24h.length,
      success: syncLogs.filter(l => l.status === 'success').length,
      errors: syncLogs.filter(l => l.status === 'error').length,
      successRate: syncLogs.length > 0 
        ? Math.round((syncLogs.filter(l => l.status === 'success').length / syncLogs.length) * 100)
        : 0
    };
  }, [syncLogs]);

  // Entities with CRM IDs
  const syncedEntities = React.useMemo(() => ({
    properties: properties.filter(p => p.external_crm_id).length,
    contacts: contacts.filter(c => c.external_crm_id).length,
    opportunities: opportunities.filter(o => o.external_crm_id).length
  }), [properties, contacts, opportunities]);

  const activeIntegrations = integrations.filter(i => i.is_active);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sincronização CRM</h2>
          <p className="text-slate-600">Gestão de sincronização bidirecional</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Integrações Ativas</p>
                <p className="text-2xl font-bold text-slate-900">{activeIntegrations.length}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Sincronizações (24h)</p>
                <p className="text-2xl font-bold text-slate-900">{syncStats.last24h}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-slate-900">{syncStats.successRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Erros</p>
                <p className="text-2xl font-bold text-slate-900">{syncStats.errors}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Synced Entities Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Entidades Sincronizadas</CardTitle>
          <CardDescription>Registos com ligação ao CRM externo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-slate-900">Imóveis</span>
              </div>
              <Progress value={(syncedEntities.properties / properties.length) * 100} className="h-2 mb-1" />
              <p className="text-sm text-slate-600">
                {syncedEntities.properties} de {properties.length} sincronizados
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-slate-900">Contactos</span>
              </div>
              <Progress value={(syncedEntities.contacts / contacts.length) * 100} className="h-2 mb-1" />
              <p className="text-sm text-slate-600">
                {syncedEntities.contacts} de {contacts.length} sincronizados
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-900">Oportunidades</span>
              </div>
              <Progress value={(syncedEntities.opportunities / opportunities.length) * 100} className="h-2 mb-1" />
              <p className="text-sm text-slate-600">
                {syncedEntities.opportunities} de {opportunities.length} sincronizados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Integrations */}
      {activeIntegrations.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {activeIntegrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>
                      Última sincronização: {integration.last_sync 
                        ? moment(integration.last_sync).fromNow()
                        : 'Nunca'
                      }
                    </CardDescription>
                  </div>
                  <Switch
                    checked={integration.is_active}
                    onCheckedChange={(checked) => 
                      toggleIntegrationMutation.mutate({ id: integration.id, is_active: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Badge variant={integration.sync_on_create ? "default" : "outline"}>
                    Sincronizar ao Criar
                  </Badge>
                  <Badge variant={integration.sync_on_update ? "default" : "outline"}>
                    Sincronizar ao Atualizar
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSyncingIntegration(integration.id);
                      setSyncDirection('pull');
                      pullSyncMutation.mutate({
                        integrationId: integration.id,
                        entityTypes: ['contacts', 'opportunities']
                      });
                    }}
                    disabled={syncingIntegration === integration.id && syncDirection === 'pull'}
                  >
                    {syncingIntegration === integration.id && syncDirection === 'pull' ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />A receber...</>
                    ) : (
                      <><ArrowDownToLine className="w-4 h-4 mr-2" />Receber do CRM</>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSyncingIntegration(integration.id);
                      setSyncDirection('push');
                      autoSyncMutation.mutate({
                        integrationId: integration.id,
                        direction: 'push',
                        entityTypes: ['properties', 'contacts', 'opportunities']
                      });
                    }}
                    disabled={syncingIntegration === integration.id && syncDirection === 'push'}
                  >
                    {syncingIntegration === integration.id && syncDirection === 'push' ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />A enviar...</>
                    ) : (
                      <><ArrowUpFromLine className="w-4 h-4 mr-2" />Enviar para CRM</>
                    )}
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="col-span-2"
                    onClick={() => {
                      setSyncingIntegration(integration.id);
                      setSyncDirection('bidirectional');
                      autoSyncMutation.mutate({
                        integrationId: integration.id,
                        direction: 'bidirectional',
                        entityTypes: ['properties', 'contacts', 'opportunities']
                      });
                    }}
                    disabled={syncingIntegration === integration.id && syncDirection === 'bidirectional'}
                  >
                    {syncingIntegration === integration.id && syncDirection === 'bidirectional' ? (
                      <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />A sincronizar...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" />Sincronização Bidirecional</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes</CardTitle>
          <CardDescription>Últimas 50 sincronizações</CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Nenhuma sincronização registada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">Data/Hora</th>
                    <th className="text-left p-3 font-semibold">Integração</th>
                    <th className="text-left p-3 font-semibold">Tipo</th>
                    <th className="text-left p-3 font-semibold">Ação</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">ID Externo</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 text-slate-600">
                        {moment(log.created_date).format('DD/MM HH:mm')}
                      </td>
                      <td className="p-3 text-slate-900">{log.integration_name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {log.entity_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-700">{log.action}</td>
                      <td className="p-3">
                        {log.status === 'success' ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-500 font-mono">
                        {log.external_id || log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-sync Configuration */}
      {activeIntegrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração de Sincronização Automática</CardTitle>
            <CardDescription>
              Configure a sincronização automática para manter os dados sempre atualizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-1">Sincronização em Tempo Real</p>
                  <p className="text-sm text-blue-700 mb-3">
                    As alterações em Imóveis, Contactos e Oportunidades são sincronizadas automaticamente quando 
                    "Sincronizar ao Criar" ou "Sincronizar ao Atualizar" estão ativos.
                  </p>
                  <div className="flex gap-2 text-xs">
                    <Badge className="bg-blue-200 text-blue-900">
                      ✓ Properties → CRM on create/update
                    </Badge>
                    <Badge className="bg-blue-200 text-blue-900">
                      ✓ Contacts → CRM on create/update
                    </Badge>
                    <Badge className="bg-blue-200 text-blue-900">
                      ✓ Opportunities → CRM on create/update
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900 mb-1">Sincronização Periódica Recomendada</p>
                  <p className="text-sm text-amber-700 mb-3">
                    Para garantir que as alterações feitas diretamente no CRM são refletidas na aplicação, 
                    execute a sincronização bidirecional regularmente (ex: diariamente).
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (activeIntegrations[0]) {
                        setSyncingIntegration(activeIntegrations[0].id);
                        setSyncDirection('bidirectional');
                        autoSyncMutation.mutate({
                          integrationId: activeIntegrations[0].id,
                          direction: 'bidirectional',
                          entityTypes: ['properties', 'contacts', 'opportunities']
                        });
                      }
                    }}
                    disabled={!!syncingIntegration}
                  >
                    Executar Agora
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}