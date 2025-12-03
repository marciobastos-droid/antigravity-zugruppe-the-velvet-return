import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Star, MapPin, Globe, TrendingUp, Home, Layers } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Detectar portal a partir da source_url
function detectPortal(sourceUrl) {
  if (!sourceUrl) return null;
  const url = sourceUrl.toLowerCase();
  
  if (url.includes('idealista')) return 'Idealista';
  if (url.includes('imovirtual')) return 'Imovirtual';
  if (url.includes('casa.sapo')) return 'Casa Sapo';
  if (url.includes('remax')) return 'RE/MAX';
  if (url.includes('era.pt')) return 'ERA';
  if (url.includes('century21')) return 'Century 21';
  if (url.includes('kwportugal') || url.includes('kw.com')) return 'KW';
  if (url.includes('sothebys')) return 'Sothebys';
  if (url.includes('christies')) return 'Christies';
  if (url.includes('engelvoelkers')) return 'Engel & Völkers';
  if (url.includes('luximos')) return 'Luximos';
  if (url.includes('jll')) return 'JLL';
  if (url.includes('supercasa')) return 'SuperCasa';
  if (url.includes('custojusto')) return 'CustoJusto';
  if (url.includes('olx')) return 'OLX';
  if (url.includes('bfranca') || url.includes('bancoimobiliario')) return 'Banca';
  
  return 'Outro';
}

export default function PropertiesOverviewWidget({ properties = [], className = "" }) {
  // Métricas principais
  const totalProperties = properties.length;
  const featuredProperties = properties.filter(p => p.featured).length;
  const activeProperties = properties.filter(p => p.status === 'active').length;
  const importedProperties = properties.filter(p => p.source_url || p.external_id).length;
  const manualProperties = totalProperties - importedProperties;

  // Imóveis por cidade (top 8)
  const cityCounts = {};
  properties.forEach(p => {
    if (p.city) {
      cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
    }
  });
  const cityData = Object.entries(cityCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Imóveis por portal (importações)
  const portalCounts = {};
  properties.forEach(p => {
    const portal = detectPortal(p.source_url);
    if (portal) {
      portalCounts[portal] = (portalCounts[portal] || 0) + 1;
    }
  });
  const portalData = Object.entries(portalCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Imóveis por tipo
  const typeLabels = {
    apartment: 'Apartamento',
    house: 'Moradia',
    land: 'Terreno',
    building: 'Prédio',
    commercial: 'Comercial',
    warehouse: 'Armazém',
    office: 'Escritório',
    store: 'Loja',
    farm: 'Quinta'
  };
  
  const typeCounts = {};
  properties.forEach(p => {
    const type = typeLabels[p.property_type] || p.property_type || 'Outro';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const typeData = Object.entries(typeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Recentes (últimos 7 dias)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentImports = properties.filter(p => 
    (p.source_url || p.external_id) && 
    new Date(p.created_date) >= sevenDaysAgo
  ).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Imóveis</p>
                <p className="text-2xl font-bold">{totalProperties}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Em Destaque</p>
                <p className="text-2xl font-bold">{featuredProperties}</p>
              </div>
              <Star className="w-8 h-8 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Ativos</p>
                <p className="text-2xl font-bold">{activeProperties}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Importados (7d)</p>
                <p className="text-2xl font-bold">{recentImports}</p>
              </div>
              <Globe className="w-8 h-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Imóveis por Cidade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              Imóveis por Cidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748b" 
                    style={{ fontSize: '11px' }} 
                    width={90}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Imóveis" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                Sem dados de cidades
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imóveis por Tipo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="w-4 h-4 text-slate-500" />
              Imóveis por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                Sem dados de tipos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Importações por Portal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            Importações por Portal/Rede
            <Badge variant="secondary" className="ml-2 text-xs">
              {importedProperties} importados / {manualProperties} manuais
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {portalData.length > 0 ? (
            <div className="space-y-3">
              {portalData.map((portal, idx) => {
                const percentage = (portal.value / importedProperties * 100).toFixed(1);
                return (
                  <div key={portal.name} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-slate-700 truncate">
                      {portal.name}
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      />
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-sm font-semibold">{portal.value}</span>
                      <span className="text-xs text-slate-400 ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma importação registada</p>
              <p className="text-xs mt-1">Importe imóveis através das Ferramentas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Cidades com badges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            Top Localizações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {cityData.slice(0, 12).map((city, idx) => (
              <Badge 
                key={city.name} 
                variant="outline"
                className="px-3 py-1.5 text-sm"
                style={{ 
                  borderColor: COLORS[idx % COLORS.length],
                  color: COLORS[idx % COLORS.length]
                }}
              >
                {city.name}
                <span className="ml-1.5 font-bold">{city.value}</span>
              </Badge>
            ))}
            {cityData.length === 0 && (
              <p className="text-sm text-slate-400">Sem dados de localização</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}