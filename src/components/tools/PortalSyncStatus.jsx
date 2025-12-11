import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function PortalSyncStatus({ portalId, portalName }) {
  const { data: syncLogs = [] } = useQuery({
    queryKey: ['portalSyncLogs', portalId],
    queryFn: async () => {
      // Buscar logs de publicação relacionados ao portal
      const logs = await base44.entities.PublicationLog.filter({
        target_id: portalId,
        target_type: 'portal'
      });
      return logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  const recentLogs = syncLogs.slice(0, 10);
  const successCount = recentLogs.filter(l => l.status === 'success').length;
  const failedCount = recentLogs.filter(l => l.status === 'failed').length;
  const pendingCount = recentLogs.filter(l => l.status === 'pending').length;
  const successRate = recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 0;

  const lastSync = syncLogs[0];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{successCount}</p>
              <p className="text-xs text-slate-600">Sucesso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{failedCount}</p>
              <p className="text-xs text-slate-600">Falhas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <Loader2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
              <p className="text-xs text-slate-600">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-900">{Math.round(successRate)}%</p>
              <p className="text-xs text-slate-600">Taxa Sucesso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Taxa de Sucesso</span>
              <span className="font-semibold text-slate-900">{Math.round(successRate)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Last Sync Info */}
      {lastSync && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  lastSync.status === 'success' ? 'bg-green-100' :
                  lastSync.status === 'failed' ? 'bg-red-100' :
                  'bg-blue-100'
                }`}>
                  {lastSync.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : lastSync.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Última Sincronização</p>
                  <p className="text-xs text-slate-600">
                    {lastSync.property_title} • {formatDistanceToNow(new Date(lastSync.execution_time || lastSync.created_date), { addSuffix: true, locale: pt })}
                  </p>
                </div>
              </div>
              <Badge className={
                lastSync.status === 'success' ? 'bg-green-100 text-green-800' :
                lastSync.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }>
                {lastSync.operation_type}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{log.property_title}</p>
                    <p className="text-xs text-slate-600">
                      {new Date(log.execution_time || log.created_date).toLocaleString('pt-PT')}
                    </p>
                  </div>
                  {log.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 ml-2" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 ml-2" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2 animate-spin" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">Sem sincronizações recentes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}