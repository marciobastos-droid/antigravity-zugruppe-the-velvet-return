import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Star, Image, Globe, Home, Building2, ChevronDown, ChevronUp, Download, Store, Crown, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function QuickFilterBadges({ 
  properties, 
  filters, 
  onFilterChange,
  consultants = [],
  developments = []
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [filterGroups, setFilterGroups] = React.useState([
    { id: 'estado', title: 'ESTADO', items: ['active', 'pending'] },
    { id: 'negocio', title: 'NEGÓCIO', items: ['sale', 'rent'] },
    { id: 'tipo', title: 'TIPO DE IMÓVEL', items: ['apartment', 'house', 'store'] },
    { id: 'publicado', title: 'PUBLICADO EM', items: ['zuhaus', 'zuhandel', 'luxury', 'international', 'withImages'] },
    { id: 'outros', title: 'OUTROS', items: ['featured', 'lastImport'] }
  ]);
  
  // Calcular data/hora da última importação
  const lastImportTimestamp = React.useMemo(() => {
    const importedProperties = properties.filter(p => p.source_url && p.created_date);
    if (importedProperties.length === 0) return null;
    
    const sortedByDate = [...importedProperties].sort((a, b) => {
      const dateA = new Date(a.created_date);
      const dateB = new Date(b.created_date);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
      return dateB - dateA;
    });
    
    if (sortedByDate.length === 0 || !sortedByDate[0].created_date) return null;
    
    const latestDate = new Date(sortedByDate[0].created_date);
    if (isNaN(latestDate.getTime())) return null;
    
    return new Date(latestDate.getTime() - 5 * 60 * 1000);
  }, [properties]);
  
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
      
      // Páginas específicas
      zuhaus: properties.filter(p => p.published_pages?.includes('zuhaus')).length,
      zuhandel: properties.filter(p => p.published_pages?.includes('zuhandel')).length,
      luxury: properties.filter(p => p.published_pages?.includes('luxury_collection')).length,
      
      // Internacionais
      international: properties.filter(p => p.country && p.country !== 'Portugal').length,
      
      // Empreendimentos
      withDevelopment: properties.filter(p => p.development_id).length,
      withoutDevelopment: properties.filter(p => !p.development_id).length,
      
      // Consultores
      withConsultant: properties.filter(p => p.assigned_consultant && p.assigned_consultant !== "").length,
      withoutConsultant: properties.filter(p => !p.assigned_consultant || p.assigned_consultant === "").length,
      
      // Última importação
      lastImport: lastImportTimestamp ? properties.filter(p => {
        if (!p.source_url) return false;
        const createdDate = new Date(p.created_date);
        return createdDate >= lastImportTimestamp;
      }).length : 0
    };
    return counts;
  }, [properties, lastImportTimestamp]);

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

  const togglePublishedPage = (page) => {
    const current = filters.published_pages || [];
    const newPages = current.includes(page) 
      ? current.filter(p => p !== page)
      : [...current, page];
    onFilterChange({ ...filters, published_pages: newPages });
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
        className={`cursor-pointer transition-all border ${colorClasses[color]} flex items-center gap-1 px-2.5 py-1 text-xs`}
      >
        {Icon && <Icon className="w-3 h-3" />}
        <span className="font-medium">{label}</span>
        <span className={active ? "opacity-90" : "opacity-60"}>({count})</span>
        {active && <X className="w-2.5 h-2.5 ml-0.5" />}
      </Badge>
    );
  };

  return (
    <div className="mb-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        {/* LINHA 1: Estados */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Estado</p>
          <div className="flex flex-wrap gap-2">
            <FilterBadge filterKey="status" value="active" label="Ativo" count={stats.active} color="green" />
            <FilterBadge filterKey="status" value="pending" label="Pendente" count={stats.pending} color="yellow" />
            <FilterBadge filterKey="status" value="sold" label="Vendido" count={stats.sold} color="blue" />
            <FilterBadge filterKey="status" value="rented" label="Arrendado" count={stats.rented} color="purple" />
          </div>
        </div>

        {/* LINHA 2: Tipo de Negócio */}
        <div className="mb-3 pb-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Negócio</p>
          <div className="flex flex-wrap gap-2">
            <FilterBadge filterKey="listing_type" value="sale" label="Venda" count={stats.sale} color="blue" />
            <FilterBadge filterKey="listing_type" value="rent" label="Arrendamento" count={stats.rent} color="purple" />
          </div>
        </div>

        {/* LINHA 3: Tipo de Imóvel */}
        <div className="mb-3 pb-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Tipo de Imóvel</p>
          <div className="flex flex-wrap gap-2">
            <FilterBadge filterKey="property_type" value="apartment" label="Apartamentos" count={stats.apartment} color="indigo" icon={Building2} />
            <FilterBadge filterKey="property_type" value="house" label="Moradias" count={stats.house} color="emerald" icon={Home} />
            <FilterBadge filterKey="property_type" value="land" label="Terrenos" count={stats.land} color="amber" />
            <FilterBadge filterKey="property_type" value="store" label="Lojas" count={stats.store} color="slate" icon={Store} />
          </div>
        </div>

        {/* LINHA 4: Páginas Publicadas */}
        <div className="mb-3 pb-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Publicado em</p>
          <div className="flex flex-wrap gap-2">
            <Badge
              onClick={() => togglePublishedPage('zuhaus')}
              className={`cursor-pointer transition-all border flex items-center gap-1.5 px-2.5 py-1 text-xs ${
                filters.published_pages?.includes('zuhaus')
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
              }`}
            >
              <Home className="w-3 h-3" />
              <span className="font-medium">ZuHaus</span>
              <span className="opacity-60">({stats.zuhaus})</span>
              {filters.published_pages?.includes('zuhaus') && <X className="w-2.5 h-2.5 ml-0.5" />}
            </Badge>
            
            <Badge
              onClick={() => togglePublishedPage('zuhandel')}
              className={`cursor-pointer transition-all border flex items-center gap-1.5 px-2.5 py-1 text-xs ${
                filters.published_pages?.includes('zuhandel')
                  ? "bg-slate-600 text-white border-slate-600"
                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Store className="w-3 h-3" />
              <span className="font-medium">ZuHandel</span>
              <span className="opacity-60">({stats.zuhandel})</span>
              {filters.published_pages?.includes('zuhandel') && <X className="w-2.5 h-2.5 ml-0.5" />}
            </Badge>
            
            <Badge
              onClick={() => togglePublishedPage('luxury_collection')}
              className={`cursor-pointer transition-all border flex items-center gap-1.5 px-2.5 py-1 text-xs ${
                filters.published_pages?.includes('luxury_collection')
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
              }`}
            >
              <Crown className="w-3 h-3" />
              <span className="font-medium">Premium Luxo</span>
              <span className="opacity-60">({stats.luxury})</span>
              {filters.published_pages?.includes('luxury_collection') && <X className="w-2.5 h-2.5 ml-0.5" />}
            </Badge>

            <Badge
              onClick={() => toggleFilter('country', 'international')}
              className={`cursor-pointer transition-all border flex items-center gap-1.5 px-2.5 py-1 text-xs ${
                filters.country === 'international'
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
              }`}
            >
              <Globe className="w-3 h-3" />
              <span className="font-medium">Internacionais</span>
              <span className="opacity-60">({stats.international})</span>
              {filters.country === 'international' && <X className="w-2.5 h-2.5 ml-0.5" />}
            </Badge>

            <FilterBadge filterKey="has_images" value={true} label="Com Imagens" count={stats.withImages} color="blue" icon={Image} />
          </div>
        </div>

        {/* LINHA 5: Outros Filtros */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Outros</p>
          <div className="flex flex-wrap gap-2">
            <FilterBadge filterKey="featured" value={true} label="Destaque" count={stats.featured} color="amber" icon={Star} />
            <FilterBadge filterKey="last_import" value={true} label="Última Importação" count={stats.lastImport} color="indigo" icon={Download} />
            <FilterBadge 
              filterKey="development_id" 
              value="none" 
              label="Sem Empreendimento" 
              count={stats.withoutDevelopment} 
              color="slate"
            />
            <FilterBadge 
              filterKey="assigned_consultant" 
              value="unassigned" 
              label="Sem Consultor" 
              count={stats.withoutConsultant} 
              color="slate"
            />
          </div>
        </div>
      </div>
    </div>
  );
}