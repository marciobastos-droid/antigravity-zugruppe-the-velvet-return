import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Clock, Zap, AlertTriangle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FacebookAutoSyncManager({ fbSettings, onRefresh }) {
  const [running, setRunning] = React.useState(false);
  const [lastResult, setLastResult] = React.useState(null);

  const handleTriggerAutoSync = async () => {
    setRunning(true);
    try {
      const response = await base44.functions.invoke('triggerAutoSync');
      
      if (response.data.success) {
        setLastResult(response.data);
        toast.success(response.data.message || `${response.data.total_leads_synced} leads sincronizadas`);
        onRefresh?.();
      } else {
        throw new Error(response.data.error || 'Erro na sincronização');
      }
    } catch (error) {
      console.error('Erro ao executar auto-sync:', error);
      toast.error(`Erro: ${error.message}`);
    }
    setRunning(false);
  };

  const getCampaignSyncStatus = (campaign) => {
    const lastSyncDate = fbSettings?.last_sync?.[campaign.form_id];
    const intervalHours = campaign.sync_interval_hours || 24;
    
    if (intervalHours === 0) {
      return { status: 'manual', label: 'Manual', color: 'slate', icon: null };
    }
    
    if (!lastSyncDate) {
      return { status: 'pending', label: 'Pendente 1ª Sync', color: 'blue', icon: Clock };
    }

    const nextSyncTime = addHours(new Date(lastSyncDate), intervalHours);
    const now = new Date();
    
    if (now >= nextSyncTime) {
      return { status: 'ready', label: 'Pronta para Sync', color: 'green', icon: CheckCircle2 };
    }

    const hoursRemaining = Math.round((nextSyncTime - now) / (1000 * 60 * 60));
    return { 
      status: 'scheduled', 
      label: `${hoursRemaining}h restantes`, 
      color: 'amber', 
      icon: Clock 
    };
  };

  const campaigns = fbSettings?.campaigns || [];
  const readyCampaigns = campaigns.filter(c => {
    const status = getCampaignSyncStatus(c);
    return status.status === 'ready' || status.status === 'pending';
  });

  return (
    <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Sincronização Automática
          </span>
          {readyCampaigns.length > 0 && (
            <Badge className="bg-green-600 text-white animate-pulse">
              {readyCampaigns.length} pronta{readyCampaigns.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-purple-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 mb-2">Como funciona?</p>
              <p className="text-xs text-purple-800 leading-relaxed">
                As campanhas configuradas com intervalos automáticos serão sincronizadas automaticamente 
                quando o tempo definido passar. Clique no botão abaixo para executar manualmente 
                a verificação e sincronização de todas as campanhas prontas.
              </p>
            </div>
          </div>
        </div>

        {/* Estado das Campanhas */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Estado das Campanhas</h4>
          {campaigns.map((campaign) => {
            const status = getCampaignSyncStatus(campaign);
            const StatusIcon = status.icon;
            const lastSyncDate = fbSettings?.last_sync?.[campaign.form_id];

            const colorClasses = {
              green: 'border-green-300 bg-green-50',
              blue: 'border-blue-300 bg-blue-50',
              amber: 'border-amber-300 bg-amber-50',
              slate: 'border-slate-300 bg-slate-50',
              purple: 'border-purple-300 bg-purple-50'
            };

            const textColorClasses = {
              green: 'text-green-800',
              blue: 'text-blue-800',
              amber: 'text-amber-800',
              slate: 'text-slate-800',
              purple: 'text-purple-800'
            };

            return (
              <div 
                key={campaign.form_id} 
                className={`border-2 rounded-lg p-3 ${colorClasses[status.color]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {StatusIcon && <StatusIcon className={`w-4 h-4 ${textColorClasses[status.color]}`} />}
                      <span className="font-medium text-slate-900 text-sm">
                        {campaign.campaign_name || campaign.campaign_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${textColorClasses[status.color]} bg-white border-0 text-xs`}>
                        {status.label}
                      </Badge>
                      {campaign.sync_interval_hours > 0 && (
                        <span className="text-xs text-slate-600">
                          Intervalo: {campaign.sync_interval_hours}h
                        </span>
                      )}
                      {lastSyncDate && (
                        <span className="text-xs text-slate-500">
                          Última: {formatDistanceToNow(new Date(lastSyncDate), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {campaigns.length === 0 && (
            <div className="text-center py-6 text-slate-500">
              <p className="text-sm">Nenhuma campanha configurada</p>
            </div>
          )}
        </div>

        {/* Último Resultado */}
        {lastResult && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900 text-sm mb-1">
                  Última Execução
                </p>
                <p className="text-xs text-green-800">
                  {lastResult.total_leads_synced} leads sincronizadas
                  {lastResult.total_errors > 0 && ` • ${lastResult.total_errors} erros`}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {format(new Date(lastResult.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Execução Manual */}
        <Button
          onClick={handleTriggerAutoSync}
          disabled={running || campaigns.length === 0}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              A sincronizar...
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              Executar Sincronização Agora
            </>
          )}
        </Button>

        {readyCampaigns.length > 0 && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3">
            <p className="text-xs text-green-800">
              <strong>{readyCampaigns.length} campanha{readyCampaigns.length > 1 ? 's' : ''}</strong> pronta{readyCampaigns.length > 1 ? 's' : ''} para sincronizar.
              Clique no botão acima para executar agora.
            </p>
          </div>
        )}


      </CardContent>
    </Card>
  );
}