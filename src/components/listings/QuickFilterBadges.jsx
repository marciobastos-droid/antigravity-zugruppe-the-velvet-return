import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Star, Image, FileText, Globe, Home, Building2, Store, Zap, Users, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function QuickFilterBadges({ 
  properties, 
  filters, 
  onFilterChange,
  agents = [],
  developments = []
}) {
  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const counts = {
      // Estados
      active: properties.filter(p => p.status === 'active').length,
      pending: properties.filter(p => p.status === 'pending').length,
      sold: properties.filter(p => p.status === 'sold').length,
      rented: properties.filter(p => p.status === 'rented').length,
      
      // Tipo de negócio
      sale: properties.filter(p => p.listing_type === 'sale').length,
      rent: properties.filter(p => p.listing_type === 'rent').length,
      
      // Tipos de imóvel
      apartment: properties.filter(p => p.property_type === 'apartment').length,
      house: properties.filter(p => p.property_type === 'house').length,
      land: properties.filter(p => p.property_type === 'land').length,
      store: properties.filter(p => p.property_type === 'store').length,
      
      // Outras características
      featured: properties.filter(p => p.featured).length,
      withImages: properties.filter(p => p.images && p.images.length > 0).length,
      withoutImages: properties.filter(p => !p.images || p.images.length === 0).length,
      withCert: properties.filter(p => p.energy_certificate && p.energy_certificate !== 'isento').length,
      withoutCert: properties.filter(p => !p.energy_certificate || p.energy_certificate === 'isento').length,
      
      // Publicação
      publishedPortals: properties.filter(p => p.published_portals && p.published_portals.length > 0).length,
      publishedPages: properties.filter(p => p.published_pages && p.published_pages.length > 0).length,
      notPublished: properties.filter(p => 
        (!p.published_portals || p.published_portals.length === 0) && 
        (!p.published_pages || p.published_pages.length === 0)
      ).length,
      
      // Empreendimentos
      withDevelopment: properties.filter(p => p.development_id).length,
      withoutDevelopment: properties.filter(p => !p.development_id).length,
      
      // Consultores
      withConsultant: properties.filter(p => p.assigned_consultant).length,
      withoutConsultant: properties.filter(p => !p.assigned_consultant).length
    };
    return counts;
  }, [properties]);

  const toggleFilter = (filterKey, value) => {
    const currentValue = filters[filterKey];
    
    // Para filtros booleanos
    if (value === true || value === false) {
      onFilterChange({ ...filters, [filterKey]: currentValue === value ? null : value });
      return;
    }
    
    // Para filtros de select
    if (currentValue === value) {
      onFilterChange({ ...filters, [filterKey]: "all" });
    } else {
      onFilterChange({ ...filters, [filterKey]: value });
    }
  };

  const isActive = (filterKey, value) => {
    const currentValue = filters[filterKey];
    if (value === true || value === false) {
      return currentValue === value;
    }
    return currentValue === value;
  };

  const FilterBadge = ({ filterKey, value, label, count, icon: Icon, color = "slate" }) => {
    const active = isActive(filterKey, value);
    const colorClasses = {
      green: active ? "bg-green-600 text-white border-green-600" : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100",
      yellow: active ? "bg-yellow-600 text-white border-yellow-600" : "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100",
      blue: active ? "bg-blue-600 text-white border-blue-600" : "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100",
      purple: active ? "bg-purple-600 text-white border-purple-600" : "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100",
      red: active ? "bg-red-600 text-white border-red-600" : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100",
      slate: active ? "bg-slate-600 text-white border-slate-600" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100",
      amber: active ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100",
      emerald: active ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100",
      indigo: active ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
    };

    if (count === 0) return null;

    return (
      <Badge
        onClick={() => toggleFilter(filterKey, value)}
        className={`cursor-pointer transition-all border ${colorClasses[color]} flex items-center gap-1.5 px-3 py-1.5`}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className="font-medium">{label}</span>
        <span className={active ? "opacity-90" : "opacity-60"}>({count})</span>
        {active && <X className="w-3 h-3 ml-1" />}
      </Badge>
    );
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Estados */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-green-500 rounded" />
              Estado do Anúncio
            </h3>
            <div className="flex flex-wrap gap-2">
              <FilterBadge filterKey="status" value="active" label="Ativo" count={stats.active} color="green" />
              <FilterBadge filterKey="status" value="pending" label="Pendente" count={stats.pending} color="yellow" />
              <FilterBadge filterKey="status" value="sold" label="Vendido" count={stats.sold} color="blue" />
              <FilterBadge filterKey="status" value="rented" label="Arrendado" count={stats.rented} color="purple" />
            </div>
          </div>

          {/* Tipo de Negócio */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded" />
              Tipo de Negócio
            </h3>
            <div className="flex flex-wrap gap-2">
              <FilterBadge filterKey="listing_type" value="sale" label="Venda" count={stats.sale} color="blue" icon={Home} />
              <FilterBadge filterKey="listing_type" value="rent" label="Arrendamento" count={stats.rent} color="purple" icon={Home} />
            </div>
          </div>

          {/* Tipos de Imóvel */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-500 rounded" />
              Tipo de Imóvel
            </h3>
            <div className="flex flex-wrap gap-2">
              <FilterBadge filterKey="property_type" value="apartment" label="Apartamentos" count={stats.apartment} color="indigo" icon={Building2} />
              <FilterBadge filterKey="property_type" value="house" label="Moradias" count={stats.house} color="emerald" icon={Home} />
              <FilterBadge filterKey="property_type" value="land" label="Terrenos" count={stats.land} color="amber" />
              <FilterBadge filterKey="property_type" value="store" label="Lojas" count={stats.store} color="slate" icon={Store} />
            </div>
          </div>

          {/* Características */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded" />
              Características
            </h3>
            <div className="flex flex-wrap gap-2">
              <FilterBadge filterKey="featured" value={true} label="Destaque" count={stats.featured} color="amber" icon={Star} />
              <FilterBadge filterKey="has_images" value={true} label="Com Imagens" count={stats.withImages} color="blue" icon={Image} />
              <FilterBadge filterKey="has_images" value={false} label="Sem Imagens" count={stats.withoutImages} color="red" icon={Image} />
              <FilterBadge filterKey="has_energy_certificate" value={true} label="Com Cert. Energ." count={stats.withCert} color="green" icon={Zap} />
              <FilterBadge filterKey="has_energy_certificate" value={false} label="Sem Cert. Energ." count={stats.withoutCert} color="slate" icon={Zap} />
            </div>
          </div>

          {/* Publicação */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-500 rounded" />
              Publicação
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge
                onClick={() => {
                  // Criar filtro customizado: imóveis publicados em pelo menos um portal OU página
                  if (filters.published_portals?.length > 0 || filters.published_pages?.length > 0) {
                    onFilterChange({ ...filters, published_portals: [], published_pages: [] });
                  } else {
                    // Trigger: mostrar apenas imóveis com publicação
                    const allPortals = [...new Set(properties.flatMap(p => p.published_portals || []))];
                    const allPages = [...new Set(properties.flatMap(p => p.published_pages || []))];
                    onFilterChange({ ...filters, published_portals: allPortals, published_pages: allPages });
                  }
                }}
                className={`cursor-pointer transition-all border flex items-center gap-1.5 px-3 py-1.5 ${
                  (filters.published_portals?.length > 0 || filters.published_pages?.length > 0)
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="font-medium">Publicados</span>
                <span className="opacity-60">({stats.publishedPortals + stats.publishedPages})</span>
              </Badge>
              <FilterBadge 
                filterKey="visibility" 
                value="public" 
                label="Públicos" 
                count={properties.filter(p => p.visibility === 'public').length} 
                color="green" 
              />
              <FilterBadge 
                filterKey="visibility" 
                value="team_only" 
                label="Apenas Equipa" 
                count={properties.filter(p => p.visibility === 'team_only').length} 
                color="blue" 
              />
            </div>
          </div>

          {/* Organização */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-slate-500 rounded" />
              Organização
            </h3>
            <div className="flex flex-wrap gap-2">
              <FilterBadge 
                filterKey="development_id" 
                value="none" 
                label="Sem Empreendimento" 
                count={stats.withoutDevelopment} 
                color="slate" 
                icon={Layers}
              />
              <FilterBadge 
                filterKey="assigned_consultant" 
                value="unassigned" 
                label="Sem Consultor" 
                count={stats.withoutConsultant} 
                color="slate" 
                icon={Users}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}