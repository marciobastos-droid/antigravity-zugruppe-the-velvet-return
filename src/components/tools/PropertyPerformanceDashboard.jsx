import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { 
  Eye, MessageSquare, Clock, TrendingUp, TrendingDown, Home, 
  Calendar, Euro, Users, Target, Award, AlertCircle, ArrowUp, ArrowDown,
  Building2, MapPin, Bed, Bath, SquareIcon, Filter, Download, RefreshCw
} from "lucide-react";
import { format, differenceInDays, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { pt } from "date-fns/locale";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function PropertyPerformanceDashboard() {
  const [periodFilter, setPeriodFilter] = useState("30");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Fetch properties
  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 500)
  });

  // Fetch inquiries (contacts generated)
  const { data: inquiries = [] } = useQuery({
    queryKey: ['inquiries'],
    queryFn: () => base44.entities.Inquiry.list('-created_date', 1000)
  });

  // Fetch opportunities linked to properties
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date', 1000)
  });

  // Fetch property interactions (views, saves, etc.)
  const { data: interactions = [] } = useQuery({
    queryKey: ['propertyInteractions'],
    queryFn: async () => {
      try {
        return await base44.entities.PropertyInteraction.list('-created_date', 5000);
      } catch {
        return [];
      }
    }
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const periodDays = parseInt(periodFilter);
    const periodStart = subDays(now, periodDays);

    // Filter properties
    let filteredProperties = properties.filter(p => {
      if (propertyTypeFilter !== "all" && p.property_type !== propertyTypeFilter) return false;
      if (statusFilter !== "all" && p.availability_status !== statusFilter) return false;
      return true;
    });

    // Calculate per-property metrics
    const propertyMetrics = filteredProperties.map(property => {
      const propertyInquiries = inquiries.filter(i => i.property_id === property.id);
      const propertyOpportunities = opportunities.filter(o => 
        o.property_id === property.id || 
        o.associated_properties?.some(ap => ap.property_id === property.id)
      );
      const propertyViews = interactions.filter(i => 
        i.property_id === property.id && 
        i.interaction_type === 'view' &&
        new Date(i.created_date) >= periodStart
      );
      const propertySaves = interactions.filter(i => 
        i.property_id === property.id && 
        i.interaction_type === 'save'
      );

      const daysOnMarket = differenceInDays(now, new Date(property.created_date));
      const recentInquiries = propertyInquiries.filter(i => new Date(i.created_date) >= periodStart);
      
      return {
        ...property,
        totalViews: propertyViews.length,
        totalInquiries: propertyInquiries.length,
        recentInquiries: recentInquiries.length,
        totalOpportunities: propertyOpportunities.length,
        totalSaves: propertySaves.length,
        daysOnMarket,
        conversionRate: propertyViews.length > 0 
          ? ((propertyInquiries.length / propertyViews.length) * 100).toFixed(1) 
          : 0,
        pricePerSqm: property.square_feet > 0 
          ? Math.round(property.price / property.square_feet) 
          : 0
      };
    });

    // Sort by performance score
    const sortedByPerformance = [...propertyMetrics].sort((a, b) => {
      const scoreA = (a.totalViews * 1) + (a.totalInquiries * 10) + (a.totalOpportunities * 20);
      const scoreB = (b.totalViews * 1) + (b.totalInquiries * 10) + (b.totalOpportunities * 20);
      return scoreB - scoreA;
    });

    // Aggregate stats
    const totalViews = propertyMetrics.reduce((sum, p) => sum + p.totalViews, 0);
    const totalInquiries = propertyMetrics.reduce((sum, p) => sum + p.totalInquiries, 0);
    const totalOpportunities = propertyMetrics.reduce((sum, p) => sum + p.totalOpportunities, 0);
    const avgDaysOnMarket = propertyMetrics.length > 0 
      ? Math.round(propertyMetrics.reduce((sum, p) => sum + p.daysOnMarket, 0) / propertyMetrics.length)
      : 0;

    // Properties needing attention (long time on market, no inquiries)
    const needsAttention = propertyMetrics.filter(p => 
      p.daysOnMarket > 60 && p.totalInquiries === 0 && 
      p.availability_status === 'available'
    );

    // Top performers
    const topPerformers = sortedByPerformance.slice(0, 5);

    // By type distribution
    const byType = {};
    propertyMetrics.forEach(p => {
      const type = p.property_type || 'other';
      if (!byType[type]) byType[type] = { count: 0, views: 0, inquiries: 0, value: 0 };
      byType[type].count++;
      byType[type].views += p.totalViews;
      byType[type].inquiries += p.totalInquiries;
      byType[type].value += p.price || 0;
    });

    // By location distribution
    const byLocation = {};
    propertyMetrics.forEach(p => {
      const city = p.city || 'Outro';
      if (!byLocation[city]) byLocation[city] = { count: 0, views: 0, inquiries: 0, avgPrice: 0, prices: [] };
      byLocation[city].count++;
      byLocation[city].views += p.totalViews;
      byLocation[city].inquiries += p.totalInquiries;
      if (p.price) byLocation[city].prices.push(p.price);
    });
    Object.keys(byLocation).forEach(city => {
      const prices = byLocation[city].prices;
      byLocation[city].avgPrice = prices.length > 0 
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) 
        : 0;
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthProperties = properties.filter(p => {
        const created = new Date(p.created_date);
        return created >= monthStart && created <= monthEnd;
      });
      
      const monthInquiries = inquiries.filter(inq => {
        const created = new Date(inq.created_date);
        return created >= monthStart && created <= monthEnd;
      });

      const monthViews = interactions.filter(i => {
        const created = new Date(i.created_date);
        return i.interaction_type === 'view' && created >= monthStart && created <= monthEnd;
      });

      monthlyTrend.push({
        month: format(monthStart, 'MMM', { locale: pt }),
        monthFull: format(monthStart, 'MMMM yyyy', { locale: pt }),
        newProperties: monthProperties.length,
        inquiries: monthInquiries.length,
        views: monthViews.length
      });
    }

    // Price range distribution
    const priceRanges = [
      { range: '< 100k', min: 0, max: 100000 },
      { range: '100k-200k', min: 100000, max: 200000 },
      { range: '200k-300k', min: 200000, max: 300000 },
      { range: '300k-500k', min: 300000, max: 500000 },
      { range: '500k-1M', min: 500000, max: 1000000 },
      { range: '> 1M', min: 1000000, max: Infinity }
    ];
    
    const byPriceRange = priceRanges.map(({ range, min, max }) => {
      const inRange = propertyMetrics.filter(p => p.price >= min && p.price < max);
      return {
        range,
        count: inRange.length,
        avgDays: inRange.length > 0 
          ? Math.round(inRange.reduce((sum, p) => sum + p.daysOnMarket, 0) / inRange.length)
          : 0,
        inquiries: inRange.reduce((sum, p) => sum + p.totalInquiries, 0)
      };
    });

    return {
      propertyMetrics,
      sortedByPerformance,
      totalProperties: filteredProperties.length,
      totalViews,
      totalInquiries,
      totalOpportunities,
      avgDaysOnMarket,
      needsAttention,
      topPerformers,
      byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
      byLocation: Object.entries(byLocation)
        .map(([city, data]) => ({ city, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      monthlyTrend,
      byPriceRange,
      avgConversionRate: totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : 0
    };
  }, [properties, inquiries, opportunities, interactions, periodFilter, propertyTypeFilter, statusFilter]);

  const propertyTypeLabels = {
    apartment: 'Apartamento',
    house: 'Moradia',
    land: 'Terreno',
    building: 'Prédio',
    store: 'Loja',
    office: 'Escritório',
    warehouse: 'Armazém',
    other: 'Outro'
  };

  if (loadingProperties) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Performance de Imoveis</h2>
          <p className="text-slate-600">Analise detalhada do desempenho dos seus imoveis</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimos 7 dias</SelectItem>
              <SelectItem value="30">Ultimos 30 dias</SelectItem>
              <SelectItem value="90">Ultimos 90 dias</SelectItem>
              <SelectItem value="365">Ultimo ano</SelectItem>
            </SelectContent>
          </Select>
          <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="apartment">Apartamento</SelectItem>
              <SelectItem value="house">Moradia</SelectItem>
              <SelectItem value="land">Terreno</SelectItem>
              <SelectItem value="store">Loja</SelectItem>
              <SelectItem value="office">Escritorio</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponivel</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
              <SelectItem value="reserved">Reservado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Imoveis</p>
                <p className="text-2xl font-bold text-blue-900">{metrics.totalProperties}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Visualizacoes</p>
                <p className="text-2xl font-bold text-green-900">{metrics.totalViews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Contactos</p>
                <p className="text-2xl font-bold text-purple-900">{metrics.totalInquiries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Media Dias</p>
                <p className="text-2xl font-bold text-amber-900">{metrics.avgDaysOnMarket}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-600 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-rose-600 font-medium">Conversao</p>
                <p className="text-2xl font-bold text-rose-900">{metrics.avgConversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {metrics.needsAttention.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800">Imoveis que precisam de atencao</h4>
                <p className="text-sm text-amber-700 mb-2">
                  {metrics.needsAttention.length} imoveis ha mais de 60 dias no mercado sem contactos
                </p>
                <div className="flex flex-wrap gap-2">
                  {metrics.needsAttention.slice(0, 5).map(p => (
                    <Badge key={p.id} variant="outline" className="border-amber-400 text-amber-700">
                      {p.title?.substring(0, 30)}... ({p.daysOnMarket} dias)
                    </Badge>
                  ))}
                  {metrics.needsAttention.length > 5 && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700">
                      +{metrics.needsAttention.length - 5} mais
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="properties">Por Imovel</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="locations">Por Localizacao</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolucao Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={metrics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="newProperties" name="Novos Imoveis" stroke="#3b82f6" fill="#3b82f680" />
                    <Area type="monotone" dataKey="inquiries" name="Contactos" stroke="#10b981" fill="#10b98180" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuicao por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={metrics.byType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, count }) => `${propertyTypeLabels[type] || type}: ${count}`}
                    >
                      {metrics.byType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, propertyTypeLabels[name] || name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Price Range Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance por Faixa de Preco</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metrics.byPriceRange}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" name="Imoveis" fill="#3b82f6" />
                    <Bar yAxisId="right" dataKey="avgDays" name="Media Dias" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Top 5 Imoveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topPerformers.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.title}</p>
                        <p className="text-xs text-slate-500">{p.city}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 text-green-600">
                            <Eye className="w-3 h-3" />{p.totalViews}
                          </span>
                          <span className="flex items-center gap-1 text-purple-600">
                            <MessageSquare className="w-3 h-3" />{p.totalInquiries}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes por Imovel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Imovel</th>
                      <th className="text-center p-2">Tipo</th>
                      <th className="text-right p-2">Preco</th>
                      <th className="text-center p-2">Views</th>
                      <th className="text-center p-2">Contactos</th>
                      <th className="text-center p-2">Dias</th>
                      <th className="text-center p-2">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.sortedByPerformance.slice(0, 20).map(p => (
                      <tr key={p.id} className="border-b hover:bg-slate-50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                <Home className="w-5 h-5 text-slate-300" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{p.title}</p>
                              <p className="text-xs text-slate-500">{p.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="outline" className="text-xs">
                            {propertyTypeLabels[p.property_type] || p.property_type}
                          </Badge>
                        </td>
                        <td className="text-right p-2 font-medium">
                          {p.price ? `€${p.price.toLocaleString()}` : '-'}
                        </td>
                        <td className="text-center p-2">
                          <span className="flex items-center justify-center gap-1 text-green-600">
                            <Eye className="w-3 h-3" />{p.totalViews}
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className="flex items-center justify-center gap-1 text-purple-600">
                            <MessageSquare className="w-3 h-3" />{p.totalInquiries}
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`${p.daysOnMarket > 60 ? 'text-amber-600 font-medium' : ''}`}>
                            {p.daysOnMarket}
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <Badge className={parseFloat(p.conversionRate) > 5 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                            {p.conversionRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contactos vs Visualizacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" name="Visualizacoes" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="inquiries" name="Contactos" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novos Imoveis por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newProperties" name="Novos Imoveis" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Localizacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.byLocation} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="city" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Imoveis" fill="#3b82f6" />
                    <Bar dataKey="inquiries" name="Contactos" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preco Medio por Localizacao</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.byLocation.map((loc, idx) => (
                    <div key={loc.city} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{loc.city}</p>
                          <p className="text-xs text-slate-500">{loc.count} imoveis</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">€{loc.avgPrice.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">preco medio</p>
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