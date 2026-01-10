import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Shield, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { format, subMonths, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = {
  consent_granted: "#10b981",
  consent_revoked: "#ef4444",
  data_access: "#3b82f6",
  data_erasure: "#f59e0b",
  data_exported: "#8b5cf6"
};

export default function GDPRMetricsView({ logs = [], requests = [], contacts = [] }) {
  // Métricas gerais
  const stats = React.useMemo(() => {
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === "pending_validation").length;
    const completedRequests = requests.filter(r => r.status === "completed").length;
    const avgResponseTime = completedRequests > 0 
      ? requests
          .filter(r => r.status === "completed" && r.response_sent_date)
          .reduce((acc, r) => {
            const created = new Date(r.created_date);
            const responded = new Date(r.response_sent_date);
            return acc + ((responded - created) / (1000 * 60 * 60 * 24));
          }, 0) / completedRequests
      : 0;

    const totalConsents = contacts.filter(c => c.rgpd_data_processing_consent).length;
    const totalRevocations = contacts.filter(c => c.rgpd_consent_revoked).length;
    const consentRate = contacts.length > 0 ? ((totalConsents / contacts.length) * 100).toFixed(1) : 0;

    return {
      totalRequests,
      pendingRequests,
      completedRequests,
      avgResponseTime: avgResponseTime.toFixed(1),
      totalConsents,
      totalRevocations,
      consentRate
    };
  }, [logs, requests, contacts]);

  // Distribuição por tipo de pedido
  const requestTypeData = React.useMemo(() => {
    const types = requests.reduce((acc, r) => {
      acc[r.request_type] = (acc[r.request_type] || 0) + 1;
      return acc;
    }, {});

    const labels = {
      access: "Acesso",
      rectification: "Retificação",
      erasure: "Eliminação",
      restriction: "Limitação",
      portability: "Portabilidade",
      objection: "Oposição"
    };

    return Object.entries(types).map(([key, value]) => ({
      name: labels[key] || key,
      value,
      color: COLORS[`data_${key}`] || "#64748b"
    }));
  }, [requests]);

  // Timeline de ações RGPD (últimos 6 meses)
  const timelineData = React.useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

    return months.map(month => {
      const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const logsInMonth = logs.filter(log => {
        const logDate = new Date(log.created_date);
        return logDate >= month && logDate < nextMonth;
      });

      return {
        month: format(month, "MMM", { locale: ptBR }),
        consents: logsInMonth.filter(l => l.action_type === "consent_granted").length,
        revocations: logsInMonth.filter(l => l.action_type === "consent_revoked").length,
        requests: logsInMonth.filter(l => l.action_type.includes("request")).length,
        total: logsInMonth.length
      };
    });
  }, [logs]);

  // Distribuição de consentimentos
  const consentData = React.useMemo(() => {
    return [
      { 
        name: "Com Consentimento", 
        value: contacts.filter(c => c.rgpd_data_processing_consent && !c.rgpd_consent_revoked).length,
        color: "#10b981"
      },
      { 
        name: "Sem Consentimento", 
        value: contacts.filter(c => !c.rgpd_data_processing_consent).length,
        color: "#f59e0b"
      },
      { 
        name: "Revogado", 
        value: contacts.filter(c => c.rgpd_consent_revoked).length,
        color: "#ef4444"
      }
    ];
  }, [contacts]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 mb-1">Total Pedidos DSAR</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalRequests}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.completedRequests} concluídos
                </p>
              </div>
              <Shield className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 mb-1">Taxa de Consentimento</p>
                <p className="text-3xl font-bold text-green-900">{stats.consentRate}%</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.totalConsents} contactos
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 mb-1">Pendentes</p>
                <p className="text-3xl font-bold text-amber-900">{stats.pendingRequests}</p>
                <p className="text-xs text-amber-600 mt-1">
                  Aguardam validação
                </p>
              </div>
              <Clock className="w-10 h-10 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 mb-1">Tempo Médio Resposta</p>
                <p className="text-3xl font-bold text-purple-900">{stats.avgResponseTime}d</p>
                <p className="text-xs text-purple-600 mt-1">
                  Prazo legal: 30d
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Ações RGPD</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="consents" stroke="#10b981" strokeWidth={2} name="Consentimentos" />
                <Line type="monotone" dataKey="revocations" stroke="#ef4444" strokeWidth={2} name="Revogações" />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} name="Pedidos DSAR" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Request Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={requestTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {requestTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Consent Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Consentimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  {consentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Types Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipos de Ação (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="consents" fill="#10b981" name="Consentimentos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revocations" fill="#ef4444" name="Revogações" radius={[4, 4, 0, 0]} />
                <Bar dataKey="requests" fill="#3b82f6" name="Pedidos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Summary */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-2">Estado de Conformidade</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-green-700 font-medium">✓ Registos de Ações</p>
                  <p className="text-green-600 text-xs">{logs.length} ações registadas</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">✓ Tempo de Resposta</p>
                  <p className="text-green-600 text-xs">Média: {stats.avgResponseTime} dias (limite: 30)</p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">✓ Taxa de Consentimento</p>
                  <p className="text-green-600 text-xs">{stats.consentRate}% dos contactos</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}