import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, TrendingUp, TrendingDown, Building2, Users, 
  Euro, FileText, Calendar, Activity, Eye, MousePointer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminStatsTab() {
  const [period, setPeriod] = useState("30");

  const { data: properties = [] } = useQuery({
    queryKey: ['adminProperties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['adminOpportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['adminUsersStats'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['adminContracts'],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['adminAppointments'],
    queryFn: () => base44.entities.Appointment.list(),
  });

  // Filtrar por período
  const filterByPeriod = (items, dateField = 'created_date') => {
    const startDate = subDays(new Date(), parseInt(period));
    return items.filter(item => {
      const date = item[dateField] ? new Date(item[dateField]) : null;
      return date && date >= startDate;
    });
  };

  const periodProperties = filterByPeriod(properties);
  const periodOpportunities = filterByPeriod(opportunities);
  const periodContracts = filterByPeriod(contracts);

  // Estatísticas gerais
  const totalPropertyValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
  const avgPropertyPrice = properties.length > 0 ? totalPropertyValue / properties.length : 0;
  const soldProperties = properties.filter(p => p.availability_status === 'sold' || p.status === 'sold');
  const activeListings = properties.filter(p => p.status === 'active');
  
  const wonOpportunities = opportunities.filter(o => o.status === 'won');
  const conversionRate = opportunities.length > 0 
    ? ((wonOpportunities.length / opportunities.length) * 100).toFixed(1)
    : 0;

  // Dados para gráficos
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    const monthProps = properties.filter(p => {
      const d = p.created_date ? new Date(p.created_date) : null;
      return d && isWithinInterval(d, { start, end });
    });
    
    const monthOpps = opportunities.filter(o => {
      const d = o.created_date ? new Date(o.created_date) : null;
      return d && isWithinInterval(d, { start, end });
    });
    
    const monthSales = wonOpportunities.filter(o => {
      const d = o.actual_close_date ? new Date(o.actual_close_date) : null;
      return d && isWithinInterval(d, { start, end });
    });

    return {
      month: format(date, 'MMM', { locale: pt }),
      properties: monthProps.length,
      leads: monthOpps.length,
      sales: monthSales.length,
      revenue: monthSales.reduce((sum, o) => sum + (o.estimated_value || 0), 0)
    };
  });

  // Distribuição por tipo de imóvel
  const propertyTypeData = Object.entries(
    properties.reduce((acc, p) => {
      const type = p.property_type || 'outro';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  // Leads por fonte
  const leadSourceData = Object.entries(
    opportunities.reduce((acc, o) => {
      const source = o.lead_source || 'outro';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Top agentes
  const agentStats = users
    .filter(u => u.user_type?.toLowerCase() === 'agente' || u.user_type?.toLowerCase() === 'gestor')
    .map(u => {
      const agentProps = properties.filter(p => p.created_by === u.email);
      const agentOpps = opportunities.filter(o => o.assigned_to === u.email);
      const agentWon = agentOpps.filter(o => o.status === 'won');
      return {
        name: u.full_name || u.email,
        properties: agentProps.length,
        leads: agentOpps.length,
        sales: agentWon.length,
        revenue: agentWon.reduce((sum, o) => sum + (o.estimated_value || 0), 0)
      };
    })
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Imóveis</p>
                <p className="text-2xl font-bold">{properties.length}</p>
                <p className="text-xs text-green-600">+{periodProperties.length} no período</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Total</p>
                <p className="text-2xl font-bold">€{(totalPropertyValue / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-slate-500">Média: €{(avgPropertyPrice / 1000).toFixed(0)}K</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Euro className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Oportunidades</p>
                <p className="text-2xl font-bold">{opportunities.length}</p>
                <p className="text-xs text-amber-600">{conversionRate}% conversão</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vendas</p>
                <p className="text-2xl font-bold">{wonOpportunities.length}</p>
                <p className="text-xs text-green-600">
                  €{(wonOpportunities.reduce((s, o) => s + (o.estimated_value || 0), 0) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last6Months}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="properties" name="Imóveis" fill="#3b82f6" />
                  <Bar dataKey="leads" name="Leads" fill="#f59e0b" />
                  <Bar dataKey="sales" name="Vendas" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Property Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={propertyTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {propertyTypeData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fontes de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leadSourceData.slice(0, 6).map((source, idx) => (
                <div key={source.name} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="flex-1 text-sm capitalize">{source.name.replace(/_/g, ' ')}</span>
                  <span className="font-medium">{source.value}</span>
                  <span className="text-xs text-slate-500">
                    {((source.value / opportunities.length) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agentStats.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Sem dados</p>
              ) : (
                agentStats.map((agent, idx) => (
                  <div key={agent.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-slate-500">
                        {agent.properties} imóveis • {agent.leads} leads
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{agent.sales}</p>
                      <p className="text-xs text-slate-500">vendas</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{activeListings.length}</p>
            <p className="text-sm text-slate-500">Imóveis Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{contracts.length}</p>
            <p className="text-sm text-slate-500">Contratos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Calendar className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{appointments.length}</p>
            <p className="text-sm text-slate-500">Visitas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-sm text-slate-500">Utilizadores</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}