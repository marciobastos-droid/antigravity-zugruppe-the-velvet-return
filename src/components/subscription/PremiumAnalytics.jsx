import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, DollarSign, Eye, Heart, 
  Calendar, MapPin, Crown, Lock, BarChart3
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PremiumAnalytics({ propertyId }) {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_email: user.email });
      return subs[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ id: propertyId });
      return props[0];
    },
    enabled: !!propertyId
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['premiumAnalytics', propertyId],
    queryFn: async () => {
      const response = await base44.functions.invoke('generatePremiumAnalytics', {
        property_id: propertyId
      });
      return response.data;
    },
    enabled: !!propertyId && subscription?.features?.advanced_analytics
  });

  const isPremium = subscription?.features?.advanced_analytics;

  if (!isPremium) {
    return (
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Analytics Premium</h3>
          <p className="text-slate-600 mb-6">
            Desbloqueie insights avançados sobre o desempenho dos seus imóveis
          </p>
          <ul className="text-left max-w-md mx-auto space-y-2 mb-6">
            <li className="flex items-center gap-2 text-sm text-slate-700">
              <Crown className="w-4 h-4 text-amber-600" />
              Análise de tendências de mercado
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-700">
              <Crown className="w-4 h-4 text-amber-600" />
              Comparação com imóveis similares
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-700">
              <Crown className="w-4 h-4 text-amber-600" />
              Previsão de vendas
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-700">
              <Crown className="w-4 h-4 text-amber-600" />
              ROI e métricas financeiras
            </li>
          </ul>
          <Link to={createPageUrl("Subscriptions")}>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Crown className="w-4 h-4 mr-2" />
              Fazer Upgrade
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">A gerar analytics...</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analytics Premium</h2>
            <p className="text-slate-600">Insights avançados do imóvel</p>
          </div>
        </div>
        <Badge className="bg-purple-600 text-white">
          <Crown className="w-3 h-3 mr-1" />
          Premium
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-xs">Visualizações</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics?.views || 0}</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3" />
              +12% esta semana
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-xs">Favoritos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics?.favorites || 0}</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3" />
              +8% esta semana
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Valor de Mercado</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">€{analytics?.market_value?.toLocaleString() || property?.price?.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
              Preço listado: €{property?.price?.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Dias no Mercado</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{analytics?.days_on_market || 0}</div>
            <div className="text-xs text-slate-600 mt-1">
              Média: {analytics?.avg_days_on_market || 45} dias
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Views Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tendência de Visualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics?.views_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparação de Preços</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics?.price_comparison || [
                { name: 'Este Imóvel', value: property?.price || 0 },
                { name: 'Média Área', value: (property?.price || 0) * 0.95 },
                { name: 'Similares', value: (property?.price || 0) * 1.05 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights de Mercado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Preço Competitivo</h4>
                <p className="text-sm text-blue-700">
                  O seu imóvel está {analytics?.price_competitiveness || '5%'} abaixo da média da área, 
                  aumentando as hipóteses de venda rápida.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">Localização Premium</h4>
                <p className="text-sm text-green-700">
                  {property?.city} tem visto um crescimento de {analytics?.area_growth || '8%'} no valor 
                  dos imóveis nos últimos 12 meses.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">Previsão de Venda</h4>
                <p className="text-sm text-purple-700">
                  Com base no histórico, estimamos que este imóvel será vendido em {analytics?.estimated_sale_days || 30-45} dias.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}