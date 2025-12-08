import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, ChevronRight, Eye, Edit, Star, Copy, Trash2, 
  MapPin, Building2, Users, Tag, Home, Store, TrendingUp, Crown, Globe, ExternalLink
} from "lucide-react";

const GROUP_OPTIONS = [
  { value: "none", label: "Sem agrupamento", icon: null },
  { value: "city", label: "Por Concelho", icon: MapPin },
  { value: "state", label: "Por Distrito", icon: MapPin },
  { value: "listing_type", label: "Por Tipo de Negócio", icon: Tag },
  { value: "property_type", label: "Por Tipo de Imóvel", icon: Building2 },
  { value: "agent_name", label: "Por Agente", icon: Users },
];

const PROPERTY_TYPE_LABELS = {
  house: "Moradia",
  apartment: "Apartamento",
  condo: "Condomínio",
  townhouse: "Casa Geminada",
  building: "Prédio",
  land: "Terreno",
  commercial: "Comercial",
  warehouse: "Armazém",
  office: "Escritório",
  store: "Loja",
  farm: "Quinta",
  development: "Empreendimento"
};

const LISTING_TYPE_LABELS = {
  sale: "Venda",
  rent: "Arrendamento"
};

function PropertyRow({ property, isSelected, onToggleSelect, onEdit, onStatusChange, onToggleFeatured, onDuplicate, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={() => onToggleSelect(property.id)}
        onClick={(e) => e?.stopPropagation?.()}
      />
      
      <img
        src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=100"}
        alt={property.title}
        className="w-16 h-12 object-cover rounded"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-900 truncate">{property.title}</h4>
          {property.featured && <Star className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{property.city}, {property.state}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap mt-1">
          {property.published_pages && property.published_pages.length > 0 && property.published_pages.map((page, idx) => {
            const PageIcon = 
              page === 'zugruppe' ? Building2 :
              page === 'zuhaus' ? Home :
              page === 'zuhandel' ? Store :
              page === 'homepage_featured' ? Star :
              page === 'investor_section' ? TrendingUp :
              page === 'luxury_collection' ? Crown :
              ExternalLink;
            
            return (
              <div key={idx} className="w-4 h-4 bg-green-100 rounded flex items-center justify-center" title={page}>
                <PageIcon className="w-2.5 h-2.5 text-green-700" />
              </div>
            );
          })}
          {property.published_portals && property.published_portals.length > 0 && (
            <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center" title={`${property.published_portals.length} portais`}>
              <Globe className="w-2.5 h-2.5 text-blue-700" />
            </div>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-semibold text-slate-900">€{property.price?.toLocaleString()}</div>
        <Badge variant="outline" className="text-xs">
          {PROPERTY_TYPE_LABELS[property.property_type] || property.property_type}
        </Badge>
      </div>
      
      <div className="flex items-center gap-1">
        <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => onEdit(property)}><Edit className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onToggleFeatured(property)}>
          <Star className={`w-4 h-4 ${property.featured ? "fill-amber-500 text-amber-500" : ""}`} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDuplicate(property)}><Copy className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(property.id)} className="text-red-600 hover:text-red-700">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function PropertyGroup({ 
  groupKey, 
  groupLabel, 
  properties, 
  selectedProperties, 
  onToggleSelect, 
  onEdit, 
  onStatusChange, 
  onToggleFeatured, 
  onDuplicate, 
  onDelete,
  defaultOpen = true
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const selectedInGroup = properties.filter(p => selectedProperties.includes(p.id)).length;
  const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors mb-2">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
            <span className="font-semibold text-slate-900">{groupLabel || "Sem atribuição"}</span>
            <Badge variant="secondary">{properties.length} imóveis</Badge>
            {selectedInGroup > 0 && (
              <Badge className="bg-blue-100 text-blue-800">{selectedInGroup} selecionados</Badge>
            )}
          </div>
          <div className="text-sm text-slate-600">
            Total: <span className="font-semibold">€{totalValue.toLocaleString()}</span>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pl-4 mb-4">
        {properties.map((property) => (
          <PropertyRow
            key={property.id}
            property={property}
            isSelected={selectedProperties.includes(property.id)}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onToggleFeatured={onToggleFeatured}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function GroupedPropertiesView({
  properties,
  selectedProperties,
  onToggleSelect,
  onEdit,
  onStatusChange,
  onToggleFeatured,
  onDuplicate,
  onDelete,
  groupBy,
  onGroupByChange
}) {
  const [expandAll, setExpandAll] = useState(true);

  const groupedProperties = useMemo(() => {
    if (groupBy === "none") return null;

    const groups = {};
    properties.forEach(property => {
      let key;
      let label;

      switch (groupBy) {
        case "city":
          key = property.city || "_none";
          label = property.city || "Sem concelho";
          break;
        case "state":
          key = property.state || "_none";
          label = property.state || "Sem distrito";
          break;
        case "listing_type":
          key = property.listing_type || "_none";
          label = LISTING_TYPE_LABELS[property.listing_type] || "Sem tipo";
          break;
        case "property_type":
          key = property.property_type || "_none";
          label = PROPERTY_TYPE_LABELS[property.property_type] || "Sem tipo";
          break;
        case "agent_name":
          key = property.agent_name || property.agent_id || "_none";
          label = property.agent_name || "Sem agente";
          break;
        default:
          key = "_all";
          label = "Todos";
      }

      if (!groups[key]) {
        groups[key] = { label, properties: [] };
      }
      groups[key].properties.push(property);
    });

    // Sort groups by label
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === "_none") return 1;
        if (b === "_none") return -1;
        return a.localeCompare(b);
      })
      .map(([key, data]) => ({ key, ...data }));
  }, [properties, groupBy]);

  return (
    <div className="space-y-4">
      {/* Grouping Controls */}
      <div className="flex items-center justify-between gap-4 p-3 bg-white border rounded-lg">
        <div className="flex items-center gap-3">
          <Home className="w-5 h-5 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Agrupar por:</span>
          <Select value={groupBy} onValueChange={onGroupByChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon && <option.icon className="w-4 h-4" />}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {groupBy !== "none" && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setExpandAll(!expandAll)}
          >
            {expandAll ? "Recolher Todos" : "Expandir Todos"}
          </Button>
        )}
      </div>

      {/* Grouped Content */}
      {groupBy === "none" ? (
        <div className="space-y-2">
          {properties.map((property) => (
            <PropertyRow
              key={property.id}
              property={property}
              isSelected={selectedProperties.includes(property.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              onToggleFeatured={onToggleFeatured}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {groupedProperties?.map((group) => (
            <PropertyGroup
              key={group.key}
              groupKey={group.key}
              groupLabel={group.label}
              properties={group.properties}
              selectedProperties={selectedProperties}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              onToggleFeatured={onToggleFeatured}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              defaultOpen={expandAll}
            />
          ))}
        </div>
      )}

      {properties.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-slate-500">Nenhum imóvel encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}