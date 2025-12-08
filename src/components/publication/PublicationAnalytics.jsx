import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Eye, MousePointerClick, Mail, Users, DollarSign, Award, Globe, ExternalLink } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function PublicationAnalytics({ propertyId }) {
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['publicationMetrics', propertyId],
    queryFn: async () => {
      const all = await base44.entities.PublicationMetrics.list('-created_date');
      return propertyId ? all.filter(m => m.property_id === propertyId) : all;
    }
  });

  // Aggregate data
  const aggregated = React.useMemo(() => {
    const totals = {
      views: 0,
      clicks: 0,
      inquiries: 0,
      leads: 0,
      cost: 0
    };

    const byPortal = {};
    const byType = { portal: 0, webpage: 0 };

    metrics.forEach(m => {
      totals.views += m.views || 0;
      totals.clicks += m.clicks || 0;
      totals.inquiries += m.inquiries || 0;
      totals.leads += m.leads_generated || 0;
      totals.cost += m.cost || 0;

      if (!byPortal[m.portal_or_page]) {
        byPortal[m.portal_or_page] = {
          name: m.portal_or_page,
          views: 0,
          clicks: 0,
          inquiries: 0,
          leads: 0,
          cost: 0,
          type: m.type
        };
      }

      byPortal[m.portal_or_page].views += m.views || 0;
      byPortal[m.portal_or_page].clicks += m.clicks || 0;
      byPortal[m.portal_or_page].inquiries += m.inquiries || 0;
      byPortal[m.portal_or_page].leads += m.leads_generated || 0;
      byPortal[m.portal_or_page].cost += m.cost || 0;

      byType[m.type] += 1;
    });

    const conversionRate = totals.views > 0 ? ((totals.inquiries / totals.views) * 100).toFixed(2) : 0;
    const avgCostPerLead = totals.leads > 0 ? (totals.cost / totals.leads).toFixed(2) : 0;
    const ctr = totals.views > 0 ? ((totals.clicks / totals.views) * 100).toFixed(2) : 0;

    return {
      totals: { ...totals, conversionRate, avgCostPerLead, ctr },
      byPortal: Object.values(byPortal),
      byType: [
        { name: 'Portais', value: byType.portal },
        { name: 'Website', value: byType.webpage }
      ]
    };
  }, [metrics]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Sem Dados de Performance</h3>
          <p className="text-slate-600">As métricas aparecerão aqui quando houver publicações ativas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-blue-600" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{aggregated.totals.views.toLocaleString()}</div>
            <p className="text-xs text-slate-600">Visualizações</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <MousePointerClick className="w-8 h-8 text-purple-600" />
              <Badge variant="outline">{aggregated.totals.ctr}%</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{aggregated.totals.clicks.toLocaleString()}</div>
            <p className="text-xs text-slate-600">Cliques (CTR)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Mail className="w-8 h-8 text-green-600" />
              <Badge variant="outline">{aggregated.totals.conversionRate}%</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{aggregated.totals.inquiries.toLocaleString()}</div>
            <p className="text-xs text-slate-600">Pedidos de Info</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-orange-600" />
              <DollarSign className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{aggregated.totals.leads.toLocaleString()}</div>
            <p className="text-xs text-slate-600">Leads (€{aggregated.totals.avgCostPerLead}/lead)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="portals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="portals">Por Portal/Página</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
        </TabsList>

        <TabsContent value="portals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance por Portal/Página</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregated.byPortal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill="#3b82f6" name="Visualizações" />
                  <Bar dataKey="clicks" fill="#8b5cf6" name="Cliques" />
                  <Bar dataKey="inquiries" fill="#10b981" name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads Gerados vs Custo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={aggregated.byPortal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="leads" stroke="#10b981" name="Leads" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#ef4444" name="Custo (€)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Publicações</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={aggregated.byType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {aggregated.byType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aggregated.byPortal
                    .sort((a, b) => b.leads - a.leads)
                    .slice(0, 5)
                    .map((portal, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Award className={`w-5 h-5 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-orange-600'}`} />
                          <div>
                            <p className="font-medium text-sm text-slate-900">{portal.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              {portal.type === 'portal' ? (
                                <Globe className="w-3 h-3" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                              <span>{portal.leads} leads</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-700">{portal.views} views</p>
                          <p className="text-xs text-slate-500">{portal.inquiries} pedidos</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}