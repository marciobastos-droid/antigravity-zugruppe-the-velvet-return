import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Eye, MapPin, Euro, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EditPropertyDialog from "../listings/EditPropertyDialog";

export default function AdminPropertiesManager() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [editingProperty, setEditingProperty] = React.useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['allProperties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const deletePropertyMutation = useMutation({
    mutationFn: (propertyId) => base44.entities.Property.delete(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProperties'] });
      toast.success("Imóvel eliminado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao eliminar: ${error.message}`);
    }
  });

  const filteredProperties = React.useMemo(() => {
    return properties.filter(p => {
      const matchesSearch = !searchTerm || 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ref_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesType = typeFilter === "all" || p.property_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [properties, searchTerm, statusFilter, typeFilter]);

  const propertyTypes = [...new Set(properties.map(p => p.property_type).filter(Boolean))];

  const handleDelete = (property) => {
    if (confirm(`Tem a certeza que deseja eliminar "${property.title}"?`)) {
      deletePropertyMutation.mutate(property.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              Gestão de Imóveis
            </CardTitle>
            <Link to={createPageUrl("MyListings")}>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Imóvel
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar por título, cidade, ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estados</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="sold">Vendido</SelectItem>
                <SelectItem value="rented">Arrendado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {propertyTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{properties.length}</div>
              <div className="text-sm text-blue-700">Total</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="text-2xl font-bold text-green-900">
                {properties.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-green-700">Ativos</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="text-2xl font-bold text-orange-900">
                {properties.filter(p => p.status === 'pending').length}
              </div>
              <div className="text-sm text-orange-700">Pendentes</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <div className="text-2xl font-bold text-purple-900">{filteredProperties.length}</div>
              <div className="text-sm text-purple-700">Filtrados</div>
            </div>
          </div>

          {/* Properties List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              Nenhum imóvel encontrado
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all"
                >
                  {property.images?.[0] && (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 truncate">{property.title}</h4>
                      {property.ref_id && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {property.ref_id}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {property.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Euro className="w-3 h-3" />
                        €{property.price?.toLocaleString()}
                      </span>
                      <Badge className={
                        property.status === 'active' ? 'bg-green-100 text-green-800' :
                        property.status === 'sold' ? 'bg-red-100 text-red-800' :
                        'bg-orange-100 text-orange-800'
                      }>
                        {property.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`} target="_blank">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingProperty(property)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(property)}
                      disabled={deletePropertyMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingProperty && (
        <EditPropertyDialog
          property={editingProperty}
          open={!!editingProperty}
          onOpenChange={(open) => !open && setEditingProperty(null)}
        />
      )}
    </>
  );
}