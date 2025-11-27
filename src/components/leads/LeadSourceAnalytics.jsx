import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Euro, Target, Award,
  Facebook, Globe, UserPlus, Phone, Building2, Share2,
  Calendar, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const SOURCE_CONFIG = {
  facebook_ads: { label: "Facebook Ads", icon: Facebook, color: "#1877F2" },
  website: { label: "Website", icon: Globe, color: "#10B981" },
  referral: { label: "Referência", icon: UserPlus, color: "#8B5CF6" },
  direct_contact: { label: "Contacto Direto", icon: Phone, color: "#F59E0B" },
  real_estate_portal: { label: "Portal Imobiliário", icon: Building2, color: "#EF4444" },
  networking: { label: "Networking", icon: Share2, color: "#EC4899" },
  google_ads: { label: "Google Ads", icon: Globe, color: "#4285F4" },
  instagram: { label: "Instagram", icon: Share2, color: "#E4405F" },
  linkedin: { label: "LinkedIn", icon: Share2, color: "#0A66C2" },
  other: { label: "Outros", icon: Target, color: "#6B7280" }
};

export default function LeadSourceAnalytics() {
  const [period, setPeriod] = useState("6months");
  const [selectedSource, setSelectedSource] = useState(null);

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  // Calculate metrics
  const analytics = useMemo(() => {
    const now = new Date();
    const periodMonths = period === "3months" ? 3 : period === "6months" ? 6 : 12;
    const startDate = subMonths(now, periodMonths);

    // Filter by period
    const filteredOpps = opportunities.filter(o => {
      const date = new Date(o.created_date);
      return date >= startDate;
    });

    // Group by source
    const bySource = {};
    filteredOpps.forEach(opp => {
      const source = opp.lead_source || 'other';
      if (!bySource[source]) {
        bySource[source] = {
          source,
          total: 0,
          hot: 0,
          warm: 0,
          cold: 0,
          won: 0,
          lost: 0,
          totalValue: 0,
          avgScore: 0,
          scores: [],
          conversionTimes: []
        };
      }
      
      bySource[source].total++;
      
      if (opp.qualification_status === 'hot') bySource[source].hot++;
      else if (opp.qualification_status === 'warm') bySource[source].warm++;
      else if (opp.qualification_status === 'cold') bySource[source].cold++;
      
      if (opp.status === 'won') {
        bySource[source].won++;
        bySource[source].totalValue += opp.estimated_value || opp.budget || 0;
        
        if (opp.actual_close_date) {
          const conversionDays = (new Date(opp.actual_close_date) - new Date(opp.created_date)) / (1000 * 60 * 60 * 24);
          bySource[source].conversionTimes.push(conversionDays);
        }
      } else if (opp.status === 'lost') {
        bySource[source].lost++;
      }
      
      if (opp.qualification_score) {
        bySource[source].scores.push(opp.qualification_score);
      }
    });

    // Calculate averages and rates
    Object.values(bySource).forEach(s => {
      s.conversionRate = s.total > 0 ? ((s.won / s.total) * 100).toFixed(1) : 0;
      s.avgScore = s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0;
      s.avgConversionDays = s.conversionTimes.length > 0 
        ? Math.round(s.conversionTimes.reduce((a, b) => a + b, 0) / s.conversionTimes.length)
        : null;
    });

    // Monthly trend
    const monthlyData = [];
    for (let i = periodMonths - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthOpps = filteredOpps.filter(o => {
        const date = new Date(o.created_date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const monthSources = {};
      monthOpps.forEach(o => {
        const source = o.lead_source || 'other';
        monthSources[source] = (monthSources[source] || 0) + 1;
      });
      
      monthlyData.push({
        month: format(monthStart, "MMM", { locale: ptBR }),
        total: monthOpps.length,
        ...monthSources
      });
    }

    // Totals
    const totalLeads = filteredOpps.length;
    const totalWon = filteredOpps.filter(o => o.status === 'won').length;
    const totalValue = filteredOpps.filter(o => o.status === 'won')
      .reduce((acc, o) => acc + (o.estimated_value || o.budget || 0), 0);
    const avgScore = filteredOpps.filter(o => o.qualification_score)
      .reduce((acc, o, _, arr) => acc + o.qualification_score / arr.length, 0);

    return {
      bySource: Object.values(bySource).sort((a, b) => b.total - a.total),
      monthlyData,
      totals: {
        leads: totalLeads,
        won: totalWon,
        value: totalValue,
        avgScore: Math.round(avgScore),
        conversionRate: totalLeads > 0 ? ((totalWon / totalLeads) * 100).toFixed(1) : 0
      }
    };
  }, [opportunities, period]);

  const COLORS = Object.values(SOURCE_CONFIG).map(s => s.color);

  const pieData = analytics.bySource.map(s => ({
    name: SOURCE_CONFIG[s.source]?.label || s.source,
    value: s.total,
    color: SOURCE_CONFIG[s.source]?.color || '#6B7280'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-600" />
            Análise de Origens de Leads
          </h2>
          <p className="text-slate-600">Performance por canal de aquisição</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
            <SelectItem value="6months">Últimos 6 meses</SelectItem>
            <SelectItem value="12months">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Leads</p>
                <p className="text-2xl font-bold text-slate-900">{analytics.totals.leads}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-green-600">{analytics.totals.conversionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Score Médio</p>
                <p className="text-2xl font-bold text-amber-600">{analytics.totals.avgScore}</p>
              </div>
              <Award className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Gerado</p>
                <p className="text-2xl font-bold text-purple-600">€{(analytics.totals.value / 1000000).toFixed(1)}M</p>
              </div>
              <Euro className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Line Chart - Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6366F1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366F1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance por Origem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.bySource.map((source) => {
              const config = SOURCE_CONFIG[source.source] || SOURCE_CONFIG.other;
              const Icon = config.icon;
              
              return (
                <div
                  key={source.source}
                  className="p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedSource(selectedSource === source.source ? null : source.source)}
                  style={{ borderColor: `${config.color}30` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: config.color }} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{config.label}</h4>
                        <p className="text-sm text-slate-500">{source.total} leads</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      {/* Quality Distribution */}
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800">{source.hot} 🔥</Badge>
                        <Badge className="bg-orange-100 text-orange-800">{source.warm} 🟡</Badge>
                        <Badge className="bg-blue-100 text-blue-800">{source.cold} ❄️</Badge>
                      </div>

                      {/* Conversion Rate */}
                      <div className="text-center w-20">
                        <p className="text-lg font-bold text-green-600">{source.conversionRate}%</p>
                        <p className="text-xs text-slate-500">Conversão</p>
                      </div>

                      {/* Avg Score */}
                      <div className="text-center w-16">
                        <p className="text-lg font-bold text-amber-600">{source.avgScore}</p>
                        <p className="text-xs text-slate-500">Score</p>
                      </div>

                      {/* Value */}
                      <div className="text-center w-24">
                        <p className="text-lg font-bold text-purple-600">
                          €{(source.totalValue / 1000).toFixed(0)}k
                        </p>
                        <p className="text-xs text-slate-500">Valor</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedSource === source.source && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{source.won}</p>
                        <p className="text-xs text-slate-600">Ganhos</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{source.lost}</p>
                        <p className="text-xs text-slate-600">Perdidos</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {source.avgConversionDays || '-'}
                        </p>
                        <p className="text-xs text-slate-600">Dias p/ conversão</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-600">
                          {source.total > 0 ? Math.round(source.totalValue / source.won || 0).toLocaleString() : '-'}
                        </p>
                        <p className="text-xs text-slate-600">Valor médio (€)</p>
                      </div>

                      {/* Quality Bar */}
                      <div className="col-span-4">
                        <p className="text-xs text-slate-500 mb-1">Distribuição de Qualidade</p>
                        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                          <div 
                            className="bg-red-500" 
                            style={{ width: `${(source.hot / source.total) * 100}%` }}
                          />
                          <div 
                            className="bg-orange-400" 
                            style={{ width: `${(source.warm / source.total) * 100}%` }}
                          />
                          <div 
                            className="bg-blue-400" 
                            style={{ width: `${(source.cold / source.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}