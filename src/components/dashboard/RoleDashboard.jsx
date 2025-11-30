import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { LayoutDashboard, Plus, Settings, Target, Euro, Users, TrendingUp, Clock, Calendar, Building2, Phone, Mail, Zap, Award, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { useAgentNames } from "@/components/common/useAgentNames";

const ROLE_PRESETS = {
  sales_manager: {
    name: "Gestor de Vendas",
    widgets: ['team_performance', 'pipeline_overview', 'conversion_funnel', 'monthly_targets', 'agent_ranking', 'bottleneck_alerts']
  },
  agent: {
    name: "Agente",
    widgets: ['my_leads', 'my_performance', 'upcoming_tasks', 'recent_activity', 'personal_targets', 'hot_leads']
  },
  admin: {
    name: "Administrador",
    widgets: ['global_metrics', 'team_performance', 'source_analysis', 'conversion_funnel', 'agent_ranking', 'system_health']
  },
  custom: {
    name: "Personalizado",
    widgets: []
  }
};

const WIDGET_CATALOG = [
  { id: 'team_performance', name: 'Performance da Equipa', category: 'Team', roles: ['admin', 'sales_manager'] },
  { id: 'my_performance', name: 'Minha Performance', category: 'Personal', roles: ['agent'] },
  { id: 'pipeline_overview', name: 'Visão do Pipeline', category: 'Sales', roles: ['admin', 'sales_manager', 'agent'] },
  { id: 'conversion_funnel', name: 'Funil de Conversão', category: 'Sales', roles: ['admin', 'sales_manager'] },
  { id: 'monthly_targets', name: 'Metas Mensais', category: 'Goals', roles: ['admin', 'sales_manager', 'agent'] },
  { id: 'agent_ranking', name: 'Ranking de Agentes', category: 'Team', roles: ['admin', 'sales_manager'] },
  { id: 'my_leads', name: 'Meus Leads', category: 'Personal', roles: ['agent'] },
  { id: 'upcoming_tasks', name: 'Próximas Tarefas', category: 'Tasks', roles: ['agent'] },
  { id: 'recent_activity', name: 'Atividade Recente', category: 'Activity', roles: ['agent'] },
  { id: 'hot_leads', name: 'Leads Hot', category: 'Sales', roles: ['agent', 'sales_manager'] },
  { id: 'source_analysis', name: 'Análise de Origens', category: 'Analytics', roles: ['admin', 'sales_manager'] },
  { id: 'bottleneck_alerts', name: 'Alertas de Bottleneck', category: 'Alerts', roles: ['admin', 'sales_manager'] },
  { id: 'global_metrics', name: 'Métricas Globais', category: 'Overview', roles: ['admin'] },
  { id: 'system_health', name: 'Saúde do Sistema', category: 'System', roles: ['admin'] },
  { id: 'personal_targets', name: 'Metas Pessoais', category: 'Goals', roles: ['agent'] }
];

export default function RoleDashboard() {
  const queryClient = useQueryClient();
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [customWidgets, setCustomWidgets] = useState([]);
  const [dashboardName, setDashboardName] = useState("");
  const { getAgentName } = useAgentNames();

  const { data: user } = useQuery({
    queryKey: ['current_user'],
    queryFn: () => base44.auth.me()
  });

  const { data: dashboardConfig } = useQuery({
    queryKey: ['dashboard_config', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const configs = await base44.entities.DashboardConfig.filter({ user_email: user.email, is_default: true });
      return configs[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities_dashboard'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users_dashboard'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments_dashboard'],
    queryFn: () => base44.entities.Appointment.list('-created_date')
  });

  const saveDashboardMutation = useMutation({
    mutationFn: async (config) => {
      // Delete existing default
      const existing = await base44.entities.DashboardConfig.filter({ user_email: user.email, is_default: true });
      for (const e of existing) {
        await base44.entities.DashboardConfig.delete(e.id);
      }
      // Create new
      return base44.entities.DashboardConfig.create({
        user_email: user.email,
        role_type: selectedRole,
        dashboard_name: dashboardName || ROLE_PRESETS[selectedRole]?.name || 'Meu Dashboard',
        layout: customWidgets.map((w, i) => ({ widget_id: w, widget_type: w, x: 0, y: i, w: 6, h: 4 })),
        is_default: true
      });
    },
    onSuccess: () => {
      toast.success("Dashboard guardado!");
      queryClient.invalidateQueries({ queryKey: ['dashboard_config'] });
      setConfigOpen(false);
    }
  });

  // Determine current role and widgets
  const currentRole = dashboardConfig?.role_type || (user?.user_type === 'admin' ? 'admin' : user?.user_type === 'gestor' ? 'sales_manager' : 'agent');
  const activeWidgets = dashboardConfig?.layout?.map(l => l.widget_id) || ROLE_PRESETS[currentRole]?.widgets || [];

  // Calculate dashboard data
  const dashboardData = useMemo(() => {
    const last30Days = moment().subtract(30, 'days');
    const thisMonth = moment().startOf('month');
    
    const myOpps = opportunities.filter(o => o.assigned_to === user?.email);
    const recentOpps = opportunities.filter(o => moment(o.created_date).isAfter(last30Days));
    const monthlyOpps = opportunities.filter(o => moment(o.created_date).isAfter(thisMonth));

    // Team stats
    const teamStats = allUsers.reduce((acc, u) => {
      const userOpps = opportunities.filter(o => o.assigned_to === u.email);
      const won = userOpps.filter(o => o.status === 'won').length;
      const total = userOpps.length;
      acc.push({
        name: u.display_name || u.full_name,
        email: u.email,
        won,
        total,
        rate: total > 0 ? ((won / total) * 100).toFixed(1) : 0,
        value: userOpps.filter(o => o.status === 'won').reduce((s, o) => s + (o.estimated_value || 0), 0)
      });
      return acc;
    }, []).filter(t => t.total > 0).sort((a, b) => b.won - a.won);

    // Pipeline
    const pipelineData = [
      { stage: 'Novo', count: opportunities.filter(o => o.status === 'new').length, color: '#3B82F6' },
      { stage: 'Contactado', count: opportunities.filter(o => o.status === 'contacted').length, color: '#8B5CF6' },
      { stage: 'Qualificado', count: opportunities.filter(o => o.status === 'qualified').length, color: '#F59E0B' },
      { stage: 'Proposta', count: opportunities.filter(o => o.status === 'proposal').length, color: '#EC4899' },
      { stage: 'Negociação', count: opportunities.filter(o => o.status === 'negotiation').length, color: '#10B981' },
      { stage: 'Ganho', count: opportunities.filter(o => o.status === 'won').length, color: '#059669' }
    ];

    // Hot leads
    const hotLeads = opportunities.filter(o => 
      o.qualification_status === 'hot' && !['won', 'lost'].includes(o.status)
    ).slice(0, 5);

    // Upcoming tasks
    const upcomingTasks = appointments.filter(a => 
      a.assigned_agent === user?.email && 
      moment(a.appointment_date).isAfter(moment()) &&
      a.status !== 'cancelled'
    ).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date)).slice(0, 5);

    // Source analysis
    const sourceData = {};
    recentOpps.forEach(o => {
      const src = o.lead_source || 'other';
      if (!sourceData[src]) sourceData[src] = { source: src, total: 0, won: 0 };
      sourceData[src].total++;
      if (o.status === 'won') sourceData[src].won++;
    });

    // Monthly trend
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthOpps = opportunities.filter(o => moment(o.created_date).isSame(month, 'month'));
      monthlyTrend.push({
        month: month.format('MMM'),
        new: monthOpps.length,
        won: monthOpps.filter(o => o.status === 'won').length
      });
    }

    return {
      myOpps,
      myWon: myOpps.filter(o => o.status === 'won').length,
      myActive: myOpps.filter(o => !['won', 'lost'].includes(o.status)).length,
      myValue: myOpps.filter(o => o.status === 'won').reduce((s, o) => s + (o.estimated_value || 0), 0),
      teamStats,
      pipelineData,
      hotLeads,
      upcomingTasks,
      sourceData: Object.values(sourceData),
      monthlyTrend,
      totalOpps: opportunities.length,
      totalWon: opportunities.filter(o => o.status === 'won').length,
      totalValue: opportunities.filter(o => o.status === 'won').reduce((s, o) => s + (o.estimated_value || 0), 0),
      conversionRate: opportunities.length > 0 
        ? ((opportunities.filter(o => o.status === 'won').length / opportunities.length) * 100).toFixed(1)
        : 0
    };
  }, [opportunities, appointments, allUsers, user]);

  const handleOpenConfig = () => {
    setSelectedRole(currentRole);
    setCustomWidgets(activeWidgets);
    setDashboardName(dashboardConfig?.dashboard_name || '');
    setConfigOpen(true);
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    if (role !== 'custom') {
      setCustomWidgets(ROLE_PRESETS[role]?.widgets || []);
    }
  };

  const toggleWidget = (widgetId) => {
    setCustomWidgets(prev => 
      prev.includes(widgetId) 
        ? prev.filter(w => w !== widgetId)
        : [...prev, widgetId]
    );
    setSelectedRole('custom');
  };

  const renderWidget = (widgetId) => {
    switch (widgetId) {
      case 'global_metrics':
      case 'team_performance':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {widgetId === 'global_metrics' ? 'Métricas Globais' : 'Performance da Equipa'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-900">{dashboardData.totalOpps}</p>
                  <p className="text-xs text-blue-600">Total Leads</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-900">{dashboardData.totalWon}</p>
                  <p className="text-xs text-green-600">Ganhos</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-900">{dashboardData.conversionRate}%</p>
                  <p className="text-xs text-purple-600">Conversão</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-900">€{(dashboardData.totalValue / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-amber-600">Valor</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'my_performance':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Minha Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-900">{dashboardData.myOpps.length}</p>
                  <p className="text-xs text-blue-600">Meus Leads</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-900">{dashboardData.myWon}</p>
                  <p className="text-xs text-green-600">Ganhos</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-900">{dashboardData.myActive}</p>
                  <p className="text-xs text-orange-600">Ativos</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-900">€{(dashboardData.myValue / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-amber-600">Valor</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'pipeline_overview':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dashboardData.pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="stage" width={80} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {dashboardData.pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'agent_ranking':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Ranking de Agentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.teamStats.slice(0, 5).map((agent, idx) => (
                  <div key={agent.email} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                    <span className="w-6 text-center font-bold text-slate-500">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{agent.name}</p>
                    </div>
                    <Badge variant="outline">{agent.won} vendas</Badge>
                    <span className="text-sm font-semibold text-green-600">{agent.rate}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'hot_leads':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-500" />
                Leads Hot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.hotLeads.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum lead hot no momento</p>
              ) : (
                <div className="space-y-2">
                  {dashboardData.hotLeads.map(lead => (
                    <div key={lead.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg border border-red-200">
                      <Badge className="bg-red-100 text-red-800">HOT</Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{lead.buyer_name}</p>
                        <p className="text-xs text-slate-500">{lead.buyer_email}</p>
                      </div>
                      {lead.estimated_value && (
                        <span className="text-sm font-semibold">€{lead.estimated_value.toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'upcoming_tasks':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Próximas Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.upcomingTasks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Sem tarefas agendadas</p>
              ) : (
                <div className="space-y-2">
                  {dashboardData.upcomingTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.client_name}</p>
                      </div>
                      <span className="text-xs text-blue-600">{moment(task.appointment_date).format('DD/MM HH:mm')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'source_analysis':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Análise de Origens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={dashboardData.sourceData}
                    dataKey="total"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ source, percent }) => `${source}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.sourceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'conversion_funnel':
      case 'monthly_targets':
        return (
          <Card key={widgetId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                {widgetId === 'conversion_funnel' ? 'Tendência Mensal' : 'Metas Mensais'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dashboardData.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="new" stackId="1" stroke="#3B82F6" fill="#93C5FD" name="Novos" />
                  <Area type="monotone" dataKey="won" stackId="2" stroke="#10B981" fill="#6EE7B7" name="Ganhos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            {dashboardConfig?.dashboard_name || ROLE_PRESETS[currentRole]?.name || 'Dashboard'}
          </h2>
          <p className="text-slate-600">Dashboard personalizado para {user?.full_name}</p>
        </div>
        <Button variant="outline" onClick={handleOpenConfig}>
          <Settings className="w-4 h-4 mr-2" />
          Personalizar
        </Button>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-2 gap-6">
        {activeWidgets.map(widgetId => renderWidget(widgetId))}
      </div>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Personalizar Dashboard</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Dashboard</Label>
                <Input 
                  value={dashboardName} 
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="Meu Dashboard"
                />
              </div>
              <div>
                <Label>Template de Função</Label>
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="sales_manager">Gestor de Vendas</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Widgets Ativos</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {WIDGET_CATALOG.map(widget => (
                  <div 
                    key={widget.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      customWidgets.includes(widget.id) ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                    onClick={() => toggleWidget(widget.id)}
                  >
                    <Checkbox checked={customWidgets.includes(widget.id)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{widget.name}</p>
                      <p className="text-xs text-slate-500">{widget.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveDashboardMutation.mutate()} disabled={saveDashboardMutation.isPending}>
                {saveDashboardMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}