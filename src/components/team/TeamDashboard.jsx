import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, CheckCircle2, Clock, TrendingUp, Target, 
  Building2, Phone, AlertCircle, Award, BarChart3
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TeamDashboard({ user }) {
  const [dateRange, setDateRange] = useState("30");

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communications'],
    queryFn: () => base44.entities.CommunicationLog.list('-created_date'),
  });

  const teamMembers = allUsers.filter(u => 
    u.user_type === 'agente' || u.user_type === 'gestor' || u.role === 'admin'
  );

  const daysAgo = parseInt(dateRange);
  const cutoffDate = subDays(new Date(), daysAgo);

  // Calculate metrics for each team member
  const teamMetrics = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.assigned_to === member.email);
    const memberLeads = opportunities.filter(o => o.assigned_to === member.email);
    const memberProperties = properties.filter(p => p.assigned_consultant === member.email);
    const memberComms = communications.filter(c => c.agent_email === member.email);

    const recentTasks = memberTasks.filter(t => new Date(t.created_date) >= cutoffDate);
    const completedTasks = recentTasks.filter(t => t.status === 'completed');
    const overdueTasks = memberTasks.filter(t => 
      t.status !== 'completed' && t.status !== 'cancelled' && 
      t.due_date && new Date(t.due_date) < new Date()
    );

    const recentLeads = memberLeads.filter(o => new Date(o.created_date) >= cutoffDate);
    const closedLeads = memberLeads.filter(o => o.status === 'won' || o.status === 'closed');
    const recentClosedLeads = closedLeads.filter(o => new Date(o.updated_date) >= cutoffDate);

    const recentComms = memberComms.filter(c => new Date(c.created_date) >= cutoffDate);

    const taskCompletionRate = recentTasks.length > 0 
      ? Math.round((completedTasks.length / recentTasks.length) * 100) 
      : 0;

    const leadConversionRate = memberLeads.length > 0
      ? Math.round((closedLeads.length / memberLeads.length) * 100)
      : 0;

    // Calculate performance score (0-100)
    const performanceScore = Math.min(100, Math.round(
      (taskCompletionRate * 0.3) +
      (leadConversionRate * 0.4) +
      (Math.min(recentComms.length, 50) * 0.6) // Up to 30 points for activity
    ));

    return {
      email: member.email,
      name: member.display_name || member.full_name || member.email.split('@')[0],
      role: member.user_type || member.role,
      totalTasks: memberTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: memberTasks.filter(t => t.status === 'pending').length,
      overdueTasks: overdueTasks.length,
      taskCompletionRate,
      totalLeads: memberLeads.length,
      recentLeads: recentLeads.length,
      closedLeads: closedLeads.length,
      recentClosedLeads: recentClosedLeads.length,
      leadConversionRate,
      totalProperties: memberProperties.length,
      recentComms: recentComms.length,
      performanceScore
    };
  }).sort((a, b) => b.performanceScore - a.performanceScore);

  // Team totals
  const teamTotals = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    pendingTasks: tasks.filter(t => t.status === 'pending').length,
    overdueTasks: tasks.filter(t => 
      t.status !== 'completed' && t.status !== 'cancelled' && 
      t.due_date && new Date(t.due_date) < new Date()
    ).length,
    totalLeads: opportunities.length,
    closedLeads: opportunities.filter(o => o.status === 'won' || o.status === 'closed').length
  };

  // Task distribution chart data
  const taskDistributionData = teamMetrics
    .filter(m => m.totalTasks > 0)
    .slice(0, 6)
    .map(m => ({
      name: m.name.split(' ')[0],
      tarefas: m.totalTasks,
      concluidas: m.completedTasks
    }));

  // Lead distribution chart data
  const leadDistributionData = teamMetrics
    .filter(m => m.totalLeads > 0)
    .slice(0, 6)
    .map(m => ({
      name: m.name.split(' ')[0],
      leads: m.totalLeads,
      fechados: m.closedLeads
    }));

  // Task status pie chart
  const taskStatusData = [
    { name: 'Concluídas', value: teamTotals.completedTasks, color: '#10b981' },
    { name: 'Pendentes', value: teamTotals.pendingTasks, color: '#3b82f6' },
    { name: 'Em Atraso', value: teamTotals.overdueTasks, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard de Equipa</h2>
          <p className="text-slate-600">Acompanhe o desempenho da sua equipa</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Membros</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={teamTotals.overdueTasks > 0 ? "border-red-300" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Tarefas Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{teamTotals.overdueTasks}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Tarefas Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{teamTotals.completedTasks}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Leads Fechados</p>
                <p className="text-2xl font-bold text-purple-600">{teamTotals.closedLeads}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tarefas por Membro</CardTitle>
          </CardHeader>
          <CardContent>
            {taskDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={taskDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="tarefas" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="concluidas" fill="#10b981" name="Concluídas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Sem dados de tarefas
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado das Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">
                Sem dados de tarefas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Ranking de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMetrics.map((member, index) => (
              <div key={member.email} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-amber-500' : 
                    index === 1 ? 'bg-slate-400' : 
                    index === 2 ? 'bg-amber-700' : 'bg-slate-300'
                  }`}>
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-slate-200">
                      {member.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Tarefas</p>
                    <p className="font-semibold">{member.completedTasks}/{member.totalTasks}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Atrasadas</p>
                    <p className={`font-semibold ${member.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {member.overdueTasks}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Leads</p>
                    <p className="font-semibold">{member.closedLeads}/{member.totalLeads}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Conversão</p>
                    <p className="font-semibold text-blue-600">{member.leadConversionRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Atividade</p>
                    <p className="font-semibold">{member.recentComms}</p>
                  </div>
                </div>

                <div className="w-32">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Score</span>
                    <span className="text-sm font-bold">{member.performanceScore}</span>
                  </div>
                  <Progress value={member.performanceScore} className="h-2" />
                </div>
              </div>
            ))}

            {teamMetrics.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Nenhum membro da equipa encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}