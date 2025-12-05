import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Trash2, Star, Copy, MapPin, Euro, Bed, Bath, Maximize, Building2, Hash, ExternalLink, User } from "lucide-react";
import DataTable from "../common/DataTable";
import { format } from "date-fns";

const statusLabels = {
  active: "Ativo",
  pending: "Pendente",
  sold: "Vendido",
  rented: "Arrendado",
  off_market: "Desativado"
};

const statusColors = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  sold: "bg-blue-100 text-blue-800",
  rented: "bg-purple-100 text-purple-800",
  off_market: "bg-slate-100 text-slate-800"
};

const propertyTypeLabels = {
  house: "Moradia",
  apartment: "Apartamento",
  condo: "Condomínio",
  townhouse: "Casa Geminada",
  building: "Prédio",
  land: "Terreno",
  commercial: "Comercial",
  development: "Empreendimento"
};

export default function PropertiesTable({
  properties,
  selectedProperties,
  onToggleSelect,
  onToggleSelectAll,
  onStatusChange,
  onEdit,
  onDelete,
  onToggleFeatured,
  onDuplicate
}) {
  const columns = [
    {
      key: "image",
      label: "",
      sortable: false,
      width: "80px",
      alwaysVisible: true,
      render: (_, property) => (
        <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100">
          <img
            src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=100"}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )
    },
    {
      key: "ref_id",
      label: "Ref",
      minWidth: "80px",
      render: (val) => val ? (
        <Badge variant="outline" className="font-mono text-xs">
          {val}
        </Badge>
      ) : '-'
    },
    {
      key: "title",
      label: "Título",
      minWidth: "180px",
      alwaysVisible: true,
      render: (val, property) => (
        <div className="max-w-xs">
          <div className="font-medium text-slate-900 truncate flex items-center gap-1">
            {property.featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
            {val}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {property.city}, {property.state}
          </div>
        </div>
      )
    },
    {
      key: "development_name",
      label: "Empreendimento",
      minWidth: "120px",
      render: (val) => val ? (
        <Badge variant="outline" className="text-xs truncate max-w-[120px]">
          <Building2 className="w-3 h-3 mr-1 flex-shrink-0" />
          <span className="truncate">{val}</span>
        </Badge>
      ) : <span className="text-slate-400">-</span>
    },
    {
      key: "price",
      label: "Preço",
      minWidth: "120px",
      sortValue: (row) => row.price || 0,
      render: (val, property) => (
        <div className="font-semibold text-slate-900">
          €{val?.toLocaleString() || 0}
          {property.listing_type === 'rent' && <span className="text-xs font-normal">/mês</span>}
        </div>
      )
    },
    {
      key: "property_type",
      label: "Tipo",
      minWidth: "100px",
      render: (val) => (
        <Badge variant="outline" className="text-xs">
          {propertyTypeLabels[val] || val}
        </Badge>
      )
    },
    {
      key: "listing_type",
      label: "Negócio",
      minWidth: "100px",
      render: (val) => (
        <Badge className={val === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
          {val === 'sale' ? 'Venda' : 'Arrendamento'}
        </Badge>
      )
    },
    {
      key: "bedrooms",
      label: "Quartos",
      minWidth: "80px",
      render: (val) => val > 0 ? (
        <span className="flex items-center gap-1">
          <Bed className="w-3.5 h-3.5 text-slate-400" />
          T{val}
        </span>
      ) : '-'
    },
    {
      key: "bathrooms",
      label: "WCs",
      minWidth: "70px",
      render: (val) => val > 0 ? (
        <span className="flex items-center gap-1">
          <Bath className="w-3.5 h-3.5 text-slate-400" />
          {val}
        </span>
      ) : '-'
    },
    {
      key: "useful_area",
      label: "Área",
      minWidth: "80px",
      sortValue: (row) => row.useful_area || row.square_feet || 0,
      render: (val, property) => {
        const area = val || property.square_feet;
        return area > 0 ? (
          <span className="flex items-center gap-1">
            <Maximize className="w-3.5 h-3.5 text-slate-400" />
            {area}m²
          </span>
        ) : '-';
      }
    },
    {
      key: "city",
      label: "Cidade",
      minWidth: "120px"
    },
    {
      key: "agent_name",
      label: "Agente",
      minWidth: "120px",
      render: (val, property) => {
        const agentName = val || property.assigned_consultant_name;
        return agentName ? (
          <span className="flex items-center gap-1 text-sm">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[100px]">{agentName}</span>
          </span>
        ) : <span className="text-slate-400">-</span>;
      }
    },
    {
      key: "status",
      label: "Estado",
      minWidth: "130px",
      render: (val, property) => (
        <Select 
          value={val} 
          onValueChange={(v) => onStatusChange(property.id, v)}
        >
          <SelectTrigger className="h-8 text-xs w-28" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent onClick={(e) => e.stopPropagation()}>
            <SelectItem value="active">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full" /> Ativo
              </span>
            </SelectItem>
            <SelectItem value="pending">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full" /> Pendente
              </span>
            </SelectItem>
            <SelectItem value="sold">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full" /> Vendido
              </span>
            </SelectItem>
            <SelectItem value="rented">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full" /> Arrendado
              </span>
            </SelectItem>
            <SelectItem value="off_market">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-500 rounded-full" /> Desativado
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      key: "created_date",
      label: "Criado",
      minWidth: "100px",
      sortValue: (row) => new Date(row.created_date),
      render: (val) => val ? format(new Date(val), "dd/MM/yy") : '-'
    },
    {
      key: "actions",
      label: "Ações",
      sortable: false,
      minWidth: "180px",
      alwaysVisible: true,
      render: (_, property) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`${createPageUrl("PropertyDetails")}?id=${property.id}`, '_blank');
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(property)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 w-8 p-0 ${property.featured ? 'text-amber-500' : ''}`}
            onClick={() => onToggleFeatured(property)}
          >
            <Star className={`w-4 h-4 ${property.featured ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onDuplicate(property)}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(property.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const defaultVisibleColumns = [
    "image", "ref_id", "title", "development_name", "price", "property_type", 
    "bedrooms", "useful_area", "agent_name", "status", "actions"
  ];

  return (
    <DataTable
      data={properties}
      columns={columns}
      defaultVisibleColumns={defaultVisibleColumns}
      defaultSortColumn="created_date"
      defaultSortDirection="desc"
      showCheckboxes={true}
      selectedRows={selectedProperties}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      onRowClick={(property) => onEdit(property)}
      emptyMessage="Nenhum imóvel encontrado"
    />
  );
}