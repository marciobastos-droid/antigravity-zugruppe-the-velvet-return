import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Globe, Monitor, TrendingUp, Calendar, MapPin, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";

export default function AnalyticsDashboard() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['siteAnalytics'],
    queryFn: () => base44.entities.SiteAnalytics.list('-data_registro', 1000),
    enabled: !!user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor'),
    refetchInterval: 60000 // Atualiza a cada minuto
  });

  // KPIs
  const totalVisits = analytics.length;
  
  const todayVisits = React.useMemo(() => {
    const today = startOfDay(new Date());
    return analytics.filter(a => {
      const visitDate = new Date(a.data_registro);
      return visitDate >= today;
    }).length;
  }, [analytics]);

  const topCountry = React.useMemo(() => {
    const countryCounts = {};
    analytics.forEach(a => {
      const country = a.pais || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    
    const sorted = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }, [analytics]);

  const topDevice = React.useMemo(() => {
    const deviceCounts = {};
    analytics.forEach(a => {
      const device = a.dispositivo || 'Unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    
    const sorted = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }, [analytics]);

  // Top 5 Países para gráfico de barras
  const top5Countries = React.useMemo(() => {
    const countryCounts = {};
    analytics.forEach(a => {
      const country = a.pais || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    
    return Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pais, visitas]) => ({ pais, visitas }));
  }, [analytics]);

  // Tráfego Semanal - últimos 7 dias
  const weeklyTraffic = React.useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const count = analytics.filter(a => {
        const visitDate = new Date(a.data_registro);
        return visitDate >= dayStart && visitDate < dayEnd;
      }).length;
      
      last7Days.push({
        dia: format(date, 'EEE', { locale: pt }),
        visitas: count
      });
    }
    return last7Days;
  }, [analytics]);

  // Últimas 10 visitas
  const recentVisits = React.useMemo(() => {
    return [...analytics]
      .sort((a, b) => new Date(b.data_registro) - new Date(a.data_registro))
      .slice(0, 10);
  }, [analytics]);

  // Verificar permissões
  if (!user || (user.role !== 'admin' && user.user_type !== 'admin' && user.user_type !== 'gestor')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
            <p className="text-slate-600">Apenas administradores podem aceder a este dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard de Visitas</h1>
          <p className="text-slate-600">Analytics do Website Zuhaus.pt</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total de Visitas</p>
                  <p className="text-3xl font-bold text-slate-900">{totalVisits.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">País Principal</p>
                  <p className="text-3xl font-bold text-slate-900">{topCountry}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Dispositivo Principal</p>
                  <p className="text-3xl font-bold text-slate-900">{topDevice}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  {topDevice === 'Mobile' ? (
                    <Smartphone className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Monitor className="w-6 h-6 text-purple-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Visitas Hoje</p>
                  <p className="text-3xl font-bold text-slate-900">{todayVisits.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Top 5 Países - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Top 5 Países
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top5Countries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="pais" 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="visitas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tráfego Semanal - Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tráfego Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="dia" 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#64748b"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visitas" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Visits Table */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas 10 Visitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Data/Hora</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">País</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cidade</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dispositivo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fonte</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Página</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        Ainda sem visitas registadas
                      </td>
                    </tr>
                  ) : (
                    recentVisits.map((visit, idx) => (
                      <tr key={visit.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {format(new Date(visit.data_registro), 'dd/MM/yyyy HH:mm', { locale: pt })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-medium">
                            {visit.pais}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {visit.cidade || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={
                            visit.dispositivo === 'Mobile' ? 'bg-blue-100 text-blue-800' :
                            visit.dispositivo === 'Desktop' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }>
                            {visit.dispositivo}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {visit.fonte_origem}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate" title={visit.pagina_visitada}>
                          {visit.pagina_visitada}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instruções de Implementação */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">📋 Como Implementar o Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-blue-800 mb-3">
                Copie e cole este código antes do <code className="bg-blue-100 px-2 py-1 rounded">&lt;/body&gt;</code> no seu website <strong>www.zuhaus.pt</strong>:
              </p>
              
              <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
{`<script>
(function() {
  // Detectar dispositivo
  function detectDevice() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablet";
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return "Mobile";
    }
    return "Desktop";
  }

  // Detectar país pelo idioma do navegador
  function detectCountry() {
    const lang = navigator.language || navigator.userLanguage;
    const countryMap = {
      'pt-PT': 'Portugal',
      'pt-BR': 'Brasil',
      'en-US': 'USA',
      'en-GB': 'United Kingdom',
      'es-ES': 'Spain',
      'fr-FR': 'France',
      'de-DE': 'Germany',
      'it-IT': 'Italy'
    };
    return countryMap[lang] || lang.split('-')[1] || 'Unknown';
  }

  // Detectar navegador
  function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Firefox") > -1) return "Firefox";
    if (ua.indexOf("Chrome") > -1) return "Chrome";
    if (ua.indexOf("Safari") > -1) return "Safari";
    if (ua.indexOf("Edge") > -1) return "Edge";
    return "Other";
  }

  // Detectar fonte de origem
  function detectSource() {
    const ref = document.referrer;
    if (!ref) return "Direct";
    if (ref.includes("google")) return "Google";
    if (ref.includes("facebook")) return "Facebook";
    if (ref.includes("instagram")) return "Instagram";
    if (ref.includes("linkedin")) return "LinkedIn";
    return "Referral";
  }

  // Enviar dados para o backend
  function trackVisit() {
    const data = {
      pagina_visitada: window.location.href,
      pais: detectCountry(),
      cidade: "Unknown", // Pode integrar com API de geolocalização
      fonte_origem: detectSource(),
      dispositivo: detectDevice(),
      navegador: detectBrowser(),
      idioma: navigator.language,
      referrer: document.referrer,
      user_agent: navigator.userAgent
    };

    fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://zugruppe.base44.app'}/api/functions/trackSiteVisit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(err => console.error('Analytics error:', err));
  }

  // Executar no carregamento da página
  if (document.readyState === 'complete') {
    trackVisit();
  } else {
    window.addEventListener('load', trackVisit);
  }
})();
</script>`}
                </pre>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">✅ Endpoint da API:</h4>
              <code className="text-sm bg-slate-100 px-3 py-2 rounded block overflow-x-auto">
                {typeof window !== 'undefined' ? window.location.origin : 'https://zugruppe.base44.app'}/api/functions/trackSiteVisit
              </code>
              <p className="text-xs text-blue-700 mt-2">
                Este endpoint aceita POST com JSON e não requer autenticação.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}