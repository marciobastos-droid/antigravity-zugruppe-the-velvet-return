import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Download, FileText, TrendingUp, Euro, Calendar, Building2, Home, CheckCircle2, Key, Target } from "lucide-react";
import moment from "moment";
import { useAgentNames } from "@/components/common/useAgentNames";

export default function SalesReport() {
  const [period, setPeriod] = useState("365");
  const [groupBy, setGroupBy] = useState("month");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const { getAgentName } = useAgentNames();

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities_sales'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users_sales'],
    queryFn: () => base44.entities.User.list()
  });

  const analytics = useMemo(() => {
    const cutoffDate = moment().subtract(parseInt(period), 'days');
    let filtered = opportunities.filter(o => 
      moment(o.created_date).isAfter(cutoffDate) && 
      (o.status === 'won' || o.status === 'lost')
    );

    if (selectedAgent !== 'all') {
      filtered = filtered.filter(o => o.assigned_to === selectedAgent);
    }

    // Sales by period
    const periodData = {};
    const format = groupBy === 'month' ? 'YYYY-MM' : groupBy === 'quarter' ? 'YYYY-Q' : 'YYYY-WW';
    const labelFormat = groupBy === 'month' ? 'MMM YY' : groupBy === 'quarter' ? '[Q]Q YYYY' : '[S]WW';

    filtered.forEach(opp => {
      const key = moment(opp.actual_close_date || opp.created_date).format(format);
      if (!periodData[key]) {
        periodData[key] = {
          period: moment(opp.actual_close_date || opp.created_date).format(labelFormat),
          sales: 0,
          rentals: 0,
          salesValue: 0,
          rentalsValue: 0,
          won: 0,
          lost: 0
        };
      }

      if (opp.status === 'won') {
        periodData[key].won++;
        if (opp.lead_type === 'comprador' || opp.lead_type === 'parceiro_comprador') {
          periodData[key].sales++;
          periodData[key].salesValue += opp.estimated_value || 0;
        } else {
          periodData[key].rentals++;
          periodData[key].rentalsValue += opp.estimated_value || 0;
        }
      } else {
        periodData[key].lost++;
      }
    });

    const timeSeriesData = Object.values(periodData).sort((a, b) => {
      const aDate = moment(a.period, labelFormat);
      const bDate = moment(b.period, labelFormat);
      return aDate - bDate;
    });

    // Totals
    const totals = filtered.reduce((acc, o) => {
      if (o.status === 'won') {
        acc.won++;
        acc.wonValue += o.estimated_value || 0;
        if (o.lead_type === 'comprador' || o.lead_type === 'parceiro_comprador') {
          acc.sales++;
          acc.salesValue += o.estimated_value || 0;
        } else {
          acc.rentals++;
          acc.rentalsValue += o.estimated_value || 0;
        }
      } else {
        acc.lost++;
      }
      return acc;
    }, { won: 0, lost: 0, wonValue: 0, sales: 0, salesValue: 0, rentals: 0, rentalsValue: 0 });

    totals.winRate = (totals.won + totals.lost) > 0 
      ? ((totals.won / (totals.won + totals.lost)) * 100).toFixed(1)
      : 0;
    totals.avgDealSize = totals.won > 0 ? Math.round(totals.wonValue / totals.won) : 0;

    // By agent
    const byAgent = {};
    filtered.filter(o => o.status === 'won').forEach(o => {
      const agent = o.assigned_to || 'unassigned';
      if (!byAgent[agent]) {
        byAgent[agent] = {
          agent: getAgentName(agent) || agent,
          email: agent,
          count: 0,
          value: 0
        };
      }
      byAgent[agent].count++;
      byAgent[agent].value += o.estimated_value || 0;
    });

    const agentData = Object.values(byAgent).sort((a, b) => b.value - a.value);

    // By property type (from associated properties)
    const typeDistribution = {};
    filtered.filter(o => o.status === 'won').forEach(o => {
      const type = o.property_type_interest || 'other';
      if (!typeDistribution[type]) {
        typeDistribution[type] = { type, count: 0, value: 0 };
      }
      typeDistribution[type].count++;
      typeDistribution[type].value += o.estimated_value || 0;
    });

    const typeData = Object.values(typeDistribution).sort((a, b) => b.value - a.value);

    return {
      timeSeriesData,
      totals,
      agentData,
      typeData
    };
  }, [opportunities, period, groupBy, selectedAgent, getAgentName]);

  const handleExportCSV = () => {
    const headers = ['Período', 'Vendas', 'Arrendamentos', 'Valor Vendas', 'Valor Arrendamentos', 'Ganhos', 'Perdidos'];
    const rows = analytics.timeSeriesData.map(d => [
      d.period, d.sales, d.rentals, d.salesValue, d.rentalsValue, d.won, d.lost
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Relatório de Vendas e Arrendamentos</h2>
          <p className="text-slate-600">Análise temporal de negócios fechados e pipeline de vendas</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Agentes</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.email}>{u.display_name || u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Por Semana</SelectItem>
              <SelectItem value="month">Por Mês</SelectItem>
              <SelectItem value="quarter">Por Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
              <SelectItem value="730">Últimos 2 anos</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Vendas</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{analytics.totals.sales}</p>
            <p className="text-xs text-green-700 mt-1">€{(analytics.totals.salesValue / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Key className="w-4 h-4" />
              <span className="text-sm font-medium">Arrendamentos</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{analytics.totals.rentals}</p>
            <p className="text-xs text-blue-700 mt-1">€{(analytics.totals.rentalsValue / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Total Ganhos</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{analytics.totals.won}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Euro className="w-4 h-4" />
              <span className="text-sm font-medium">Valor Total</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">€{(analytics.totals.wonValue / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Taxa Vitória</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900">{analytics.totals.winRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-pink-900">€{(analytics.totals.avgDealSize / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Evolução Temporal</TabsTrigger>
          <TabsTrigger value="agents">Por Agente</TabsTrigger>
          <TabsTrigger value="types">Por Tipo</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendas e Arrendamentos ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analytics.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="sales" stackId="1" stroke="#10B981" fill="#6EE7B7" name="Vendas" />
                  <Area type="monotone" dataKey="rentals" stackId="1" stroke="#3B82F6" fill="#93C5FD" name="Arrendamentos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Valor Faturado</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analytics.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="salesValue" stroke="#10B981" strokeWidth={2} name="Vendas" />
                  <Line type="monotone" dataKey="rentalsValue" stroke="#3B82F6" strokeWidth={2} name="Arrendamentos" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Taxa de Sucesso por Período</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="won" fill="#10B981" name="Ganhos" />
                    <Bar dataKey="lost" fill="#EF4444" name="Perdidos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tabela de Períodos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-y-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b bg-slate-50">
                        <th className="text-left p-2">Período</th>
                        <th className="text-right p-2">Vendas</th>
                        <th className="text-right p-2">Arrend.</th>
                        <th className="text-right p-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.timeSeriesData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="p-2 font-medium">{row.period}</td>
                          <td className="text-right p-2 text-green-600">{row.sales}</td>
                          <td className="text-right p-2 text-blue-600">{row.rentals}</td>
                          <td className="text-right p-2 font-semibold">€{((row.salesValue + row.rentalsValue) / 1000).toFixed(0)}k</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vendas por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.agentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="agent" width={120} />
                  <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="value" fill="#10B981" name="Valor Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">Agente</th>
                      <th className="text-right p-3">Nº Vendas</th>
                      <th className="text-right p-3">Valor Total</th>
                      <th className="text-right p-3">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.agentData.map((agent) => (
                      <tr key={agent.email} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{agent.agent}</td>
                        <td className="text-right p-3">{agent.count}</td>
                        <td className="text-right p-3 font-semibold text-green-700">€{agent.value.toLocaleString()}</td>
                        <td className="text-right p-3">€{agent.count > 0 ? Math.round(agent.value / agent.count).toLocaleString() : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Tipo de Imóvel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={analytics.typeData}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Valor por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#10B981" name="Valor" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}