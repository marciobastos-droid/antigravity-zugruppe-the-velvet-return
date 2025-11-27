import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Target, TrendingUp, Clock, CheckCircle2, 
  Users, Building2, Percent, Timer, Award, BarChart3
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";

export default function MatchingDashboard() {
  const { data: matchAlerts = [] } = useQuery({
    queryKey: ['matchAlerts'],
    queryFn: () => base44.entities.MatchAlert.list('-created_date')
  });

  const { data: propertyInterests = [] } = useQuery({
    queryKey: ['allPropertyInterests'],
    queryFn: () => base44.entities.ClientPropertyInterest.list('-created_date')
  });

  const { data: matchFeedback = [] } = useQuery({
    queryKey: ['matchFeedback'],
    queryFn: () => base44.entities.MatchFeedback.list('-created_date')
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  // Calculate metrics
  const totalMatches = matchAlerts.length;
  const viewedMatches = matchAlerts.filter(m => m.status === 'viewed' || m.status === 'contacted').length;
  const contactedMatches = matchAlerts.filter(m => m.status === 'contacted').length;
  const conversionRate = totalMatches > 0 ? ((contactedMatches / totalMatches) * 100).toFixed(1) : 0;

  // Average score
  const avgScore = totalMatches > 0 
    ? (matchAlerts.reduce((acc, m) => acc + (m.match_score || 0), 0) / totalMatches).toFixed(0)
    : 0;

  // Time to contact (average days from match to contact)
  const contactedWithDates = matchAlerts.filter(m => m.status === 'contacted' && m.notification_sent_at);
  const avgTimeToContact = contactedWithDates.length > 0
    ? (contactedWithDates.reduce((acc, m) => {
        const created = new Date(m.created_date);
        const contacted = new Date(m.notification_sent_at);
        return acc + differenceInDays(contacted, created);
      }, 0) / contactedWithDates.length).toFixed(1)
    : 0;

  // Clients with requirements
  const clientsWithReq = contacts.filter(c => 
    c.property_requirements && 
    (c.property_requirements.locations?.length || c.property_requirements.budget_max)
  ).length;

  // Matches by status for pie chart
  const statusData = [
    { name: 'Pendentes', value: matchAlerts.filter(m => m.status === 'pending').length, color: '#f59e0b' },
    { name: 'Notificados', value: matchAlerts.filter(m => m.status === 'notified').length, color: '#3b82f6' },
    { name: 'Visualizados', value: matchAlerts.filter(m => m.status === 'viewed').length, color: '#8b5cf6' },
    { name: 'Contactados', value: matchAlerts.filter(m => m.status === 'contacted').length, color: '#10b981' },
    { name: 'Rejeitados', value: matchAlerts.filter(m => m.status === 'dismissed').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Matches over time (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const matches = matchAlerts.filter(m => 
      format(new Date(m.created_date), 'yyyy-MM-dd') === dateStr
    ).length;
    return {
      date: format(date, 'dd/MM'),
      matches
    };
  });

  // Score distribution
  const scoreRanges = [
    { range: '0-40', min: 0, max: 40 },
    { range: '41-60', min: 41, max: 60 },
    { range: '61-80', min: 61, max: 80 },
    { range: '81-100', min: 81, max: 100 },
  ];
  const scoreDistribution = scoreRanges.map(r => ({
    range: r.range,
    count: matchAlerts.filter(m => m.match_score >= r.min && m.match_score <= r.max).length
  }));

  // Feedback analysis
  const feedbackStats = {
    excellent: matchFeedback.filter(f => f.feedback_type === 'excellent').length,
    good: matchFeedback.filter(f => f.feedback_type === 'good').length,
    bad: matchFeedback.filter(f => f.feedback_type === 'bad').length,
  };

  // Top performing locations
  const locationCounts = {};
  matchAlerts.filter(m => m.status === 'contacted').forEach(m => {
    const details = m.match_details || {};
    if (details.location) {
      locationCounts[details.location] = (locationCounts[details.location] || 0) + 1;
    }
  });
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs">Total Matches</p>
                <p className="text-2xl font-bold">{totalMatches}</p>
              </div>
              <Target className="w-8 h-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Taxa Conversão</p>
                <p className="text-2xl font-bold">{conversionRate}%</p>
              </div>
              <Percent className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Score Médio</p>
                <p className="text-2xl font-bold">{avgScore}%</p>
              </div>
              <Award className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-xs">Tempo Médio</p>
                <p className="text-2xl font-bold">{avgTimeToContact}d</p>
              </div>
              <Timer className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Contactados</p>
                <p className="text-2xl font-bold">{contactedMatches}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-600 to-slate-800 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-xs">Com Requisitos</p>
                <p className="text-2xl font-bold">{clientsWithReq}</p>
              </div>
              <Users className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Matches Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Matches nos Últimos 30 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30Days}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="matches" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Estado dos Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <p>Sem dados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Distribuição de Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-600" />
              Feedback de Matching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-900">Excelente</span>
                </div>
                <span className="text-lg font-bold text-green-700">{feedbackStats.excellent}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-blue-900">Bom</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{feedbackStats.good}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-900">Fraco</span>
                </div>
                <span className="text-lg font-bold text-red-700">{feedbackStats.bad}</span>
              </div>
              
              {matchFeedback.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  Nenhum feedback registado ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matchAlerts.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Nenhum match registado</p>
          ) : (
            <div className="space-y-2">
              {matchAlerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.status === 'contacted' ? 'bg-green-500' :
                      alert.status === 'viewed' ? 'bg-purple-500' :
                      alert.status === 'notified' ? 'bg-blue-500' :
                      alert.status === 'dismissed' ? 'bg-red-500' :
                      'bg-amber-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm text-slate-900">{alert.contact_name}</p>
                      <p className="text-xs text-slate-500">{alert.property_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${
                      alert.match_score >= 80 ? 'bg-green-100 text-green-700' :
                      alert.match_score >= 60 ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {alert.match_score}%
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {format(new Date(alert.created_date), 'dd/MM HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}