import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Bed, Bath, Maximize, Euro, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MobilePropertyCard({ 
  property, 
  selected, 
  onToggleSelect, 
  onView, 
  onEdit, 
  onDelete,
  selectionMode 
}) {
  const propertyTypeLabels = {
    apartment: "Apt",
    house: "Moradia",
    land: "Terreno",
    building: "Prédio",
    commercial: "Comercial",
    store: "Loja",
    office: "Escritório",
    warehouse: "Armazém",
    farm: "Quinta"
  };

  return (
    <Card className={`overflow-hidden transition-all ${
      selected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow-sm'
    }`}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Image */}
          <div className="relative h-40 bg-slate-100">
            {property.images?.[0] ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                <MapPin className="w-12 h-12 text-slate-400" />
              </div>
            )}
            
            {/* Selection Checkbox */}
            {selectionMode && (
              <div 
                className="absolute top-2 left-2 bg-white rounded-md p-1 shadow-lg cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(property.id);
                }}
              >
                <Checkbox checked={selected} />
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-2 right-2">
              <Badge className={
                property.status === 'active' ? 'bg-green-500' :
                property.status === 'sold' ? 'bg-red-500' :
                property.status === 'rented' ? 'bg-blue-500' :
                'bg-slate-500'
              }>
                {property.status === 'active' ? 'Ativo' :
                 property.status === 'sold' ? 'Vendido' :
                 property.status === 'rented' ? 'Arrendado' :
                 property.status}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-2">
            {/* Ref + Type */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {property.ref_id || property.id.slice(0, 8)}
              </Badge>
              <span className="text-xs text-slate-500">
                {propertyTypeLabels[property.property_type] || property.property_type}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 leading-tight">
              {property.title}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{property.city}, {property.state}</span>
            </div>

            {/* Features */}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              {property.bedrooms > 0 && (
                <div className="flex items-center gap-1">
                  <Bed className="w-3 h-3" />
                  <span>{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="flex items-center gap-1">
                  <Bath className="w-3 h-3" />
                  <span>{property.bathrooms}</span>
                </div>
              )}
              {property.useful_area > 0 && (
                <div className="flex items-center gap-1">
                  <Maximize className="w-3 h-3" />
                  <span>{property.useful_area}m²</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1">
                <Euro className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-lg text-slate-900">
                  {property.price?.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(property)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(property)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(property)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}