import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Target, Calendar } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = {
  comprador: "#3b82f6",
  vendedor: "#10b981",
  parceiro: "#8b5cf6",
  new: "#3b82f6",
  contacted: "#f59e0b",
  scheduled: "#8b5cf6",
  closed: "#64748b",
  hot: "#ef4444",
  warm: "#f97316",
  cold: "#0ea5e9"
};

export default function OpportunitiesDashboard({ opportunities }) {
  const [period, setPeriod] = React.useState("month");

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "week":
        return { start: subWeeks(now, 1), end: now, interval: "day" };
      case "month":
        return { start: subMonths(now, 1), end: now, interval: "day" };
      case "quarter":
        return { start: subMonths(now, 3), end: now, interval: "week" };
      case "year":
        return { start: subMonths(now, 12), end: now, interval: "month" };
      default:
        return { start: subMonths(now, 1), end: now, interval: "day" };
    }
  };

  const filteredOpportunities = React.useMemo(() => {
    const { start } = getDateRange();
    return opportunities.filter(o => new Date(o.created_date) >= start);
  }, [opportunities, period]);

  // Stats Cards
  const stats = React.useMemo(() => {
    const total = filteredOpportunities.length;
    const previousPeriod = opportunities.filter(o => {
      const { start } = getDateRange();
      const periodLength = new Date() - start;
      const prevStart = new Date(start - periodLength);
      const date = new Date(o.created_date);
      return date >= prevStart && date < start;
    }).length;

    const growth = previousPeriod > 0 ? ((total - previousPeriod) / previousPeriod * 100).toFixed(1) : 0;

    return {
      total,
      new: filteredOpportunities.filter(o => o.status === 'new').length,
      hot: filteredOpportunities.filter(o => o.qualification_status === 'hot').length,
      conversionRate: total > 0 ? ((filteredOpportunities.filter(o => o.status === 'closed').length / total) * 100).toFixed(1) : 0,
      growth
    };
  }, [filteredOpportunities, opportunities, period]);

  // Lead Type Distribution
  const leadTypeData = React.useMemo(() => {
    const types = filteredOpportunities.reduce((acc, o) => {
      acc[o.lead_type] = (acc[o.lead_type] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: "Comprador", value: types.comprador || 0, color: COLORS.comprador },
      { name: "Vendedor", value: types.vendedor || 0, color: COLORS.vendedor },
      { name: "Parceiro", value: types.parceiro || 0, color: COLORS.parceiro }
    ];
  }, [filteredOpportunities]);

  // Status Distribution
  const statusData = React.useMemo(() => {
    const statuses = filteredOpportunities.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: "Novo", value: statuses.new || 0 },
      { name: "Contactado", value: statuses.contacted || 0 },
      { name: "Agendado", value: statuses.scheduled || 0 },
      { name: "Fechado", value: statuses.closed || 0 }
    ];
  }, [filteredOpportunities]);

  // Timeline Data
  const timelineData = React.useMemo(() => {
    const { start, end, interval } = getDateRange();
    let intervals;

    if (interval === "day") {
      intervals = eachDayOfInterval({ start, end });
    } else if (interval === "week") {
      intervals = eachWeekOfInterval({ start, end });
    } else {
      intervals = eachMonthOfInterval({ start, end });
    }

    return intervals.map(date => {
      const nextDate = interval === "day" 
        ? new Date(date.getTime() + 24 * 60 * 60 * 1000)
        : interval === "week"
        ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const leadsInPeriod = filteredOpportunities.filter(o => {
        const created = new Date(o.created_date);
        return created >= date && created < nextDate;
      });

      return {
        date: interval === "month" 
          ? format(date, "MMM", { locale: ptBR })
          : format(date, "dd/MM", { locale: ptBR }),
        total: leadsInPeriod.length,
        comprador: leadsInPeriod.filter(o => o.lead_type === 'comprador').length,
        vendedor: leadsInPeriod.filter(o => o.lead_type === 'vendedor').length,
        parceiro: leadsInPeriod.filter(o => o.lead_type === 'parceiro').length
      };
    });
  }, [filteredOpportunities, period]);

  // Source Data
  const sourceData = React.useMemo(() => {
    const sources = filteredOpportunities.reduce((acc, o) => {
      const source = o.lead_source || 'website';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const labels = {
      facebook_ads: "Facebook Ads",
      website: "Website",
      referral: "Indicação",
      direct_contact: "Contacto Direto",
      real_estate_portal: "Portal",
      networking: "Networking",
      other: "Outro"
    };

    return Object.entries(sources).map(([key, value]) => ({
      name: labels[key] || key,
      value
    })).sort((a, b) => b.value - a.value);
  }, [filteredOpportunities]);

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard de Leads</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Última Semana</SelectItem>
            <SelectItem value="month">Último Mês</SelectItem>
            <SelectItem value="quarter">Último Trimestre</SelectItem>
            <SelectItem value="year">Último Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 mb-1">Total Leads</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${stats.growth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  <TrendingUp className={`w-3 h-3 ${stats.growth < 0 ? 'rotate-180' : ''}`} />
                  {stats.growth >= 0 ? '+' : ''}{stats.growth}% vs período anterior
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-cyan-700 mb-1">Novos</p>
                <p className="text-3xl font-bold text-cyan-900">{stats.new}</p>
                <p className="text-xs text-cyan-700 mt-1">
                  {stats.total > 0 ? ((stats.new / stats.total) * 100).toFixed(0) : 0}% do total
                </p>
              </div>
              <Target className="w-10 h-10 text-cyan-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 mb-1">Hot Leads</p>
                <p className="text-3xl font-bold text-red-900">{stats.hot}</p>
                <p className="text-xs text-red-700 mt-1">🔥 Alta prioridade</p>
              </div>
              <div className="text-4xl">🔥</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 mb-1">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-purple-900">{stats.conversionRate}%</p>
                <p className="text-xs text-purple-700 mt-1">Leads fechados</p>
              </div>
              <Calendar className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Leads por Tipo</CardTitle>
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
                <Line type="monotone" dataKey="comprador" stroke={COLORS.comprador} strokeWidth={2} name="Comprador" />
                <Line type="monotone" dataKey="vendedor" stroke={COLORS.vendedor} strokeWidth={2} name="Vendedor" />
                <Line type="monotone" dataKey="parceiro" stroke={COLORS.parceiro} strokeWidth={2} name="Parceiro" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" stroke="#64748b" style={{ fontSize: '11px' }} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}