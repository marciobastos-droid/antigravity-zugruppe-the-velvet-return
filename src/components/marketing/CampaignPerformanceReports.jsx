import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, Eye, MousePointer, Users, 
  DollarSign, Target, Download, Calendar, Filter
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CampaignPerformanceReports() {
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [metricView, setMetricView] = useState("overview");

  const { data: campaigns = [] } = useQuery({
    queryKey: ['marketingCampaigns'],
    queryFn: () => base44.entities.MarketingCampaign.list('-created_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  // Filter campaigns by date range
  const startDate = subDays(new Date(), parseInt(dateRange));
  const filteredCampaigns = campaigns.filter(c => {
    const created = new Date(c.created_date);
    return created >= startDate;
  });

  // Get campaign or all campaigns data
  const campaignData = selectedCampaign === "all" 
    ? filteredCampaigns 
    : filteredCampaigns.filter(c => c.id === selectedCampaign);

  // Aggregate metrics
  const totalMetrics = campaignData.reduce((acc, c) => ({
    impressions: acc.impressions + (c.metrics?.impressions || 0),
    clicks: acc.clicks + (c.metrics?.clicks || 0),
    leads: acc.leads + (c.metrics?.leads || 0),
    conversions: acc.conversions + (c.metrics?.conversions || 0),
    spent: acc.spent + (c.spent || 0),
    emails_sent: acc.emails_sent + (c.metrics?.emails_sent || 0),
    emails_opened: acc.emails_opened + (c.metrics?.emails_opened || 0),
    emails_clicked: acc.emails_clicked + (c.metrics?.emails_clicked || 0),
  }), { 
    impressions: 0, clicks: 0, leads: 0, conversions: 0, spent: 0,
    emails_sent: 0, emails_opened: 0, emails_clicked: 0 
  });

  // Calculate derived metrics
  const ctr = totalMetrics.impressions > 0 
    ? ((totalMetrics.clicks / totalMetrics.impressions) * 100).toFixed(2) 
    : 0;
  const conversionRate = totalMetrics.clicks > 0 
    ? ((totalMetrics.leads / totalMetrics.clicks) * 100).toFixed(2) 
    : 0;
  const cpl = totalMetrics.leads > 0 
    ? (totalMetrics.spent / totalMetrics.leads).toFixed(2) 
    : 0;
  const emailOpenRate = totalMetrics.emails_sent > 0 
    ? ((totalMetrics.emails_opened / totalMetrics.emails_sent) * 100).toFixed(2) 
    : 0;
  const emailClickRate = totalMetrics.emails_opened > 0 
    ? ((totalMetrics.emails_clicked / totalMetrics.emails_opened) * 100).toFixed(2) 
    : 0;

  // Leads attributed to campaigns
  const attributedLeads = opportunities.filter(opp => {
    if (selectedCampaign === "all") {
      return campaigns.some(c => 
        opp.source_detail === c.tracking_config?.utm_campaign ||
        opp.lead_source?.includes(c.name)
      );
    }
    const campaign = campaigns.find(c => c.id === selectedCampaign);
    return campaign && (
      opp.source_detail === campaign.tracking_config?.utm_campaign ||
      opp.lead_source?.includes(campaign.name)
    );
  });

  // Time series data for trends
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      impressions: Math.floor(Math.random() * 1000) + 500,
      clicks: Math.floor(Math.random() * 100) + 50,
      leads: Math.floor(Math.random() * 20) + 5
    };
  });

  // Performance by platform
  const platformData = campaigns.reduce((acc, c) => {
    const platform = c.campaign_type;
    if (!acc[platform]) {
      acc[platform] = { 
        platform, 
        campaigns: 0,
        impressions: 0, 
        clicks: 0, 
        leads: 0, 
        spent: 0 
      };
    }
    acc[platform].campaigns += 1;
    acc[platform].impressions += c.metrics?.impressions || 0;
    acc[platform].clicks += c.metrics?.clicks || 0;
    acc[platform].leads += c.metrics?.leads || 0;
    acc[platform].spent += c.spent || 0;
    return acc;
  }, {});

  const platformChartData = Object.values(platformData).map(p => ({
    ...p,
    cpl: p.leads > 0 ? (p.spent / p.leads).toFixed(2) : 0,
    ctr: p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : 0
  }));

  const platformLabels = {
    email: "Email Marketing",
    facebook_ads: "Facebook Ads",
    instagram_ads: "Instagram Ads",
    google_ads: "Google Ads",
    multi_channel: "Multi-Canal"
  };

  // Export report
  const exportReport = () => {
    const report = {
      periodo: `${format(startDate, 'dd/MM/yyyy')} - ${format(new Date(), 'dd/MM/yyyy')}`,
      campanha: selectedCampaign === "all" ? "Todas as Campanhas" : campaigns.find(c => c.id === selectedCampaign)?.name,
      metricas_totais: totalMetrics,
      metricas_calculadas: {
        ctr: `${ctr}%`,
        taxa_conversao: `${conversionRate}%`,
        custo_por_lead: `€${cpl}`,
        taxa_abertura_email: `${emailOpenRate}%`,
        taxa_clique_email: `${emailClickRate}%`
      },
      leads_atribuidos: attributedLeads.length,
      performance_por_plataforma: platformChartData
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-marketing-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Selecionar campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Campanhas</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Impressões</p>
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold mb-1">{totalMetrics.impressions.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Alcance total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Cliques</p>
              <MousePointer className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold mb-1">{totalMetrics.clicks.toLocaleString()}</p>
            <p className="text-xs text-green-600">CTR: {ctr}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Leads Gerados</p>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold mb-1">{attributedLeads.length}</p>
            <p className="text-xs text-purple-600">Conv: {conversionRate}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Custo por Lead</p>
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold mb-1">€{cpl}</p>
            <p className="text-xs text-slate-500">Total: €{totalMetrics.spent.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Email Specific Metrics */}
      {totalMetrics.emails_sent > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Emails Enviados</p>
                <Badge className="bg-blue-100 text-blue-700">{totalMetrics.emails_sent}</Badge>
              </div>
              <p className="text-2xl font-bold">{totalMetrics.emails_sent.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Taxa de Abertura</p>
                <Badge className="bg-green-100 text-green-700">{emailOpenRate}%</Badge>
              </div>
              <p className="text-2xl font-bold">{totalMetrics.emails_opened.toLocaleString()}</p>
              <p className="text-xs text-slate-500">abertos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">Taxa de Clique</p>
                <Badge className="bg-purple-100 text-purple-700">{emailClickRate}%</Badge>
              </div>
              <p className="text-2xl font-bold">{totalMetrics.emails_clicked.toLocaleString()}</p>
              <p className="text-xs text-slate-500">cliques</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tendências de Performance</CardTitle>
            <Select value={metricView} onValueChange={setMetricView}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Visão Geral</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="conversion">Conversão</SelectItem>
                <SelectItem value="cost">Custos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {metricView === "overview" && (
              <AreaChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="impressions" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Impressões" />
                <Area type="monotone" dataKey="clicks" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Cliques" />
              </AreaChart>
            )}
            {metricView === "engagement" && (
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} name="Cliques" />
                <Line type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} name="Leads" />
              </LineChart>
            )}
            {metricView === "conversion" && (
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#8b5cf6" name="Leads" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Platform Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" tickFormatter={(value) => platformLabels[value] || value} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" name="Leads" />
              <Bar yAxisId="right" dataKey="cpl" fill="#f59e0b" name="CPL (€)" />
            </BarChart>
          </ResponsiveContainer>

          {/* Platform Summary Table */}
          <div className="mt-6 space-y-2">
            {platformChartData.map((platform, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">{platformLabels[platform.platform] || platform.platform}</p>
                  <p className="text-sm text-slate-600">{platform.campaigns} campanhas</p>
                </div>
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Impressões</p>
                    <p className="font-bold">{platform.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cliques</p>
                    <p className="font-bold">{platform.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Leads</p>
                    <p className="font-bold">{platform.leads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">CPL</p>
                    <p className="font-bold text-green-600">€{platform.cpl}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas com Melhor Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaignData
              .filter(c => (c.metrics?.leads || 0) > 0)
              .sort((a, b) => {
                const cplA = a.spent / (a.metrics?.leads || 1);
                const cplB = b.spent / (b.metrics?.leads || 1);
                return cplA - cplB;
              })
              .slice(0, 5)
              .map((campaign, idx) => {
                const campaignCPL = campaign.metrics?.leads > 0 
                  ? (campaign.spent / campaign.metrics.leads).toFixed(2) 
                  : 0;
                const campaignROI = campaign.spent > 0 
                  ? (((campaign.metrics?.leads || 0) * 1000 - campaign.spent) / campaign.spent * 100).toFixed(1)
                  : 0;

                return (
                  <div key={campaign.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-l-green-500">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="font-bold text-green-700">#{idx + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{campaign.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {platformLabels[campaign.campaign_type]}
                          </Badge>
                          <span className="text-xs text-slate-600">
                            {campaign.metrics?.impressions?.toLocaleString()} impressões
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">CPL</p>
                      <p className="text-xl font-bold text-green-600">€{campaignCPL}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {campaign.metrics?.leads} leads • €{campaign.spent.toLocaleString()} gasto
                      </p>
                      {campaignROI > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <TrendingUp className="w-3 h-3" />
                          ROI: {campaignROI}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Attributed Leads Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de Leads Atribuídos ({attributedLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Lead status breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['new', 'contacted', 'visit_scheduled', 'won'].map(status => {
                const count = attributedLeads.filter(l => l.status === status).length;
                const percentage = attributedLeads.length > 0 
                  ? ((count / attributedLeads.length) * 100).toFixed(1) 
                  : 0;
                
                return (
                  <div key={status} className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">
                      {status === 'new' ? 'Novos' : 
                       status === 'contacted' ? 'Contactados' :
                       status === 'visit_scheduled' ? 'Visitas Agendadas' :
                       'Convertidos'}
                    </p>
                    <p className="text-2xl font-bold">{count}</p>
                    <Badge variant="outline" className="text-xs mt-1">{percentage}%</Badge>
                  </div>
                );
              })}
            </div>

            {/* Recent attributed leads */}
            {attributedLeads.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Últimos Leads Atribuídos</h4>
                <div className="space-y-2">
                  {attributedLeads.slice(0, 5).map(lead => (
                    <div key={lead.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <p className="font-medium">{lead.buyer_name}</p>
                        <p className="text-xs text-slate-500">
                          {lead.buyer_email} • {lead.lead_source}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-slate-100 text-slate-800">
                          {lead.status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(lead.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign ROI Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Análise de ROI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Investimento</p>
                <p className="text-2xl font-bold text-red-600">€{totalMetrics.spent.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Leads Gerados</p>
                <p className="text-2xl font-bold text-blue-600">{attributedLeads.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Valor Estimado</p>
                <p className="text-2xl font-bold text-green-600">
                  €{(attributedLeads.length * 1000).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">@€1k por lead</p>
              </div>
            </div>

            {totalMetrics.spent > 0 && (
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">ROI Estimado</p>
                    <p className="text-4xl font-bold text-green-700">
                      {(((attributedLeads.length * 1000 - totalMetrics.spent) / totalMetrics.spent) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="w-16 h-16 text-green-500" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const platformLabels = {
  email: "Email Marketing",
  facebook_ads: "Facebook Ads",
  instagram_ads: "Instagram Ads",
  google_ads: "Google Ads",
  multi_channel: "Multi-Canal"
};