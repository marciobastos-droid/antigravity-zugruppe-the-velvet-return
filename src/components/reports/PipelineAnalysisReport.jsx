import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { Download, FileText, Clock, TrendingUp, ArrowRight, Target, Zap, AlertTriangle } from "lucide-react";
import moment from "moment";
import { useAgentNames } from "@/components/common/useAgentNames";

const STAGES = [
  { key: 'new', label: 'Novo', color: '#3B82F6' },
  { key: 'contacted', label: 'Contactado', color: '#8B5CF6' },
  { key: 'qualified', label: 'Qualificado', color: '#F59E0B' },
  { key: 'proposal', label: 'Proposta', color: '#EC4899' },
  { key: 'negotiation', label: 'Negociação', color: '#10B981' },
  { key: 'won', label: 'Ganho', color: '#059669' },
  { key: 'lost', label: 'Perdido', color: '#EF4444' }
];

export default function PipelineAnalysisReport() {
  const [period, setPeriod] = useState("90");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const { getAgentName } = useAgentNames();

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities_pipeline'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users_report'],
    queryFn: () => base44.entities.User.list()
  });

  const analytics = useMemo(() => {
    const cutoffDate = moment().subtract(parseInt(period), 'days');
    let filtered = opportunities.filter(o => moment(o.created_date).isAfter(cutoffDate));
    
    if (selectedAgent !== 'all') {
      filtered = filtered.filter(o => o.assigned_to === selectedAgent);
    }

    // Stage counts
    const stageCounts = {};
    STAGES.forEach(s => { stageCounts[s.key] = 0; });
    filtered.forEach(o => {
      if (stageCounts[o.status] !== undefined) stageCounts[o.status]++;
    });

    // Funnel data
    const funnelData = STAGES.filter(s => s.key !== 'lost').map(s => ({
      name: s.label,
      value: stageCounts[s.key],
      fill: s.color
    }));

    // Conversion rates between stages
    const conversionRates = [];
    for (let i = 0; i < STAGES.length - 2; i++) {
      const from = STAGES[i];
      const to = STAGES[i + 1];
      const fromCount = stageCounts[from.key];
      const toCount = stageCounts[to.key];
      conversionRates.push({
        from: from.label,
        to: to.label,
        rate: fromCount > 0 ? ((toCount / fromCount) * 100).toFixed(1) : 0,
        fromCount,
        toCount
      });
    }

    // Time in stage analysis
    const timeInStage = {};
    STAGES.forEach(s => { timeInStage[s.key] = []; });
    
    filtered.forEach(opp => {
      if (opp.status && opp.created_date && opp.updated_date) {
        const days = moment(opp.updated_date).diff(moment(opp.created_date), 'days');
        if (timeInStage[opp.status]) {
          timeInStage[opp.status].push(days);
        }
      }
    });

    const avgTimeInStage = STAGES.map(s => ({
      stage: s.label,
      avgDays: timeInStage[s.key].length > 0 
        ? Math.round(timeInStage[s.key].reduce((a, b) => a + b, 0) / timeInStage[s.key].length)
        : 0,
      color: s.color
    }));

    // Velocity metrics
    const wonOpps = filtered.filter(o => o.status === 'won' && o.actual_close_date);
    const avgCycleTime = wonOpps.length > 0
      ? Math.round(wonOpps.reduce((acc, o) => {
          return acc + moment(o.actual_close_date).diff(moment(o.created_date), 'days');
        }, 0) / wonOpps.length)
      : 0;

    // Weekly trend
    const weeklyData = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = moment().subtract(i, 'weeks').startOf('week');
      const weekEnd = moment().subtract(i, 'weeks').endOf('week');
      const weekOpps = opportunities.filter(o => 
        moment(o.created_date).isBetween(weekStart, weekEnd)
      );
      weeklyData.push({
        week: weekStart.format('DD/MM'),
        new: weekOpps.filter(o => o.status === 'new').length,
        won: weekOpps.filter(o => o.status === 'won').length,
        lost: weekOpps.filter(o => o.status === 'lost').length,
        total: weekOpps.length
      });
    }

    // Bottleneck detection
    const bottlenecks = avgTimeInStage
      .filter(s => s.avgDays > 7 && s.stage !== 'Ganho' && s.stage !== 'Perdido')
      .sort((a, b) => b.avgDays - a.avgDays);

    return {
      stageCounts,
      funnelData,
      conversionRates,
      avgTimeInStage,
      avgCycleTime,
      weeklyData,
      bottlenecks,
      totalActive: filtered.filter(o => !['won', 'lost'].includes(o.status)).length,
      totalWon: stageCounts.won,
      totalLost: stageCounts.lost,
      winRate: (stageCounts.won + stageCounts.lost) > 0 
        ? ((stageCounts.won / (stageCounts.won + stageCounts.lost)) * 100).toFixed(1)
        : 0
    };
  }, [opportunities, period, selectedAgent]);

  const handleExportCSV = () => {
    const headers = ['Estágio', 'Quantidade', 'Tempo Médio (dias)'];
    const rows = analytics.avgTimeInStage.map(s => [s.stage, analytics.stageCounts[STAGES.find(st => st.label === s.stage)?.key] || 0, s.avgDays]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_analysis_${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Análise de Pipeline de Vendas', 20, 20);
    doc.setFontSize(10);
    doc.text(`Período: Últimos ${period} dias | Gerado: ${moment().format('DD/MM/YYYY HH:mm')}`, 20, 30);
    
    let y = 45;
    doc.setFontSize(12);
    doc.text('Métricas Chave:', 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Pipeline Ativo: ${analytics.totalActive} | Ganhos: ${analytics.totalWon} | Perdidos: ${analytics.totalLost}`, 20, y);
    y += 7;
    doc.text(`Taxa de Vitória: ${analytics.winRate}% | Ciclo Médio: ${analytics.avgCycleTime} dias`, 20, y);
    
    y += 15;
    doc.setFontSize(12);
    doc.text('Tempo Médio por Estágio:', 20, y);
    y += 10;
    analytics.avgTimeInStage.forEach(s => {
      doc.setFontSize(10);
      doc.text(`${s.stage}: ${s.avgDays} dias`, 25, y);
      y += 7;
    });
    
    if (analytics.bottlenecks.length > 0) {
      y += 10;
      doc.setFontSize(12);
      doc.text('Bottlenecks Identificados:', 20, y);
      y += 10;
      analytics.bottlenecks.forEach(b => {
        doc.setFontSize(10);
        doc.text(`⚠️ ${b.stage}: ${b.avgDays} dias (acima do recomendado)`, 25, y);
        y += 7;
      });
    }
    
    doc.save(`pipeline_analysis_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Análise de Pipeline</h2>
          <p className="text-slate-600">Conversões, velocidade e bottlenecks do funil de vendas</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os agentes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Agentes</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.email}>{u.display_name || u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Pipeline Ativo</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{analytics.totalActive}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Ganhos</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{analytics.totalWon}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Perdidos</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{analytics.totalLost}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Taxa Vitória</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{analytics.winRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Ciclo Médio</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">{analytics.avgCycleTime} dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck Alert */}
      {analytics.bottlenecks.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Bottlenecks Identificados</h4>
                <p className="text-sm text-amber-700 mt-1">
                  {analytics.bottlenecks.map(b => `${b.stage} (${b.avgDays} dias)`).join(', ')} - 
                  Considere otimizar estes estágios para acelerar o pipeline.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="conversion">Taxas de Conversão</TabsTrigger>
          <TabsTrigger value="velocity">Velocidade</TabsTrigger>
          <TabsTrigger value="trend">Tendência</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funil de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade">
                      {analytics.funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Estágio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {STAGES.map(stage => {
                    const count = analytics.stageCounts[stage.key];
                    const total = Object.values(analytics.stageCounts).reduce((a, b) => a + b, 0);
                    const percent = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="w-24 text-sm font-medium">{stage.label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all" 
                            style={{ width: `${percent}%`, backgroundColor: stage.color }}
                          />
                        </div>
                        <span className="w-16 text-right text-sm font-semibold">{count} ({percent}%)</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Taxas de Conversão entre Estágios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 flex-wrap py-8">
                {analytics.conversionRates.map((cr, idx) => (
                  <React.Fragment key={idx}>
                    <div className="text-center p-4 bg-slate-50 rounded-lg min-w-24">
                      <p className="text-sm text-slate-600">{cr.from}</p>
                      <p className="text-2xl font-bold text-slate-900">{cr.fromCount}</p>
                    </div>
                    <div className="flex flex-col items-center px-2">
                      <ArrowRight className="w-6 h-6 text-slate-400" />
                      <Badge className={parseFloat(cr.rate) >= 50 ? 'bg-green-100 text-green-800' : parseFloat(cr.rate) >= 25 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                        {cr.rate}%
                      </Badge>
                    </div>
                  </React.Fragment>
                ))}
                <div className="text-center p-4 bg-green-50 rounded-lg min-w-24 border-2 border-green-200">
                  <p className="text-sm text-green-600">Ganho</p>
                  <p className="text-2xl font-bold text-green-900">{analytics.stageCounts.won}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tempo Médio por Estágio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.avgTimeInStage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis unit=" dias" />
                  <Tooltip formatter={(v) => `${v} dias`} />
                  <Bar dataKey="avgDays" name="Dias">
                    {analytics.avgTimeInStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tendência Semanal (12 semanas)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={analytics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="total" stackId="1" stroke="#3B82F6" fill="#93C5FD" name="Novos" />
                  <Area type="monotone" dataKey="won" stackId="2" stroke="#10B981" fill="#6EE7B7" name="Ganhos" />
                  <Area type="monotone" dataKey="lost" stackId="3" stroke="#EF4444" fill="#FCA5A5" name="Perdidos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}