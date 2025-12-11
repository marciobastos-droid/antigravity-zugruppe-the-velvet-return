import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, FileText, Eye, MessageSquare, Heart, Target, TrendingUp, Building2, MapPin, Euro, Calendar, Users, Star, Phone } from "lucide-react";
import moment from "moment";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PropertyPerformanceReport() {
  const [period, setPeriod] = useState("90");
  const [propertyType, setPropertyType] = useState("all");
  const [listingType, setListingType] = useState("all");
  const [sortBy, setSortBy] = useState("views");

  const { data: properties = [] } = useQuery({
    queryKey: ['properties_performance'],
    queryFn: () => base44.entities.Property.list('-updated_date')
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['property_interactions'],
    queryFn: () => base44.entities.PropertyInteraction.list('-interaction_date', 1000)
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities_props'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments_props'],
    queryFn: () => base44.entities.Appointment.list('-created_date')
  });

  const analytics = useMemo(() => {
    const cutoffDate = moment().subtract(parseInt(period), 'days');
    const filteredInteractions = interactions.filter(i => moment(i.interaction_date).isAfter(cutoffDate));
    const filteredOpps = opportunities.filter(o => moment(o.created_date).isAfter(cutoffDate));
    const filteredAppts = appointments.filter(a => moment(a.created_date).isAfter(cutoffDate));

    const propertyStats = {};

    // Initialize property stats
    properties.forEach(p => {
      if (propertyType !== "all" && p.property_type !== propertyType) return;
      if (listingType !== "all" && p.listing_type !== listingType) return;

      propertyStats[p.id] = {
        id: p.id,
        ref_id: p.ref_id,
        title: p.title,
        property_type: p.property_type,
        listing_type: p.listing_type,
        price: p.price,
        city: p.city,
        status: p.status,
        created_date: p.created_date,
        views: 0,
        uniqueVisitors: new Set(),
        contacts: 0,
        saves: 0,
        shares: 0,
        appointments: 0,
        leads: 0,
        wonLeads: 0,
        totalLeadValue: 0,
        avgTimeOnPage: [],
        engagementScore: 0
      };
    });

    // Process interactions
    filteredInteractions.forEach(i => {
      if (propertyStats[i.property_id]) {
        if (i.action_type === 'viewed') {
          propertyStats[i.property_id].views++;
          if (i.user_email) propertyStats[i.property_id].uniqueVisitors.add(i.user_email);
          if (i.session_duration) propertyStats[i.property_id].avgTimeOnPage.push(i.session_duration);
        }
        if (i.action_type === 'contacted') propertyStats[i.property_id].contacts++;
        if (i.action_type === 'shortlisted') propertyStats[i.property_id].saves++;
        if (i.action_type === 'shared') propertyStats[i.property_id].shares++;
      }
    });

    // Process appointments
    filteredAppts.forEach(a => {
      if (propertyStats[a.property_id]) {
        propertyStats[a.property_id].appointments++;
      }
    });

    // Process opportunities (leads)
    filteredOpps.forEach(o => {
      if (o.property_id && propertyStats[o.property_id]) {
        propertyStats[o.property_id].leads++;
        propertyStats[o.property_id].totalLeadValue += o.estimated_value || 0;
        if (o.status === 'won') {
          propertyStats[o.property_id].wonLeads++;
        }
      }
      
      // Check associated properties
      if (o.associated_properties?.length > 0) {
        o.associated_properties.forEach(ap => {
          if (propertyStats[ap.property_id]) {
            propertyStats[ap.property_id].leads++;
            propertyStats[ap.property_id].totalLeadValue += (o.estimated_value || 0) / o.associated_properties.length;
          }
        });
      }
    });

    // Calculate derived metrics
    const propertyList = Object.values(propertyStats).map(p => {
      const uniqueVisits = p.uniqueVisitors.size;
      const conversionToContact = p.views > 0 ? ((p.contacts / p.views) * 100).toFixed(1) : 0;
      const conversionToLead = p.views > 0 ? ((p.leads / p.views) * 100).toFixed(1) : 0;
      const avgTime = p.avgTimeOnPage.length > 0 
        ? Math.round(p.avgTimeOnPage.reduce((a, b) => a + b, 0) / p.avgTimeOnPage.length)
        : 0;
      
      // Engagement score (0-100)
      const engagementScore = Math.min(
        (p.views * 1) + 
        (uniqueVisits * 2) + 
        (p.contacts * 10) + 
        (p.saves * 5) + 
        (p.shares * 7) + 
        (p.appointments * 15) + 
        (p.leads * 20),
        100
      );

      return {
        ...p,
        uniqueVisits,
        conversionToContact: parseFloat(conversionToContact),
        conversionToLead: parseFloat(conversionToLead),
        avgTimeOnPage: avgTime,
        engagementScore: Math.round(engagementScore),
        daysOnMarket: moment().diff(moment(p.created_date), 'days')
      };
    });

    // Sort by selected metric
    const sortedList = [...propertyList].sort((a, b) => {
      switch (sortBy) {
        case "views": return b.views - a.views;
        case "contacts": return b.contacts - a.contacts;
        case "leads": return b.leads - a.leads;
        case "engagement": return b.engagementScore - a.engagementScore;
        case "conversion": return b.conversionToLead - a.conversionToLead;
        default: return b.views - a.views;
      }
    });

    // Top performers
    const topPerformers = sortedList.slice(0, 10);
    const underperformers = sortedList.filter(p => p.daysOnMarket > 30 && p.views < 10).slice(0, 10);

    // Aggregate stats
    const totals = propertyList.reduce((acc, p) => ({
      views: acc.views + p.views,
      contacts: acc.contacts + p.contacts,
      saves: acc.saves + p.saves,
      leads: acc.leads + p.leads,
      appointments: acc.appointments + p.appointments
    }), { views: 0, contacts: 0, saves: 0, leads: 0, appointments: 0 });

    // Type performance
    const byType = {};
    propertyList.forEach(p => {
      if (!byType[p.property_type]) {
        byType[p.property_type] = { type: p.property_type, count: 0, views: 0, leads: 0, avgPrice: 0, prices: [] };
      }
      byType[p.property_type].count++;
      byType[p.property_type].views += p.views;
      byType[p.property_type].leads += p.leads;
      byType[p.property_type].prices.push(p.price);
    });

    Object.values(byType).forEach(t => {
      t.avgPrice = t.prices.length > 0 ? Math.round(t.prices.reduce((a, b) => a + b, 0) / t.prices.length) : 0;
      t.avgViews = t.count > 0 ? (t.views / t.count).toFixed(1) : 0;
      t.avgLeads = t.count > 0 ? (t.leads / t.count).toFixed(1) : 0;
    });

    const typePerformance = Object.values(byType).sort((a, b) => b.views - a.views);

    // City performance
    const byCity = {};
    propertyList.forEach(p => {
      if (!byCity[p.city]) {
        byCity[p.city] = { city: p.city, count: 0, views: 0, contacts: 0, leads: 0 };
      }
      byCity[p.city].count++;
      byCity[p.city].views += p.views;
      byCity[p.city].contacts += p.contacts;
      byCity[p.city].leads += p.leads;
    });

    const cityPerformance = Object.values(byCity).sort((a, b) => b.views - a.views).slice(0, 10);

    return {
      properties: sortedList,
      topPerformers,
      underperformers,
      totals,
      typePerformance,
      cityPerformance,
      avgConversionRate: propertyList.length > 0 
        ? (propertyList.reduce((s, p) => s + p.conversionToLead, 0) / propertyList.length).toFixed(1)
        : 0
    };
  }, [properties, interactions, opportunities, appointments, period, propertyType, listingType, sortBy]);

  const handleExportCSV = () => {
    const headers = ['Ref', 'Título', 'Tipo', 'Cidade', 'Preço', 'Visualizações', 'Contactos', 'Guardados', 'Leads', 'Visitas', 'Taxa Conversão %', 'Score'];
    const rows = analytics.properties.map(p => [
      p.ref_id || p.id.slice(0, 8),
      p.title,
      p.property_type,
      p.city,
      p.price,
      p.views,
      p.contacts,
      p.saves,
      p.leads,
      p.appointments,
      p.conversionToLead,
      p.engagementScore
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `property_performance_${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const propertyTypeLabels = {
    house: "Moradia",
    apartment: "Apartamento",
    land: "Terreno",
    building: "Prédio",
    commercial: "Comercial",
    office: "Escritório"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Desempenho de Anúncios</h2>
          <p className="text-slate-600">Análise de visualizações, contactos e conversões por imóvel</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="apartment">Apartamento</SelectItem>
              <SelectItem value="house">Moradia</SelectItem>
              <SelectItem value="land">Terreno</SelectItem>
              <SelectItem value="commercial">Comercial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={listingType} onValueChange={setListingType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Negócio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Venda e Arrendamento</SelectItem>
              <SelectItem value="sale">Venda</SelectItem>
              <SelectItem value="rent">Arrendamento</SelectItem>
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
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Total Vistas</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{analytics.totals.views.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Contactos</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{analytics.totals.contacts}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">Guardados</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{analytics.totals.saves}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Leads Gerados</span>
            </div>
            <p className="text-2xl font-bold text-amber-900">{analytics.totals.leads}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Taxa Conversão</span>
            </div>
            <p className="text-2xl font-bold text-pink-900">{analytics.avgConversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="top">
        <TabsList>
          <TabsTrigger value="top">Top Performers</TabsTrigger>
          <TabsTrigger value="underperformers">Baixo Desempenho</TabsTrigger>
          <TabsTrigger value="types">Por Tipo</TabsTrigger>
          <TabsTrigger value="cities">Por Cidade</TabsTrigger>
          <TabsTrigger value="all">Todos Imóveis</TabsTrigger>
        </TabsList>

        <TabsContent value="top" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Top 10 Imóveis</CardTitle>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="views">Por Visualizações</SelectItem>
                    <SelectItem value="contacts">Por Contactos</SelectItem>
                    <SelectItem value="leads">Por Leads</SelectItem>
                    <SelectItem value="engagement">Por Engagement</SelectItem>
                    <SelectItem value="conversion">Por Conversão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPerformers.map((property, idx) => (
                  <div key={property.id} className={`p-4 rounded-lg border ${idx < 3 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <div className="text-center min-w-[32px]">
                        {idx === 0 && <Trophy className="w-6 h-6 text-amber-500" />}
                        {idx === 1 && <Star className="w-6 h-6 text-slate-400" />}
                        {idx === 2 && <Star className="w-6 h-6 text-orange-400" />}
                        {idx > 2 && <span className="text-lg font-bold text-slate-400">#{idx + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {property.ref_id && (
                            <Badge variant="outline" className="text-xs font-mono">{property.ref_id}</Badge>
                          )}
                          <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} target="_blank">
                            <h4 className="font-semibold text-slate-900 hover:text-blue-600 truncate">{property.title}</h4>
                          </Link>
                        </div>
                        <p className="text-sm text-slate-600 flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {property.city} • €{property.price?.toLocaleString()}
                        </p>
                        <div className="grid grid-cols-6 gap-3 mt-3">
                          <div className="text-center p-2 bg-white rounded border">
                            <Eye className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                            <p className="text-xs text-slate-500">Vistas</p>
                            <p className="font-bold text-slate-900">{property.views}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded border">
                            <Users className="w-4 h-4 text-green-600 mx-auto mb-1" />
                            <p className="text-xs text-slate-500">Únicos</p>
                            <p className="font-bold text-slate-900">{property.uniqueVisits}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded border">
                            <Phone className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                            <p className="text-xs text-slate-500">Contactos</p>
                            <p className="font-bold text-slate-900">{property.contacts}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded border">
                            <Heart className="w-4 h-4 text-red-600 mx-auto mb-1" />
                            <p className="text-xs text-slate-500">Guardados</p>
                            <p className="font-bold text-slate-900">{property.saves}</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded border">
                            <Target className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                            <p className="text-xs text-slate-500">Leads</p>
                            <p className="font-bold text-slate-900">{property.leads}</p>
                          </div>
                          <div className="text-center p-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded border border-indigo-200">
                            <TrendingUp className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                            <p className="text-xs text-slate-500">Score</p>
                            <p className="font-bold text-indigo-900">{property.engagementScore}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="underperformers" className="space-y-6">
          <Card className="border-amber-300 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Imóveis com Baixo Desempenho
              </CardTitle>
              <p className="text-sm text-amber-700">Imóveis há mais de 30 dias com menos de 10 visualizações</p>
            </CardHeader>
            <CardContent>
              {analytics.underperformers.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum imóvel com baixo desempenho identificado</p>
              ) : (
                <div className="space-y-2">
                  {analytics.underperformers.map((property) => (
                    <div key={property.id} className="p-3 bg-white rounded-lg border flex items-center justify-between">
                      <div>
                        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} target="_blank">
                          <h5 className="font-medium text-slate-900 hover:text-blue-600">{property.title}</h5>
                        </Link>
                        <p className="text-sm text-slate-600">{property.city} • €{property.price?.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Dias no Mercado</p>
                          <p className="font-bold text-amber-700">{property.daysOnMarket}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Vistas</p>
                          <p className="font-bold text-red-600">{property.views}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance por Tipo de Imóvel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.typePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill="#3B82F6" name="Visualizações" />
                  <Bar dataKey="leads" fill="#10B981" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-right p-3">Quantidade</th>
                      <th className="text-right p-3">Média Vistas</th>
                      <th className="text-right p-3">Média Leads</th>
                      <th className="text-right p-3">Preço Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.typePerformance.map((type) => (
                      <tr key={type.type} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{propertyTypeLabels[type.type] || type.type}</td>
                        <td className="text-right p-3">{type.count}</td>
                        <td className="text-right p-3">{type.avgViews}</td>
                        <td className="text-right p-3">{type.avgLeads}</td>
                        <td className="text-right p-3">€{type.avgPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Cidades</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analytics.cityPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="city" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill="#3B82F6" name="Vistas" />
                  <Bar dataKey="contacts" fill="#10B981" name="Contactos" />
                  <Bar dataKey="leads" fill="#F59E0B" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Todos os Imóveis - Tabela Completa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">Ref</th>
                      <th className="text-left p-3">Título</th>
                      <th className="text-left p-3">Cidade</th>
                      <th className="text-right p-3">Vistas</th>
                      <th className="text-right p-3">Contactos</th>
                      <th className="text-right p-3">Guardados</th>
                      <th className="text-right p-3">Leads</th>
                      <th className="text-right p-3">Conversão</th>
                      <th className="text-right p-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.properties.slice(0, 50).map((property) => (
                      <tr key={property.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {property.ref_id || property.id.slice(0, 6)}
                          </Badge>
                        </td>
                        <td className="p-3 max-w-xs truncate">
                          <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} target="_blank" className="hover:text-blue-600">
                            {property.title}
                          </Link>
                        </td>
                        <td className="p-3">{property.city}</td>
                        <td className="text-right p-3 font-medium">{property.views}</td>
                        <td className="text-right p-3 text-green-600">{property.contacts}</td>
                        <td className="text-right p-3 text-purple-600">{property.saves}</td>
                        <td className="text-right p-3 text-amber-600 font-semibold">{property.leads}</td>
                        <td className="text-right p-3">
                          <Badge className={
                            property.conversionToLead >= 5 ? 'bg-green-100 text-green-800' :
                            property.conversionToLead >= 2 ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }>
                            {property.conversionToLead}%
                          </Badge>
                        </td>
                        <td className="text-right p-3">
                          <Badge className="bg-indigo-100 text-indigo-800">{property.engagementScore}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}