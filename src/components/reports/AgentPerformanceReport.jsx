import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from "recharts";
import { Download, FileText, Users, Target, Euro, Clock, Trophy, TrendingUp, Award, Star, Medal } from "lucide-react";
import moment from "moment";
import { useAgentNames } from "@/components/common/useAgentNames";

export default function AgentPerformanceReport() {
  const [period, setPeriod] = useState("90");
  const [selectedMetric, setSelectedMetric] = useState("overall");
  const { getAgentName } = useAgentNames();

  const { data: users = [] } = useQuery({
    queryKey: ['users_agents'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities_agents'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments_agents'],
    queryFn: () => base44.entities.Appointment.list('-created_date')
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communications_agents'],
    queryFn: () => base44.entities.CommunicationLog.list('-created_date')
  });

  const analytics = useMemo(() => {
    const cutoffDate = moment().subtract(parseInt(period), 'days');
    const filteredOpps = opportunities.filter(o => moment(o.created_date).isAfter(cutoffDate));
    const filteredAppts = appointments.filter(a => moment(a.created_date).isAfter(cutoffDate));
    const filteredComms = communications.filter(c => moment(c.created_date).isAfter(cutoffDate));

    const agentStats = {};

    // Initialize all users
    users.forEach(u => {
      const displayName = u.display_name || u.full_name;
      agentStats[u.email] = {
        email: u.email,
        name: displayName,
        avatar: displayName?.[0]?.toUpperCase() || 'U',
        leads: 0,
        won: 0,
        lost: 0,
        active: 0,
        totalValue: 0,
        wonValue: 0,
        appointments: 0,
        completedAppointments: 0,
        communications: 0,
        avgResponseTime: [],
        conversionTimes: [],
        hotLeads: 0,
        qualifiedLeads: 0
      };
    });

    // Process opportunities
    filteredOpps.forEach(opp => {
      const agent = opp.assigned_to;
      if (agent && agentStats[agent]) {
        agentStats[agent].leads++;
        
        if (opp.status === 'won') {
          agentStats[agent].won++;
          agentStats[agent].wonValue += opp.estimated_value || 0;
          if (opp.actual_close_date && opp.created_date) {
            const days = moment(opp.actual_close_date).diff(moment(opp.created_date), 'days');
            agentStats[agent].conversionTimes.push(days);
          }
        } else if (opp.status === 'lost') {
          agentStats[agent].lost++;
        } else {
          agentStats[agent].active++;
        }
        
        agentStats[agent].totalValue += opp.estimated_value || 0;
        
        if (opp.qualification_status === 'hot') agentStats[agent].hotLeads++;
        if (opp.qualification_status) agentStats[agent].qualifiedLeads++;
      }
    });

    // Process appointments
    filteredAppts.forEach(appt => {
      const agent = appt.assigned_agent;
      if (agent && agentStats[agent]) {
        agentStats[agent].appointments++;
        if (appt.status === 'completed') {
          agentStats[agent].completedAppointments++;
        }
      }
    });

    // Process communications
    filteredComms.forEach(comm => {
      const agent = comm.created_by;
      if (agent && agentStats[agent]) {
        agentStats[agent].communications++;
      }
    });

    // Calculate derived metrics
    const agentList = Object.values(agentStats).filter(a => a.leads > 0 || a.appointments > 0).map(a => {
      const conversionRate = a.leads > 0 ? ((a.won / a.leads) * 100).toFixed(1) : 0;
      const avgDealSize = a.won > 0 ? Math.round(a.wonValue / a.won) : 0;
      const avgCycleTime = a.conversionTimes.length > 0 
        ? Math.round(a.conversionTimes.reduce((sum, t) => sum + t, 0) / a.conversionTimes.length)
        : 0;
      const appointmentRate = a.appointments > 0 ? ((a.completedAppointments / a.appointments) * 100).toFixed(1) : 0;
      
      // Overall score (normalized 0-100)
      const scoreComponents = {
        conversion: Math.min(parseFloat(conversionRate) * 2, 25), // max 25 points
        volume: Math.min(a.won * 5, 25), // max 25 points  
        value: Math.min((a.wonValue / 100000) * 10, 25), // max 25 points
        activity: Math.min((a.communications + a.appointments) / 2, 25) // max 25 points
      };
      const overallScore = Math.round(Object.values(scoreComponents).reduce((a, b) => a + b, 0));

      return {
        ...a,
        conversionRate: parseFloat(conversionRate),
        avgDealSize,
        avgCycleTime,
        appointmentRate: parseFloat(appointmentRate),
        overallScore,
        scoreComponents
      };
    });

    // Rankings
    const rankings = {
      byConversion: [...agentList].sort((a, b) => b.conversionRate - a.conversionRate),
      byVolume: [...agentList].sort((a, b) => b.won - a.won),
      byValue: [...agentList].sort((a, b) => b.wonValue - a.wonValue),
      byScore: [...agentList].sort((a, b) => b.overallScore - a.overallScore)
    };

    // Team totals
    const teamTotals = agentList.reduce((acc, a) => ({
      leads: acc.leads + a.leads,
      won: acc.won + a.won,
      lost: acc.lost + a.lost,
      wonValue: acc.wonValue + a.wonValue,
      appointments: acc.appointments + a.appointments
    }), { leads: 0, won: 0, lost: 0, wonValue: 0, appointments: 0 });

    return {
      agents: agentList,
      rankings,
      teamTotals,
      avgConversionRate: agentList.length > 0 
        ? (agentList.reduce((s, a) => s + a.conversionRate, 0) / agentList.length).toFixed(1)
        : 0
    };
  }, [users, opportunities, appointments, communications, period]);

  const handleExportCSV = () => {
    const headers = ['Agente', 'Email', 'Leads', 'Ganhos', 'Perdidos', 'Taxa Conversão %', 'Valor Ganho €', 'Ticket Médio €', 'Ciclo Médio (dias)', 'Visitas', 'Comunicações', 'Score'];
    const rows = analytics.agents.map(a => [
      a.name, a.email, a.leads, a.won, a.lost, a.conversionRate, a.wonValue, a.avgDealSize, a.avgCycleTime, a.appointments, a.communications, a.overallScore
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_performance_${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Performance de Agentes', 20, 20);
    doc.setFontSize(10);
    doc.text(`Período: Últimos ${period} dias | Gerado: ${moment().format('DD/MM/YYYY HH:mm')}`, 20, 30);
    
    let y = 45;
    doc.setFontSize(12);
    doc.text('Top 5 Agentes (por Score):', 20, y);
    y += 10;
    
    analytics.rankings.byScore.slice(0, 5).forEach((a, idx) => {
      doc.setFontSize(10);
      doc.text(`${idx + 1}. ${a.name}: Score ${a.overallScore} | ${a.won} vendas | €${a.wonValue.toLocaleString()} | ${a.conversionRate}% conversão`, 25, y);
      y += 8;
    });
    
    y += 10;
    doc.setFontSize(12);
    doc.text('Totais da Equipa:', 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Leads: ${analytics.teamTotals.leads} | Ganhos: ${analytics.teamTotals.won} | Valor: €${analytics.teamTotals.wonValue.toLocaleString()}`, 25, y);
    
    doc.save(`agent_performance_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400" />;
    return <span className="text-sm font-bold text-slate-400">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Performance de Agentes</h2>
          <p className="text-slate-600">Análise detalhada de desempenho individual e da equipa</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Team Summary */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Agentes Ativos</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{analytics.agents.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Total Vendas</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{analytics.teamTotals.won}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Taxa Média</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{analytics.avgConversionRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Euro className="w-4 h-4" />
              <span className="text-sm font-medium">Valor Total</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">€{(analytics.teamTotals.wonValue / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Total Leads</span>
            </div>
            <p className="text-2xl font-bold text-pink-900">{analytics.teamTotals.leads}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="radar">Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Top Performers (Score Geral)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.rankings.byScore.slice(0, 5).map((agent, idx) => (
                    <div key={agent.email} className={`flex items-center gap-4 p-3 rounded-lg ${idx === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200' : 'bg-slate-50'}`}>
                      <div className="w-8 flex justify-center">
                        {getRankBadge(idx + 1)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-200">{agent.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{agent.name}</p>
                        <p className="text-sm text-slate-500">{agent.won} vendas • €{agent.wonValue.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{agent.overallScore}</p>
                        <p className="text-xs text-slate-500">pontos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Leaders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Líderes por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Best Conversion */}
                {analytics.rankings.byConversion[0] && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Target className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-green-600 font-medium">Melhor Conversão</p>
                      <p className="font-semibold text-slate-900">{analytics.rankings.byConversion[0].name}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">{analytics.rankings.byConversion[0].conversionRate}%</Badge>
                  </div>
                )}

                {/* Top Volume */}
                {analytics.rankings.byVolume[0] && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-600 font-medium">Mais Vendas</p>
                      <p className="font-semibold text-slate-900">{analytics.rankings.byVolume[0].name}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">{analytics.rankings.byVolume[0].won} vendas</Badge>
                  </div>
                )}

                {/* Top Value */}
                {analytics.rankings.byValue[0] && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="p-2 bg-amber-100 rounded-full">
                      <Euro className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-amber-600 font-medium">Maior Valor</p>
                      <p className="font-semibold text-slate-900">{analytics.rankings.byValue[0].name}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">€{(analytics.rankings.byValue[0].wonValue / 1000).toFixed(0)}k</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparação de Agentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.agents} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="won" fill="#10B981" name="Ganhos" />
                  <Bar dataKey="lost" fill="#EF4444" name="Perdidos" />
                  <Bar dataKey="active" fill="#3B82F6" name="Ativos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tabela Detalhada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">Agente</th>
                      <th className="text-right p-3">Leads</th>
                      <th className="text-right p-3">Ganhos</th>
                      <th className="text-right p-3">Perdidos</th>
                      <th className="text-right p-3">Conversão</th>
                      <th className="text-right p-3">Valor</th>
                      <th className="text-right p-3">Ticket Médio</th>
                      <th className="text-right p-3">Ciclo</th>
                      <th className="text-right p-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.agents.map((agent) => (
                      <tr key={agent.email} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-200 text-xs">{agent.avatar}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                        </td>
                        <td className="text-right p-3">{agent.leads}</td>
                        <td className="text-right p-3 text-green-600 font-semibold">{agent.won}</td>
                        <td className="text-right p-3 text-red-600">{agent.lost}</td>
                        <td className="text-right p-3">
                          <Badge className={agent.conversionRate >= 30 ? 'bg-green-100 text-green-800' : agent.conversionRate >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                            {agent.conversionRate}%
                          </Badge>
                        </td>
                        <td className="text-right p-3 font-semibold">€{agent.wonValue.toLocaleString()}</td>
                        <td className="text-right p-3">€{agent.avgDealSize.toLocaleString()}</td>
                        <td className="text-right p-3">{agent.avgCycleTime || '-'} dias</td>
                        <td className="text-right p-3">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={agent.overallScore} className="w-16 h-2" />
                            <span className="font-bold">{agent.overallScore}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perfil de Competências (Top 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={[
                  { skill: 'Conversão', ...Object.fromEntries(analytics.rankings.byScore.slice(0, 5).map(a => [a.name, a.conversionRate])) },
                  { skill: 'Volume', ...Object.fromEntries(analytics.rankings.byScore.slice(0, 5).map(a => [a.name, Math.min(a.won * 10, 100)])) },
                  { skill: 'Valor', ...Object.fromEntries(analytics.rankings.byScore.slice(0, 5).map(a => [a.name, Math.min((a.wonValue / 10000), 100)])) },
                  { skill: 'Atividade', ...Object.fromEntries(analytics.rankings.byScore.slice(0, 5).map(a => [a.name, Math.min(a.communications * 2, 100)])) },
                  { skill: 'Visitas', ...Object.fromEntries(analytics.rankings.byScore.slice(0, 5).map(a => [a.name, Math.min(a.appointments * 5, 100)])) },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  {analytics.rankings.byScore.slice(0, 5).map((agent, idx) => (
                    <Radar 
                      key={agent.email}
                      name={agent.name}
                      dataKey={agent.name}
                      stroke={['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'][idx]}
                      fill={['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'][idx]}
                      fillOpacity={0.1}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}