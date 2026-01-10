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
  
  // Carregar filterGroups do localStorage ou usar valores padrão
  const [filterGroups, setFilterGroups] = React.useState(() => {
    try {
      const saved = localStorage.getItem('quickFilterGroups');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Erro ao carregar filterGroups do localStorage:', e);
    }
    
    // Extrair tipos de imóvel únicos das propriedades + tipos conhecidos
    const knownPropertyTypes = ['apartment', 'house', 'land', 'store', 'condo', 'townhouse', 'building', 'warehouse', 'office', 'farm', 'commercial', 'hotel'];
    const propertyTypesInData = Array.from(new Set(properties.map(p => p.property_type).filter(Boolean)));
    const propertyTypes = [...new Set([...knownPropertyTypes, ...propertyTypesInData])].sort();
    
    return [
      { id: 'estado', title: 'ESTADO', items: ['active', 'pending'] },
      { id: 'negocio', title: 'NEGÓCIO', items: ['sale', 'rent'] },
      { id: 'tipo', title: 'TIPO DE IMÓVEL', items: propertyTypes },
      { id: 'publicado', title: 'PUBLICADO EM', items: ['zuhaus', 'zuhandel', 'luxury_collection', 'international'] },
      { id: 'outros', title: 'OUTROS', items: ['featured', 'lastImport', 'withImages'] }
    ];
  });
  
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
      
      // Tipos de imóvel (dinâmicos)
      apartment: properties.filter(p => p.property_type === 'apartment').length,
      house: properties.filter(p => p.property_type === 'house').length,
      land: properties.filter(p => p.property_type === 'land').length,
      store: properties.filter(p => p.property_type === 'store').length,
      condo: properties.filter(p => p.property_type === 'condo').length,
      townhouse: properties.filter(p => p.property_type === 'townhouse').length,
      building: properties.filter(p => p.property_type === 'building').length,
      warehouse: properties.filter(p => p.property_type === 'warehouse').length,
      office: properties.filter(p => p.property_type === 'office').length,
      farm: properties.filter(p => p.property_type === 'farm').length,
      commercial: properties.filter(p => p.property_type === 'commercial').length,
      hotel: properties.filter(p => p.property_type === 'hotel').length,
      
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
      website: properties.filter(p => p.published_pages?.includes('website')).length,
      
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
    // Para filtros de array (published_pages)
    if (Array.isArray(filters[filterKey])) {
      const current = filters[filterKey] || [];
      const newValue = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      onFilterChange({ ...filters, [filterKey]: newValue });
      return;
    }
    
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
    
    // Para filtros de array (published_pages)
    if (Array.isArray(currentValue)) {
      return currentValue.includes(value);
    }
    
    if (value === true || value === false) {
      return currentValue === value;
    }
    return currentValue === value;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    let newGroups = [...filterGroups];
    
    // Se moveu dentro do mesmo grupo, reordenar items
    if (source.droppableId === destination.droppableId) {
      const groupIndex = filterGroups.findIndex(g => g.id === source.droppableId);
      const items = Array.from(newGroups[groupIndex].items);
      const [removed] = items.splice(source.index, 1);
      items.splice(destination.index, 0, removed);
      newGroups[groupIndex] = { ...newGroups[groupIndex], items };
    } else {
      // Mover entre grupos
      const sourceGroupIndex = filterGroups.findIndex(g => g.id === source.droppableId);
      const destGroupIndex = filterGroups.findIndex(g => g.id === destination.droppableId);
      
      const sourceItems = Array.from(newGroups[sourceGroupIndex].items);
      const [removed] = sourceItems.splice(source.index, 1);
      newGroups[sourceGroupIndex] = { ...newGroups[sourceGroupIndex], items: sourceItems };
      
      const destItems = Array.from(newGroups[destGroupIndex].items);
      destItems.splice(destination.index, 0, removed);
      newGroups[destGroupIndex] = { ...newGroups[destGroupIndex], items: destItems };
    }
    
    setFilterGroups(newGroups);
    
    // Guardar no localStorage
    try {
      localStorage.setItem('quickFilterGroups', JSON.stringify(newGroups));
    } catch (e) {
      console.error('Erro ao guardar filterGroups no localStorage:', e);
    }
  };

  const renderBadge = (itemId, isDragging = false) => {
    const propertyTypeLabels = {
      apartment: "Apartamentos",
      house: "Moradias",
      land: "Terrenos",
      store: "Lojas",
      condo: "Condomínios",
      townhouse: "Casas Geminadas",
      building: "Prédios",
      warehouse: "Armazéns",
      office: "Escritórios",
      farm: "Quintas",
      commercial: "Comercial",
      hotel: "Hotéis"
    };

    const badgeMap = {
      active: { filterKey: "status", value: "active", label: "Ativo", count: stats.active, color: "green" },
      pending: { filterKey: "status", value: "pending", label: "Pendente", count: stats.pending, color: "yellow" },
      sale: { filterKey: "listing_type", value: "sale", label: "Venda", count: stats.sale, color: "blue" },
      rent: { filterKey: "listing_type", value: "rent", label: "Arrendamento", count: stats.rent, color: "purple" },
      apartment: { filterKey: "property_type", value: "apartment", label: propertyTypeLabels.apartment, count: stats.apartment, color: "indigo", icon: Building2 },
      house: { filterKey: "property_type", value: "house", label: propertyTypeLabels.house, count: stats.house, color: "emerald", icon: Home },
      land: { filterKey: "property_type", value: "land", label: propertyTypeLabels.land, count: stats.land, color: "slate", icon: Building2 },
      store: { filterKey: "property_type", value: "store", label: propertyTypeLabels.store, count: stats.store, color: "slate", icon: Store },
      condo: { filterKey: "property_type", value: "condo", label: propertyTypeLabels.condo, count: stats.condo, color: "slate", icon: Building2 },
      townhouse: { filterKey: "property_type", value: "townhouse", label: propertyTypeLabels.townhouse, count: stats.townhouse, color: "slate", icon: Home },
      building: { filterKey: "property_type", value: "building", label: propertyTypeLabels.building, count: stats.building, color: "slate", icon: Building2 },
      warehouse: { filterKey: "property_type", value: "warehouse", label: propertyTypeLabels.warehouse, count: stats.warehouse, color: "slate", icon: Building2 },
      office: { filterKey: "property_type", value: "office", label: propertyTypeLabels.office, count: stats.office, color: "slate", icon: Building2 },
      farm: { filterKey: "property_type", value: "farm", label: propertyTypeLabels.farm, count: stats.farm, color: "slate", icon: Home },
      commercial: { filterKey: "property_type", value: "commercial", label: propertyTypeLabels.commercial, count: stats.commercial, color: "slate", icon: Store },
      hotel: { filterKey: "property_type", value: "hotel", label: propertyTypeLabels.hotel, count: stats.hotel, color: "slate", icon: Building2 },
      featured: { filterKey: "featured", value: true, label: "Destaque", count: stats.featured, color: "amber", icon: Star },
      lastImport: { filterKey: "last_import", value: true, label: "Última Importação", count: stats.lastImport, color: "indigo", icon: Download },
      withImages: { filterKey: "has_images", value: true, label: "Com Imagens", count: stats.withImages, color: "blue", icon: Image }
    };

    const config = badgeMap[itemId];
    if (!config || config.count === 0) return null;

    const active = isActive(config.filterKey, config.value);
    const colorClasses = {
      green: active ? "bg-green-600 text-white border-green-600" : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100",
      yellow: active ? "bg-yellow-600 text-white border-yellow-600" : "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100",
      blue: active ? "bg-blue-600 text-white border-blue-600" : "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100",
      purple: active ? "bg-purple-600 text-white border-purple-600" : "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100",
      red: active ? "bg-red-600 text-white border-red-600" : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100",
      slate: active ? "bg-slate-600 text-white border-slate-600" : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100",
      amber: active ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100",
      gold: active ? "bg-yellow-500 text-white border-yellow-500" : "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100",
      emerald: active ? "bg-emerald-600 text-white border-emerald-600" : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100",
      indigo: active ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
    };

    return (
      <Badge
        onClick={() => toggleFilter(config.filterKey, config.value)}
        className={`cursor-pointer transition-all border ${colorClasses[config.color]} flex items-center gap-1 px-2 py-0.5 text-xs ${isDragging ? 'shadow-lg opacity-80' : ''}`}
      >
        {config.icon && <config.icon className="w-3 h-3" />}
        <span className="font-medium">{config.label}</span>
        <span className={active ? "opacity-90" : "opacity-60"}>({config.count})</span>
        {active && <X className="w-2 h-2 ml-0.5" />}
      </Badge>
    );
  };

  const getPublishedBadgeConfig = (itemId) => {
    const configs = {
      zuhaus: {
        onClick: () => togglePublishedPage('zuhaus'),
        active: filters.published_pages?.includes('zuhaus'),
        activeClass: "bg-red-600 text-white border-red-600",
        inactiveClass: "bg-red-50 text-red-700 border-red-300 hover:bg-red-100",
        icon: Home,
        label: "ZuHaus",
        count: stats.zuhaus
      },
      zuhandel: {
        onClick: () => togglePublishedPage('zuhandel'),
        active: filters.published_pages?.includes('zuhandel'),
        activeClass: "bg-slate-600 text-white border-slate-600",
        inactiveClass: "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100",
        icon: Store,
        label: "ZuHandel",
        count: stats.zuhandel
      },
      luxury_collection: {
        onClick: () => togglePublishedPage('luxury_collection'),
        active: filters.published_pages?.includes('luxury_collection'),
        activeClass: "bg-yellow-500 text-white border-yellow-500",
        inactiveClass: "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100",
        icon: Crown,
        label: "Premium Luxo",
        count: stats.luxury
      },
      international: {
        onClick: () => toggleFilter('country', 'international'),
        active: filters.country === 'international',
        activeClass: "bg-blue-600 text-white border-blue-600",
        inactiveClass: "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100",
        icon: Globe,
        label: "Internacionais",
        count: stats.international
      }
    };

    return configs[itemId];
  };

  return (
    <div className="mb-3">
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filterGroups.map((group, groupIndex) => (
              <Droppable key={group.id} droppableId={group.id} direction="horizontal">
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`${groupIndex % 2 !== 0 ? 'md:border-l md:pl-3' : ''} ${groupIndex >= 2 ? 'pt-2 border-t border-slate-100' : ''} ${
                      snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-1.5' : ''
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                      <GripVertical className="w-2.5 h-2.5 text-slate-400" />
                      {group.title}
                    </p>
                    <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                      {group.items.map((itemId, index) => {
                         // Renderizar badges de publicação especiais
                         if (['zuhaus', 'zuhandel', 'luxury_collection', 'international'].includes(itemId)) {
                          const config = getPublishedBadgeConfig(itemId);
                          if (!config || config.count === 0) return null;
                          
                          return (
                            <Draggable key={itemId} draggableId={itemId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <Badge
                                    onClick={config.onClick}
                                    className={`cursor-pointer transition-all border flex items-center gap-1.5 px-2.5 py-1 text-xs ${
                                      config.active ? config.activeClass : config.inactiveClass
                                    } ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                                  >
                                    <config.icon className="w-3 h-3" />
                                    <span className="font-medium">{config.label}</span>
                                    <span className="opacity-60">({config.count})</span>
                                    {config.active && <X className="w-2.5 h-2.5 ml-0.5" />}
                                  </Badge>
                                </div>
                              )}
                            </Draggable>
                          );
                        }
                        
                        // Renderizar badges normais
                        return (
                          <Draggable key={itemId} draggableId={itemId} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                {renderBadge(itemId, snapshot.isDragging)}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}