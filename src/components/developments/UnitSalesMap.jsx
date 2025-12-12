import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, CheckCircle2, Clock, Ban, TrendingUp, Eye,
  Building2, DollarSign, Calendar, BarChart3
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UnitSalesMap({ properties, development }) {
  // Agrupar unidades por andar se houver essa informação
  const groupedByFloor = React.useMemo(() => {
    const groups = new Map();
    
    properties.forEach(prop => {
      const floor = prop.unit_number?.match(/(\d+)º/)?.[1] || 
                    prop.internal_notes?.match(/Andar:\s*(\d+)/)?.[1] ||
                    'Sem andar';
      
      if (!groups.has(floor)) {
        groups.set(floor, []);
      }
      groups.get(floor).push(prop);
    });
    
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === 'Sem andar') return 1;
        if (b === 'Sem andar') return -1;
        return Number(b) - Number(a);
      });
  }, [properties]);

  // Estatísticas gerais
  const stats = React.useMemo(() => {
    const total = properties.length;
    const sold = properties.filter(p => p.status === 'sold').length;
    const rented = properties.filter(p => p.status === 'rented').length;
    const reserved = properties.filter(p => p.availability_status === 'reserved').length;
    const active = properties.filter(p => p.status === 'active').length;
    const pending = properties.filter(p => p.status === 'pending').length;
    
    const soldValue = properties.filter(p => p.status === 'sold').reduce((sum, p) => sum + (p.price || 0), 0);
    const rentedValue = properties.filter(p => p.status === 'rented').reduce((sum, p) => sum + (p.price || 0), 0);
    const availableValue = properties.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.price || 0), 0);
    const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
    
    const salesProgress = total > 0 ? Math.round(((sold + rented) / total) * 100) : 0;
    const revenueProgress = totalValue > 0 ? Math.round(((soldValue + rentedValue) / totalValue) * 100) : 0;
    
    return {
      total, sold, rented, reserved, active, pending,
      soldValue, rentedValue, availableValue, totalValue,
      salesProgress, revenueProgress
    };
  }, [properties]);

  const getUnitStatusIcon = (property) => {
    if (property.status === 'sold') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (property.status === 'rented') return <Home className="w-4 h-4 text-purple-600" />;
    if (property.availability_status === 'reserved') return <Clock className="w-4 h-4 text-amber-600" />;
    if (property.status === 'active') return <Home className="w-4 h-4 text-blue-600" />;
    return <Ban className="w-4 h-4 text-slate-400" />;
  };

  const getUnitStatusColor = (property) => {
    if (property.status === 'sold') return 'bg-green-100 border-green-300 text-green-800';
    if (property.status === 'rented') return 'bg-purple-100 border-purple-300 text-purple-800';
    if (property.availability_status === 'reserved') return 'bg-amber-100 border-amber-300 text-amber-800';
    if (property.status === 'active') return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-slate-100 border-slate-300 text-slate-600';
  };

  const getUnitStatusLabel = (property) => {
    if (property.status === 'sold') return 'Vendido';
    if (property.status === 'rented') return 'Arrendado';
    if (property.availability_status === 'reserved') return 'Reservado';
    if (property.status === 'active') return 'Disponível';
    if (property.status === 'pending') return 'Pendente';
    return 'Desativado';
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 mb-1">Vendidos</p>
                <p className="text-2xl font-bold text-green-900">{stats.sold}</p>
                <p className="text-xs text-green-600">€{stats.soldValue.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 mb-1">Arrendados</p>
                <p className="text-2xl font-bold text-purple-900">{stats.rented}</p>
                <p className="text-xs text-purple-600">€{stats.rentedValue.toLocaleString()}/mês</p>
              </div>
              <Home className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 mb-1">Disponíveis</p>
                <p className="text-2xl font-bold text-blue-900">{stats.active}</p>
                <p className="text-xs text-blue-600">€{stats.availableValue.toLocaleString()}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 mb-1">Reservados</p>
                <p className="text-2xl font-bold text-amber-900">{stats.reserved}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Evolução de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Unidades Comercializadas</span>
              <span className="text-sm font-bold text-green-600">{stats.salesProgress}%</span>
            </div>
            <Progress value={stats.salesProgress} className="h-3" />
            <p className="text-xs text-slate-500 mt-1">
              {stats.sold + stats.rented} de {stats.total} unidades vendidas ou arrendadas
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Valor Comercializado</span>
              <span className="text-sm font-bold text-green-600">{stats.revenueProgress}%</span>
            </div>
            <Progress value={stats.revenueProgress} className="h-3" />
            <p className="text-xs text-slate-500 mt-1">
              €{(stats.soldValue + stats.rentedValue).toLocaleString()} de €{stats.totalValue.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Units Map by Floor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-600" />
            Mapa de Unidades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedByFloor.map(([floor, units]) => (
            <div key={floor} className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-sm">
                  {floor === 'Sem andar' ? 'Todas as Unidades' : `${floor}º Andar`}
                </Badge>
                <span className="text-xs text-slate-500">
                  {units.length} unidade{units.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {units.map(unit => (
                  <div
                    key={unit.id}
                    className={`relative p-3 rounded-lg border-2 transition-all hover:shadow-md ${getUnitStatusColor(unit)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          {getUnitStatusIcon(unit)}
                          <span className="font-mono text-xs font-bold">
                            {unit.unit_number || unit.ref_id || `#${properties.indexOf(unit) + 1}`}
                          </span>
                        </div>
                        <p className="text-xs font-medium line-clamp-1">
                          {unit.bedrooms > 0 ? `T${unit.bedrooms}` : unit.property_type}
                        </p>
                      </div>
                      <Link to={`${createPageUrl("PropertyDetails")}?id=${unit.id}`} target="_blank">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-white/50"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>

                    <div className="space-y-1">
                      {unit.useful_area > 0 && (
                        <p className="text-xs text-slate-600">{unit.useful_area}m²</p>
                      )}
                      <p className="text-xs font-semibold">
                        €{unit.price?.toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-2">
                      <Badge className="text-[10px] px-1.5 py-0.5 w-full justify-center">
                        {getUnitStatusLabel(unit)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {properties.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Building2 className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p>Nenhuma unidade vinculada ainda</p>
              <p className="text-xs mt-1">Vincule imóveis no separador "Imóveis"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Legenda</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-100 border-2 border-green-300 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
              </div>
              <span>Vendido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-100 border-2 border-purple-300 flex items-center justify-center">
                <Home className="w-3 h-3 text-purple-600" />
              </div>
              <span>Arrendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                <Clock className="w-3 h-3 text-amber-600" />
              </div>
              <span>Reservado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
                <Home className="w-3 h-3 text-blue-600" />
              </div>
              <span>Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-100 border-2 border-slate-300 flex items-center justify-center">
                <Ban className="w-3 h-3 text-slate-600" />
              </div>
              <span>Pendente/Desativado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}