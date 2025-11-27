import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, TrendingUp, TrendingDown, Target, Euro, Users, Percent, Calendar, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import moment from "moment";

const SOURCE_CONFIG = {
  facebook_ads: { label: "Facebook Ads", color: "#1877F2" },
  google_ads: { label: "Google Ads", color: "#4285F4" },
  instagram: { label: "Instagram", color: "#E4405F" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  website: { label: "Website", color: "#10B981" },
  referral: { label: "Referência", color: "#8B5CF6" },
  direct_contact: { label: "Contacto Direto", color: "#F59E0B" },
  real_estate_portal: { label: "Portal Imobiliário", color: "#EC4899" },
  networking: { label: "Networking", color: "#06B6D4" },
  email_marketing: { label: "Email Marketing", color: "#84CC16" },
  other: { label: "Outro", color: "#6B7280" }
};

export default function LeadSourceROIReport({ onExport }) {
  const [period, setPeriod] = useState("90");
  const [costInputs, setCostInputs] = useState({});

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities_report'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: sourceMetrics = [] } = useQuery({
    queryKey: ['lead_source_metrics'],
    queryFn: () => base44.entities.LeadSourceMetrics.list('-created_date')
  });

  const analytics = useMemo(() => {
    const cutoffDate = moment().subtract(parseInt(period), 'days');
    const filtered = opportunities.filter(o => moment(o.created_date).isAfter(cutoffDate));

    const bySource = {};
    
    filtered.forEach(opp => {
      const source = opp.lead_source || 'other';
      if (!bySource[source]) {
        bySource[source] = {
          source,
          label: SOURCE_CONFIG[source]?.label || source,
          color: SOURCE_CONFIG[source]?.color || '#6B7280',
          total: 0,
          qualified: 0,
          hot: 0,
          warm: 0,
          cold: 0,
          won: 0,
          lost: 0,
          totalValue: 0,
          wonValue: 0,
          avgScore: 0,
          scores: [],
          conversionTimes: [],
          cost: costInputs[source] || 0
        };
      }
      
      bySource[source].total++;
      
      if (opp.qualification_status) {
        bySource[source].qualified++;
        if (opp.qualification_status === 'hot') bySource[source].hot++;
        if (opp.qualification_status === 'warm') bySource[source].warm++;
        if (opp.qualification_status === 'cold') bySource[source].cold++;
      }
      
      if (opp.status === 'won') {
        bySource[source].won++;
        bySource[source].wonValue += opp.estimated_value || 0;
      }
      if (opp.status === 'lost') bySource[source].lost++;
      
      bySource[source].totalValue += opp.estimated_value || 0;
      
      if (opp.qualification_score) {
        bySource[source].scores.push(opp.qualification_score);
      }
      
      if (opp.status === 'won' && opp.actual_close_date && opp.created_date) {
        const days = moment(opp.actual_close_date).diff(moment(opp.created_date), 'days');
        bySource[source].conversionTimes.push(days);
      }
    });

    // Calculate derived metrics
    Object.values(bySource).forEach(s => {
      s.conversionRate = s.total > 0 ? ((s.won / s.total) * 100).toFixed(1) : 0;
      s.qualificationRate = s.total > 0 ? ((s.qualified / s.total) * 100).toFixed(1) : 0;
      s.avgScore = s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0;
      s.avgConversionDays = s.conversionTimes.length > 0 
        ? Math.round(s.conversionTimes.reduce((a, b) => a + b, 0) / s.conversionTimes.length) 
        : null;
      s.costPerLead = s.cost > 0 && s.total > 0 ? (s.cost / s.total).toFixed(2) : 0;
      s.costPerConversion = s.cost > 0 && s.won > 0 ? (s.cost / s.won).toFixed(2) : 0;
      s.roi = s.cost > 0 ? (((s.wonValue - s.cost) / s.cost) * 100).toFixed(1) : null;
    });

    return Object.values(bySource).sort((a, b) => b.total - a.total);
  }, [opportunities, period, costInputs]);

  const totals = useMemo(() => {
    return analytics.reduce((acc, s) => ({
      total: acc.total + s.total,
      won: acc.won + s.won,
      lost: acc.lost + s.lost,
      wonValue: acc.wonValue + s.wonValue,
      cost: acc.cost + (s.cost || 0)
    }), { total: 0, won: 0, lost: 0, wonValue: 0, cost: 0 });
  }, [analytics]);

  const handleExportCSV = () => {
    const headers = ['Origem', 'Total Leads', 'Qualificados', 'Hot', 'Warm', 'Cold', 'Ganhos', 'Perdidos', 'Taxa Conversão %', 'Valor Ganho €', 'Custo €', 'CPL €', 'CPA €', 'ROI %'];
    const rows = analytics.map(s => [
      s.label, s.total, s.qualified, s.hot, s.warm, s.cold, s.won, s.lost, s.conversionRate, s.wonValue, s.cost, s.costPerLead, s.costPerConversion, s.roi || 'N/A'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead_source_roi_${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de ROI por Origem de Leads', 20, 20);
    doc.setFontSize(10);
    doc.text(`Período: Últimos ${period} dias | Gerado: ${moment().format('DD/MM/YYYY HH:mm')}`, 20, 30);
    
    let y = 45;
    doc.setFontSize(12);
    doc.text('Resumo:', 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Total Leads: ${totals.total} | Conversões: ${totals.won} | Taxa: ${totals.total > 0 ? ((totals.won/totals.total)*100).toFixed(1) : 0}%`, 20, y);
    y += 7;
    doc.text(`Valor Total Ganho: €${totals.wonValue.toLocaleString()} | Custo Total: €${totals.cost.toLocaleString()}`, 20, y);
    
    y += 15;
    doc.setFontSize(12);
    doc.text('Detalhes por Origem:', 20, y);
    y += 10;
    
    analytics.forEach(s => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text(`${s.label}: ${s.total} leads, ${s.won} conversões (${s.conversionRate}%), €${s.wonValue.toLocaleString()}`, 25, y);
      y += 7;
    });
    
    doc.save(`lead_source_roi_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ROI por Origem de Leads</h2>
          <p className="text-slate-600">Análise de performance e retorno por canal de aquisição</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Total Leads</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{totals.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Conversões</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{totals.won}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Percent className="w-4 h-4" />
              <span className="text-sm font-medium">Taxa Conversão</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {totals.total > 0 ? ((totals.won / totals.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Euro className="w-4 h-4" />
              <span className="text-sm font-medium">Valor Ganho</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">€{(totals.wonValue / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">ROI Global</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">
              {totals.cost > 0 ? (((totals.wonValue - totals.cost) / totals.cost) * 100).toFixed(0) : '∞'}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="conversion">Conversões</TabsTrigger>
          <TabsTrigger value="roi">ROI & Custos</TabsTrigger>
          <TabsTrigger value="quality">Qualidade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Leads por Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3B82F6" name="Total" />
                    <Bar dataKey="won" fill="#10B981" name="Ganhos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Valor</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.filter(s => s.wonValue > 0)}
                      dataKey="wonValue"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `€${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Taxa de Conversão por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="label" width={120} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="conversionRate" fill="#10B981" name="Taxa Conversão" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configurar Custos por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
                  <div key={key}>
                    <Label className="text-xs">{config.label}</Label>
                    <Input
                      type="number"
                      placeholder="€ Custo"
                      value={costInputs[key] || ''}
                      onChange={(e) => setCostInputs({ ...costInputs, [key]: parseFloat(e.target.value) || 0 })}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de ROI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">Origem</th>
                      <th className="text-right p-3">Leads</th>
                      <th className="text-right p-3">Conversões</th>
                      <th className="text-right p-3">Custo</th>
                      <th className="text-right p-3">CPL</th>
                      <th className="text-right p-3">CPA</th>
                      <th className="text-right p-3">Valor Ganho</th>
                      <th className="text-right p-3">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((s) => (
                      <tr key={s.source} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </td>
                        <td className="text-right p-3">{s.total}</td>
                        <td className="text-right p-3">{s.won}</td>
                        <td className="text-right p-3">€{s.cost.toLocaleString()}</td>
                        <td className="text-right p-3">€{s.costPerLead}</td>
                        <td className="text-right p-3">€{s.costPerConversion}</td>
                        <td className="text-right p-3 font-semibold">€{s.wonValue.toLocaleString()}</td>
                        <td className="text-right p-3">
                          {s.roi !== null ? (
                            <Badge className={parseFloat(s.roi) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {parseFloat(s.roi) > 0 ? <ArrowUpRight className="w-3 h-3 inline mr-1" /> : <ArrowDownRight className="w-3 h-3 inline mr-1" />}
                              {s.roi}%
                            </Badge>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Qualidade de Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hot" stackId="a" fill="#EF4444" name="Hot" />
                  <Bar dataKey="warm" stackId="a" fill="#F59E0B" name="Warm" />
                  <Bar dataKey="cold" stackId="a" fill="#3B82F6" name="Cold" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}