import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Target, Users, RefreshCw, Calendar, Loader2, AlertCircle, Pause, Play } from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function FacebookCampaignDashboard() {
  const [period, setPeriod] = React.useState("30");
  const [selectedCampaign, setSelectedCampaign] = React.useState("all");
  const [syncing, setSyncing] = React.useState(false);
  const [togglingCampaign, setTogglingCampaign] = React.useState(null);

  const { data: fbSettings } = useQuery({
    queryKey: ['fb_settings'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.fb_lead_settings || { configured: false, campaigns: [] };
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['facebookLeads'],
    queryFn: () => base44.entities.FacebookLead.list('-created_date'),
  });

  const campaigns = React.useMemo(() => {
    if (!fbSettings?.configured || !fbSettings?.access_token) return [];
    
    // Agregar dados dos leads reais por campanha
    const campaignMap = new Map();
    
    // Também usar campanhas configuradas
    if (fbSettings?.campaigns) {
      fbSettings.campaigns.forEach(campaign => {
        campaignMap.set(campaign.form_id, {
          id: campaign.campaign_id || campaign.form_id,
          name: campaign.campaign_name || campaign.form_name || campaign.form_id,
          form_id: campaign.form_id,
          status: 'ACTIVE',
          budget: campaign.budget || 0,
          leads: 0,
          spend: campaign.spend || 0,
          impressions: 0,
          clicks: 0
        });
      });
    }
    
    leads.forEach(lead => {
      const key = lead.form_id || lead.campaign_id;
      if (!key) return;
      
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          id: lead.campaign_id || key,
          name: lead.campaign_name || lead.form_name || key,
          form_id: lead.form_id,
          status: lead.campaign_status || 'ACTIVE',
          budget: lead.campaign_budget || 0,
          start_date: lead.campaign_start_date,
          end_date: lead.campaign_end_date,
          leads: 0,
          spend: 0,
          impressions: 0,
          clicks: 0
        });
      }
      
      const campaign = campaignMap.get(key);
      campaign.leads += 1;
      // Usar budget da campanha como spend estimado se não tiver spend real
      if (campaign.spend === 0 && campaign.budget > 0) {
        campaign.spend = campaign.budget;
      }
    });
    
    // Converter para array e calcular métricas
    return Array.from(campaignMap.values()).map(campaign => ({
      ...campaign,
      costPerLead: campaign.leads > 0 && campaign.spend > 0 ? (campaign.spend / campaign.leads).toFixed(2) : '-',
      conversionRate: campaign.clicks > 0 ? ((campaign.leads / campaign.clicks) * 100).toFixed(2) : '-',
      trend: 0
    }));
  }, [fbSettings, leads]);

  const loadingCampaigns = false;

  const queryClient = useQueryClient();

  const syncCampaigns = async () => {
    if (!fbSettings?.configured || !fbSettings?.access_token) {
      toast.error("Configure o Access Token primeiro");
      return;
    }

    setSyncing(true);
    try {
      queryClient.invalidateQueries({ queryKey: ['facebookLeads'] });
      queryClient.invalidateQueries({ queryKey: ['fb_settings'] });
      toast.success("Dados atualizados");
    } catch (error) {
      toast.error("Erro ao sincronizar campanhas");
    }
    setSyncing(false);
  };

  const [campaignStatuses, setCampaignStatuses] = React.useState({});

  const toggleCampaignStatus = async (campaignId, currentStatus) => {
    const action = currentStatus === 'ACTIVE' ? 'pause' : 'activate';
    setTogglingCampaign(campaignId);
    
    try {
      const response = await base44.functions.invoke('manageFacebookCampaign', {
        action,
        campaign_id: campaignId
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        // Atualizar estado local imediatamente
        setCampaignStatuses(prev => ({
          ...prev,
          [campaignId]: response.data.new_status
        }));
        queryClient.invalidateQueries({ queryKey: ['facebookLeads'] });
      } else {
        toast.error(response.data.error || 'Erro ao alterar estado da campanha');
      }
    } catch (error) {
      toast.error('Erro ao comunicar com o Facebook');
    }
    
    setTogglingCampaign(null);
  };

  // Função para obter o estado atual da campanha (local ou original)
  const getCampaignStatus = (campaign) => {
    return campaignStatuses[campaign.id] || campaign.status;
  };

  const filteredCampaigns = React.useMemo(() => {
    if (selectedCampaign === "all") return campaigns;
    return campaigns.filter(c => c.id === selectedCampaign);
  }, [campaigns, selectedCampaign]);

  const totalStats = React.useMemo(() => {
    return filteredCampaigns.reduce((acc, campaign) => ({
      leads: acc.leads + campaign.leads,
      spend: acc.spend + campaign.spend,
      impressions: acc.impressions + campaign.impressions,
      clicks: acc.clicks + campaign.clicks
    }), { leads: 0, spend: 0, impressions: 0, clicks: 0 });
  }, [filteredCampaigns]);

  const avgCostPerLead = totalStats.leads > 0 ? (totalStats.spend / totalStats.leads).toFixed(2) : 0;
  const avgConversionRate = totalStats.clicks > 0 ? ((totalStats.leads / totalStats.clicks) * 100).toFixed(2) : 0;

  // Timeline data (mock for demonstration)
  const timelineData = React.useMemo(() => {
    const days = parseInt(period);
    return Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = subDays(new Date(), days - i - 1);
      return {
        date: format(date, "dd/MM", { locale: ptBR }),
        leads: Math.floor(Math.random() * 8) + 2,
        spend: Math.floor(Math.random() * 50) + 20,
        costPerLead: (Math.random() * 5 + 5).toFixed(2)
      };
    });
  }, [period]);

  if (!fbSettings?.configured || !fbSettings?.access_token) {
    return (
      <Card className="border-amber-500">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Configuração Necessária
          </h3>
          <p className="text-slate-600 mb-4">
            Configure o Access Token do Facebook na aba "Integração Facebook Leads" para visualizar o dashboard de campanhas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard de Campanhas</h2>
          <p className="text-slate-600">Performance de Facebook/Instagram Leads</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={syncCampaigns} disabled={syncing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 mb-1">Total de Leads</p>
                <p className="text-3xl font-bold text-blue-900">{totalStats.leads}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {leads.length} importados
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 mb-1">Investimento Total</p>
                <p className="text-3xl font-bold text-green-900">€{totalStats.spend.toFixed(2)}</p>
                <p className="text-xs text-green-700 mt-1">
                  {filteredCampaigns.length} campanhas
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 mb-1">Custo por Lead</p>
                <p className="text-3xl font-bold text-amber-900">€{avgCostPerLead}</p>
                <p className="text-xs text-amber-700 mt-1">Média geral</p>
              </div>
              <Target className="w-10 h-10 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 mb-1">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-purple-900">{avgConversionRate}%</p>
                <p className="text-xs text-purple-700 mt-1">Cliques → Leads</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Campanha:</label>
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Campanhas</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} name="Leads" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Investimento Diário</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="spend" fill="#10b981" radius={[8, 8, 0, 0]} name="Investimento (€)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance por Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCampaigns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhuma campanha encontrada
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map(campaign => (
                <div key={campaign.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{campaign.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                        </span>
                        <span className="text-xs text-slate-500">ID: {campaign.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                        disabled={togglingCampaign === campaign.id}
                        className={campaign.status === 'ACTIVE' 
                          ? 'text-amber-600 hover:bg-amber-50 border-amber-300' 
                          : 'text-green-600 hover:bg-green-50 border-green-300'}
                      >
                        {togglingCampaign === campaign.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : campaign.status === 'ACTIVE' ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Suspender
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Reativar
                          </>
                        )}
                      </Button>
                      <div className={`flex items-center gap-1 ${campaign.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {campaign.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="text-sm font-medium">{campaign.trend >= 0 ? '+' : ''}{campaign.trend}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Leads</p>
                      <p className="text-lg font-bold text-slate-900">{campaign.leads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Investimento</p>
                      <p className="text-lg font-bold text-slate-900">€{campaign.spend.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Custo/Lead</p>
                      <p className="text-lg font-bold text-slate-900">€{campaign.costPerLead}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Conversão</p>
                      <p className="text-lg font-bold text-slate-900">{campaign.conversionRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Impressões</p>
                      <p className="text-lg font-bold text-slate-900">{campaign.impressions.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}