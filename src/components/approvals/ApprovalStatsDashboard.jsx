import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, 
  Activity, BarChart3, Users, AlertTriangle, Calendar 
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, differenceInHours, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ApprovalStatsDashboard() {
  const [timeRange, setTimeRange] = React.useState(30); // days

  const { data: properties = [] } = useQuery({
    queryKey: ['properties-for-stats'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: approvalHistory = [] } = useQuery({
    queryKey: ['approval-history'],
    queryFn: () => base44.entities.ApprovalHistory.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    const cutoffDate = subDays(new Date(), timeRange);
    const recentProperties = properties.filter(p => 
      new Date(p.created_date) >= cutoffDate
    );

    const pending = recentProperties.filter(p => p.approval_status === 'pending').length;
    const inProgress = recentProperties.filter(p => p.approval_status === 'in_progress').length;
    const approved = recentProperties.filter(p => p.approval_status === 'approved').length;
    const rejected = recentProperties.filter(p => p.approval_status === 'rejected').length;

    const recentHistory = approvalHistory.filter(h => 
      new Date(h.created_date) >= cutoffDate
    );

    // Average approval time
    const approvedHistory = recentHistory.filter(h => h.action === 'approved' && h.duration_hours);
    const avgApprovalTime = approvedHistory.length > 0
      ? approvedHistory.reduce((sum, h) => sum + h.duration_hours, 0) / approvedHistory.length
      : 0;

    // Approval rate
    const totalProcessed = approved + rejected;
    const approvalRate = totalProcessed > 0 ? (approved / totalProcessed) * 100 : 0;

    // By approver
    const byApprover = {};
    recentHistory.forEach(h => {
      if (!byApprover[h.action_by]) {
        byApprover[h.action_by] = { approved: 0, rejected: 0, name: h.action_by_name || h.action_by };
      }
      if (h.action === 'approved') byApprover[h.action_by].approved++;
      if (h.action === 'rejected') byApprover[h.action_by].rejected++;
    });

    // By step
    const byStep = {};
    recentHistory.forEach(h => {
      if (h.step_name) {
        if (!byStep[h.step_name]) byStep[h.step_name] = { approved: 0, rejected: 0 };
        if (h.action === 'approved') byStep[h.step_name].approved++;
        if (h.action === 'rejected') byStep[h.step_name].rejected++;
      }
    });

    // Timeline data (last 7 days)
    const timelineData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = startOfDay(addDays(date, 1));
      
      const dayApprovals = recentHistory.filter(h => {
        const hDate = new Date(h.created_date);
        return hDate >= dayStart && hDate < dayEnd && h.action === 'approved';
      }).length;

      const dayRejections = recentHistory.filter(h => {
        const hDate = new Date(h.created_date);
        return hDate >= dayStart && hDate < dayEnd && h.action === 'rejected';
      }).length;

      timelineData.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        approved: dayApprovals,
        rejected: dayRejections
      });
    }

    return {
      pending,
      inProgress,
      approved,
      rejected,
      avgApprovalTime,
      approvalRate,
      byApprover: Object.entries(byApprover).map(([email, data]) => ({ email, ...data })),
      byStep: Object.entries(byStep).map(([step, data]) => ({ step, ...data })),
      timelineData,
      total: recentProperties.length
    };
  }, [properties, approvalHistory, timeRange]);

  const pieData = [
    { name: 'Aprovados', value: stats.approved, color: '#22c55e' },
    { name: 'Rejeitados', value: stats.rejected, color: '#ef4444' },
    { name: 'Em Progresso', value: stats.inProgress, color: '#f59e0b' },
    { name: 'Pendentes', value: stats.pending, color: '#94a3b8' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Estatísticas de Aprovações</h2>
          <p className="text-slate-600">Últimos {timeRange} dias</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(days => (
            <Button
              key={days}
              variant={timeRange === days ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Taxa de Aprovação</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.approvalRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Tempo Médio</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.avgApprovalTime.toFixed(1)}h
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pendentes</p>
                <p className="text-3xl font-bold text-amber-600">
                  {stats.pending + stats.inProgress}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Processado</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.approved + stats.rejected}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <Activity className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Estados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade (Últimos 7 Dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} name="Aprovados" />
                <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} name="Rejeitados" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Step */}
      {stats.byStep.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance por Passo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byStep}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="step" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="approved" fill="#22c55e" name="Aprovados" />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejeitados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance by Approver */}
      {stats.byApprover.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance por Aprovador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byApprover.map((approver, idx) => {
                const total = approver.approved + approver.rejected;
                const rate = total > 0 ? (approver.approved / total) * 100 : 0;
                
                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {approver.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{approver.name}</p>
                        <p className="text-xs text-slate-500">{approver.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold">{approver.approved}</span>
                          <XCircle className="w-4 h-4 text-red-600 ml-2" />
                          <span className="text-sm font-semibold">{approver.rejected}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Taxa: {rate.toFixed(1)}%
                        </p>
                      </div>
                      <Badge className={rate >= 80 ? "bg-green-100 text-green-700" : rate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                        {rate.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Imóveis com Atraso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const delayed = properties.filter(p => {
              if (p.approval_status !== 'pending' && p.approval_status !== 'in_progress') return false;
              if (!p.approval_submitted_date && !p.created_date) return false;
              
              const submittedDate = new Date(p.approval_submitted_date || p.created_date);
              const hoursSince = differenceInHours(new Date(), submittedDate);
              
              return hoursSince > 48; // More than 48 hours
            });

            if (delayed.length === 0) {
              return (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p>Sem atrasos no processo de aprovação</p>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {delayed.slice(0, 5).map((property) => {
                  const submittedDate = new Date(property.approval_submitted_date || property.created_date);
                  const hoursSince = differenceInHours(new Date(), submittedDate);
                  
                  return (
                    <div key={property.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{property.title}</p>
                        <p className="text-xs text-slate-600">
                          {property.approval_step_name || 'Aguarda aprovação'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-amber-600 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          {hoursSince}h
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(submittedDate, "dd/MM HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {delayed.length > 5 && (
                  <p className="text-xs text-slate-500 text-center pt-2">
                    +{delayed.length - 5} imóveis com atraso
                  </p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper for date addition
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}