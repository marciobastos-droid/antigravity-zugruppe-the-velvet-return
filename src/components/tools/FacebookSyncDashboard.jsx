import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, CheckCircle2, AlertTriangle, XCircle, RefreshCw, 
  TrendingUp, Users, Calendar, Activity, Zap
} from "lucide-react";
import { formatDistanceToNow, addHours, isPast, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FacebookSyncDashboard({ 
  campaigns = [], 
  lastSync = {}, 
  syncLogs = [], 
  leadsByCampaign = {},
  onSync,
  syncing
}) {
  const getCampaignStatus = (campaign) => {
    const lastSyncDate = lastSync[campaign.form_id];
    const intervalHours = campaign.sync_interval_hours || 24;
    
    if (!lastSyncDate) {
      return { status: 'never', label: 'Nunca sincronizado', color: 'text-slate-500', bgColor: 'bg-slate-100' };
    }

    const lastSyncTime = new Date(lastSyncDate);
    const nextSyncTime = addHours(lastSyncTime, intervalHours);
    const now = new Date();

    // Check for recent errors
    const recentLogs = syncLogs
      .filter(log => log.form_id === campaign.form_id)
      .slice(0, 3);
    
    const hasRecentError = recentLogs.some(log => log.status === 'error');

    if (hasRecentError) {
      return { status: 'error', label: 'Erro na última sync', color: 'text-red-600', bgColor: 'bg-red-100' };
    }

    if (isPast(nextSyncTime)) {
      return { status: 'overdue', label: 'Sincronização atrasada', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    }

    const minutesUntilNext = differenceInMinutes(nextSyncTime, now);
    if (minutesUntilNext < 30) {
      return { status: 'soon', label: 'Sync em breve', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }

    return { status: 'ok', label: 'Sincronizado', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Nunca';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const getNextSync = (campaign) => {
    const lastSyncDate = lastSync[campaign.form_id];
    const intervalHours = campaign.sync_interval_hours || 24;
    
    if (!lastSyncDate || intervalHours === 0) return null;
    
    const nextSyncTime = addHours(new Date(lastSyncDate), intervalHours);
    if (isPast(nextSyncTime)) return 'Agora';
    
    return formatDistanceToNow(nextSyncTime, { addSuffix: false, locale: ptBR });
  };

  const getSyncProgress = (campaign) => {
    const lastSyncDate = lastSync[campaign.form_id];
    const intervalHours = campaign.sync_interval_hours || 24;
    
    if (!lastSyncDate || intervalHours === 0) return 0;
    
    const lastSyncTime = new Date(lastSyncDate);
    const nextSyncTime = addHours(lastSyncTime, intervalHours);
    const now = new Date();
    
    const totalInterval = nextSyncTime.getTime() - lastSyncTime.getTime();
    const elapsed = now.getTime() - lastSyncTime.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / totalInterval) * 100));
  };

  // Calculate overall stats
  const allLeads = Object.values(leadsByCampaign).flat();
  const totalLeads = allLeads.length;
  const unconvertedLeads = allLeads.filter(l => l.status !== 'converted');
  const unconvertedCount = unconvertedLeads.length;
  const totalCampaigns = campaigns.length;
  const campaignsWithErrors = campaigns.filter(c => getCampaignStatus(c).status === 'error').length;
  const campaignsOverdue = campaigns.filter(c => getCampaignStatus(c).status === 'overdue').length;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{totalCampaigns}</p>
                <p className="text-xs text-blue-600">Campanhas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{totalLeads}</p>
                <p className="text-xs text-green-600">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-purple-200 bg-gradient-to-br from-purple-50 to-white ${unconvertedCount > 0 ? '' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{unconvertedCount}</p>
                <p className="text-xs text-purple-600">Não Convertidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-orange-200 bg-gradient-to-br from-orange-50 to-white ${campaignsOverdue > 0 ? 'animate-pulse' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">{campaignsOverdue}</p>
                <p className="text-xs text-orange-600">Atrasadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-red-200 bg-gradient-to-br from-red-50 to-white ${campaignsWithErrors > 0 ? 'animate-pulse' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">{campaignsWithErrors}</p>
                <p className="text-xs text-red-600">Com Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {campaigns.map((campaign) => {
          const status = getCampaignStatus(campaign);
          const leadsCount = leadsByCampaign[campaign.form_id]?.length || 0;
          const newLeadsCount = leadsByCampaign[campaign.form_id]?.filter(l => l.status === 'new').length || 0;
          const progress = getSyncProgress(campaign);
          const nextSync = getNextSync(campaign);

          return (
            <Card key={campaign.form_id} className={`border-2 ${status.bgColor} transition-all hover:shadow-md`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">
                        {campaign.campaign_name || `Campanha ${campaign.campaign_id}`}
                      </h4>
                      <Badge className={`${status.bgColor} ${status.color} border-0`}>
                        {status.status === 'ok' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {status.status === 'error' && <XCircle className="w-3 h-3 mr-1" />}
                        {status.status === 'overdue' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {status.status === 'soon' && <Zap className="w-3 h-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {campaign.form_name || `Formulário ${campaign.form_id}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSync(campaign.form_id)}
                    disabled={syncing === campaign.form_id}
                    className="ml-2"
                  >
                    {syncing === campaign.form_id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Sync Timeline */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3 h-3" />
                      Última: {getTimeAgo(lastSync[campaign.form_id])}
                    </span>
                    {nextSync && campaign.sync_interval_hours > 0 && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3 h-3" />
                        Próxima: {nextSync}
                      </span>
                    )}
                  </div>
                  
                  {campaign.sync_interval_hours > 0 && (
                    <div className="relative">
                      <Progress value={progress} className="h-1.5" />
                      <div 
                        className="absolute top-0 h-1.5 bg-blue-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{leadsCount}</span>
                    <span className="text-slate-500">leads</span>
                  </div>
                  {newLeadsCount > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 border-0">
                      {newLeadsCount} novos
                    </Badge>
                  )}
                  {campaign.sync_interval_hours > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Activity className="w-3 h-3 mr-1" />
                      Auto: {campaign.sync_interval_hours}h
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Nenhuma campanha configurada</p>
            <p className="text-sm text-slate-500">Adicione uma campanha para começar a sincronizar leads</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}