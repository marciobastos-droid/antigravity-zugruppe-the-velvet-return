import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, FileText, TrendingUp, Users, Building2, Calendar, 
  DollarSign, PieChart as PieChartIcon, BarChart3, Filter, Loader2
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const PERIOD_OPTIONS = [
  { value: "current_month", label: "Mês Atual" },
  { value: "last_month", label: "Mês Anterior" },
  { value: "current_quarter", label: "Trimestre Atual" },
  { value: "last_quarter", label: "Trimestre Anterior" },
  { value: "current_year", label: "Ano Atual" },
  { value: "last_year", label: "Ano Anterior" },
  { value: "last_6_months", label: "Últimos 6 Meses" },
  { value: "last_12_months", label: "Últimos 12 Meses" }
];

const STATUS_LABELS = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
  cancelled: "Cancelado"
};

const DEAL_TYPE_LABELS = {
  sale: "Venda",
  rent: "Arrendamento"
};

export default function CommissionsReports() {
  const [period, setPeriod] = useState("current_year");
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dealTypeFilter, setDealTypeFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.Commission.list('-close_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const agents = users.filter(u => u.user_type === 'agente' || u.user_type === 'gestor' || u.user_type === 'admin');

  // Calculate date range based on period
  const getDateRange = (periodValue) => {
    const now = new Date();
    switch (periodValue) {
      case "current_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "current_quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "last_quarter":
        return { start: startOfQuarter(subMonths(now, 3)), end: endOfQuarter(subMonths(now, 3)) };
      case "current_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "last_year":
        return { start: startOfYear(subMonths(now, 12)), end: endOfYear(subMonths(now, 12)) };
      case "last_6_months":
        return { start: subMonths(now, 6), end: now };
      case "last_12_months":
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  };

  // Filter commissions
  const filteredCommissions = useMemo(() => {
    const { start, end } = getDateRange(period);
    
    return commissions.filter(c => {
      const closeDate = c.close_date ? new Date(c.close_date) : null;
      const inPeriod = closeDate && closeDate >= start && closeDate <= end;
      const matchesAgent = agentFilter === "all" || c.agent_email === agentFilter;
      const matchesStatus = statusFilter === "all" || c.payment_status === statusFilter;
      const matchesDealType = dealTypeFilter === "all" || c.deal_type === dealTypeFilter;
      
      return inPeriod && matchesAgent && matchesStatus && matchesDealType;
    });
  }, [commissions, period, agentFilter, statusFilter, dealTypeFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalDealValue = filteredCommissions.reduce((sum, c) => sum + (c.deal_value || 0), 0);
    const totalCommissions = filteredCommissions.reduce((sum, c) => sum + (c.commission_value || 0), 0);
    const totalAgentCommissions = filteredCommissions.reduce((sum, c) => sum + (c.agent_commission || 0), 0);
    const totalPartnerCommissions = filteredCommissions.reduce((sum, c) => sum + (c.partner_commission || 0), 0);
    const paidCommissions = filteredCommissions.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + (c.commission_value || 0), 0);
    const pendingCommissions = filteredCommissions.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + (c.commission_value || 0), 0);
    const salesCount = filteredCommissions.filter(c => c.deal_type === 'sale').length;
    const rentCount = filteredCommissions.filter(c => c.deal_type === 'rent').length;
    const avgCommissionRate = filteredCommissions.length > 0 
      ? (filteredCommissions.reduce((sum, c) => sum + (c.commission_percentage || 0), 0) / filteredCommissions.length).toFixed(2)
      : 0;

    return {
      totalDealValue,
      totalCommissions,
      totalAgentCommissions,
      totalPartnerCommissions,
      paidCommissions,
      pendingCommissions,
      salesCount,
      rentCount,
      avgCommissionRate,
      transactionCount: filteredCommissions.length
    };
  }, [filteredCommissions]);

  // Chart: Commission by Agent
  const agentChartData = useMemo(() => {
    const agentTotals = {};
    filteredCommissions.forEach(c => {
      if (c.agent_email) {
        if (!agentTotals[c.agent_email]) {
          const agent = agents.find(a => a.email === c.agent_email);
          agentTotals[c.agent_email] = {
            name: (agent?.display_name || agent?.full_name || c.agent_email).split(' ')[0],
            total: 0,
            agentPart: 0,
            count: 0
          };
        }
        agentTotals[c.agent_email].total += c.commission_value || 0;
        agentTotals[c.agent_email].agentPart += c.agent_commission || 0;
        agentTotals[c.agent_email].count++;
      }
    });
    
    return Object.values(agentTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredCommissions, agents]);

  // Chart: Commission by Deal Type
  const dealTypeChartData = useMemo(() => {
    const sales = filteredCommissions.filter(c => c.deal_type === 'sale');
    const rents = filteredCommissions.filter(c => c.deal_type === 'rent');
    
    return [
      { name: 'Vendas', value: sales.reduce((sum, c) => sum + (c.commission_value || 0), 0), count: sales.length },
      { name: 'Arrendamentos', value: rents.reduce((sum, c) => sum + (c.commission_value || 0), 0), count: rents.length }
    ].filter(d => d.count > 0);
  }, [filteredCommissions]);

  // Chart: Status Distribution
  const statusChartData = useMemo(() => {
    return ['pending', 'paid', 'partial', 'cancelled']
      .map(status => ({
        name: STATUS_LABELS[status],
        value: filteredCommissions.filter(c => c.payment_status === status).length,
        amount: filteredCommissions.filter(c => c.payment_status === status).reduce((sum, c) => sum + (c.commission_value || 0), 0)
      }))
      .filter(d => d.value > 0);
  }, [filteredCommissions]);

  // Chart: Monthly Trend
  const monthlyTrendData = useMemo(() => {
    const { start, end } = getDateRange(period);
    const months = [];
    let current = startOfMonth(start);
    
    while (current <= end) {
      const monthEnd = endOfMonth(current);
      const monthCommissions = filteredCommissions.filter(c => {
        const closeDate = c.close_date ? new Date(c.close_date) : null;
        return closeDate && closeDate >= current && closeDate <= monthEnd;
      });
      
      months.push({
        month: format(current, 'MMM yy', { locale: ptBR }),
        valor: monthCommissions.reduce((sum, c) => sum + (c.commission_value || 0), 0),
        quantidade: monthCommissions.length
      });
      
      current = startOfMonth(subMonths(current, -1));
    }
    
    return months;
  }, [filteredCommissions, period]);

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'Data', 'Imóvel', 'Cliente', 'Tipo', 'Agente', 'Valor Negócio', 
      'Comissão %', 'Valor Comissão', 'Split Agente', 'Comissão Agente', 
      'Parceiro', 'Split Parceiro', 'Comissão Parceiro', 'Estado', 'Fatura'
    ];
    
    const rows = filteredCommissions.map(c => [
      c.close_date || '',
      c.property_title || '',
      c.client_name || '',
      DEAL_TYPE_LABELS[c.deal_type] || c.deal_type,
      c.agent_name || '',
      c.deal_value || 0,
      c.commission_percentage || 0,
      c.commission_value || 0,
      c.agent_split || 0,
      c.agent_commission || 0,
      c.partner_name || '',
      c.partner_split || 0,
      c.partner_commission || 0,
      STATUS_LABELS[c.payment_status] || c.payment_status,
      c.invoice_number || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_comissoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF
  const exportPDF = async () => {
    setExporting(true);
    
    const { start, end } = getDateRange(period);
    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period;
    
    const reportContent = `
RELATÓRIO DE COMISSÕES
======================

Período: ${periodLabel}
(${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')})

Filtros Aplicados:
- Agente: ${agentFilter === 'all' ? 'Todos' : agents.find(a => a.email === agentFilter)?.full_name || agentFilter}
- Estado: ${statusFilter === 'all' ? 'Todos' : STATUS_LABELS[statusFilter]}
- Tipo: ${dealTypeFilter === 'all' ? 'Todos' : DEAL_TYPE_LABELS[dealTypeFilter]}

RESUMO
------
Total de Transações: ${metrics.transactionCount}
Volume de Negócios: €${metrics.totalDealValue.toLocaleString()}
Total Comissões: €${metrics.totalCommissions.toLocaleString()}
Comissões Agentes: €${metrics.totalAgentCommissions.toLocaleString()}
Comissões Parceiros: €${metrics.totalPartnerCommissions.toLocaleString()}
Comissões Pagas: €${metrics.paidCommissions.toLocaleString()}
Comissões Pendentes: €${metrics.pendingCommissions.toLocaleString()}
Taxa Média Comissão: ${metrics.avgCommissionRate}%

POR TIPO DE NEGÓCIO
-------------------
Vendas: ${metrics.salesCount} transações
Arrendamentos: ${metrics.rentCount} transações

DETALHES DAS COMISSÕES
----------------------
${filteredCommissions.map(c => `
${c.close_date || '-'} | ${c.property_title || 'Sem título'}
Cliente: ${c.client_name || '-'} | Agente: ${c.agent_name || '-'}
Valor: €${(c.deal_value || 0).toLocaleString()} | Comissão: €${(c.commission_value || 0).toLocaleString()} (${c.commission_percentage || 0}%)
Estado: ${STATUS_LABELS[c.payment_status] || c.payment_status}
---`).join('\n')}

Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_comissoes_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    setExporting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Agentes</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.email} value={agent.email}>
                    {(agent.display_name || agent.full_name || agent.email).split(' ')[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Estados</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="sale">Venda</SelectItem>
                <SelectItem value="rent">Arrendamento</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={exportPDF} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Volume Negócios</p>
                <p className="text-lg font-bold">€{metrics.totalDealValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Comissões</p>
                <p className="text-lg font-bold text-green-600">€{metrics.totalCommissions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Comissões Agentes</p>
                <p className="text-lg font-bold text-purple-600">€{metrics.totalAgentCommissions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pagas</p>
                <p className="text-lg font-bold text-emerald-600">€{metrics.paidCommissions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Transações</p>
                <p className="text-lg font-bold">{metrics.transactionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Commission by Agent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Comissões por Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={agentChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                  <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="agentPart" name="Parte Agente" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                Sem dados para o período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission by Deal Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              Por Tipo de Negócio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dealTypeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dealTypeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {dealTypeChartData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                Sem dados para o período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Distribuição por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" name="Quantidade" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="amount" name="Valor (€)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                Sem dados para o período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="quantidade" name="Transações" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="valor" name="Valor (€)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                Sem dados para o período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhe das Comissões ({filteredCommissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Imóvel</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Agente</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-right p-2">Valor Negócio</th>
                  <th className="text-right p-2">Comissão</th>
                  <th className="text-right p-2">Agente</th>
                  <th className="text-center p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.slice(0, 20).map(c => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-2">{c.close_date ? format(new Date(c.close_date), 'dd/MM/yy') : '-'}</td>
                    <td className="p-2 max-w-[150px] truncate">{c.property_title || '-'}</td>
                    <td className="p-2">{c.client_name || '-'}</td>
                    <td className="p-2">{(c.agent_name || '-').split(' ')[0]}</td>
                    <td className="p-2">{DEAL_TYPE_LABELS[c.deal_type] || c.deal_type}</td>
                    <td className="p-2 text-right">€{(c.deal_value || 0).toLocaleString()}</td>
                    <td className="p-2 text-right font-medium text-green-600">€{(c.commission_value || 0).toLocaleString()}</td>
                    <td className="p-2 text-right">€{(c.agent_commission || 0).toLocaleString()}</td>
                    <td className="p-2 text-center">
                      <Badge variant="outline" className={
                        c.payment_status === 'paid' ? 'bg-green-50 text-green-700' :
                        c.payment_status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                        c.payment_status === 'partial' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }>
                        {STATUS_LABELS[c.payment_status] || c.payment_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCommissions.length > 20 && (
              <p className="text-center text-sm text-slate-500 mt-4">
                Mostrando 20 de {filteredCommissions.length} registos. Exporte para ver todos.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}