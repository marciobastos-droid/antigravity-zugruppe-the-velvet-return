import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Trash2, Eye, MapPin, ExternalLink, Hash, CheckSquare, Filter, X, FileText, Edit, Star, Copy, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditPropertyDialog from "../components/listings/EditPropertyDialog";
import { debounce } from "lodash";
import DevelopmentsTab from "../components/developments/DevelopmentsTab";

export default function MyListings() {
  const queryClient = useQueryClient();
  const [selectedProperties, setSelectedProperties] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [listingTypeFilter, setListingTypeFilter] = React.useState("all");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [viewingNotes, setViewingNotes] = React.useState(null);
  const [editingProperty, setEditingProperty] = React.useState(null);
  
  const ITEMS_PER_PAGE = 10;

  // Debounced search
  React.useEffect(() => {
    const debouncedUpdate = debounce(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    
    debouncedUpdate();
    return () => debouncedUpdate.cancel();
  }, [searchTerm]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['myProperties', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allProperties = await base44.entities.Property.list('-updated_date');
      
      // Admin/Gestor vê todos os imóveis
      if (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor') {
        return allProperties;
      }
      
      // Outros utilizadores vêem apenas os seus
      return allProperties.filter(p => p.created_by === user.email);
    },
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Property.delete(id),
    onSuccess: () => {
      toast.success("Anúncio eliminado");
      queryClient.invalidateQueries({ queryKey: ['myProperties', 'properties'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Property.delete(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} anúncios eliminados`);
      setSelectedProperties([]);
      queryClient.invalidateQueries({ queryKey: ['myProperties', 'properties'] });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Property.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProperties', 'properties'] });
    },
  });

  const duplicatePropertyMutation = useMutation({
    mutationFn: async (property) => {
      const { id, created_date, updated_date, created_by, ...propertyData } = property;
      const newProperty = {
        ...propertyData,
        title: `${property.title} (Cópia)`,
        status: 'pending'
      };
      return await base44.entities.Property.create(newProperty);
    },
    onSuccess: () => {
      toast.success("Imóvel duplicado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['myProperties', 'properties'] });
    },
  });

  const handleDelete = (id) => {
    if (window.confirm("Tem a certeza que deseja eliminar este anúncio?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Eliminar ${selectedProperties.length} anúncios selecionados?`)) {
      bulkDeleteMutation.mutate(selectedProperties);
    }
  };

  const handleStatusChange = (propertyId, newStatus) => {
    updatePropertyMutation.mutate(
      { id: propertyId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success("Estado atualizado");
        }
      }
    );
  };

  const handleToggleFeatured = (property) => {
    updatePropertyMutation.mutate(
      { id: property.id, data: { featured: !property.featured } },
      {
        onSuccess: () => {
          toast.success(property.featured ? "Removido dos destaques" : "Marcado como destaque");
        }
      }
    );
  };

  const handleDuplicate = (property) => {
    if (window.confirm(`Duplicar o imóvel "${property.title}"?`)) {
      duplicatePropertyMutation.mutate(property);
    }
  };

  const toggleSelect = (id) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setListingTypeFilter("all");
    setPriceMin("");
    setPriceMax("");
    setCurrentPage(1);
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = debouncedSearch === "" || 
      p.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.city?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.address?.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesType = typeFilter === "all" || p.property_type === typeFilter;
    const matchesListingType = listingTypeFilter === "all" || p.listing_type === listingTypeFilter;
    
    const matchesPriceMin = priceMin === "" || p.price >= parseFloat(priceMin);
    const matchesPriceMax = priceMax === "" || p.price <= parseFloat(priceMax);
    
    return matchesSearch && matchesStatus && matchesType && matchesListingType && matchesPriceMin && matchesPriceMax;
  });

  const toggleSelectAll = () => {
    setSelectedProperties(prev =>
      prev.length === filteredProperties.length && filteredProperties.length > 0 ? [] : filteredProperties.map(p => p.id)
    );
  };
  
  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProperties = filteredProperties.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, listingTypeFilter, priceMin, priceMax]);

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
    commercial: "Comercial"
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || typeFilter !== "all" || 
                          listingTypeFilter !== "all" || priceMin || priceMax;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Os Meus Anúncios</h1>
            <p className="text-slate-600 mt-2">Gerir os seus anúncios de imóveis</p>
          </div>
          <Link to={createPageUrl("AddListing")}>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Anúncio
            </Button>
          </Link>
        </div>

        {/* Advanced Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-slate-700" />
              <h3 className="font-semibold text-slate-900">Filtros Avançados</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Pesquisar</label>
                <div className="relative">
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Título, cidade, morada..."
                    className="pr-8"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estados</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="sold">Vendido</SelectItem>
                    <SelectItem value="rented">Arrendado</SelectItem>
                    <SelectItem value="off_market">Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Imóvel</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="house">Moradia</SelectItem>
                    <SelectItem value="apartment">Apartamento</SelectItem>
                    <SelectItem value="condo">Condomínio</SelectItem>
                    <SelectItem value="townhouse">Casa Geminada</SelectItem>
                    <SelectItem value="building">Prédio</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Anúncio</label>
                <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="rent">Arrendamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Preço Mínimo (€)</label>
                <Input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Preço Máximo (€)</label>
                <Input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="5000000"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                A mostrar <strong>{filteredProperties.length}</strong> de <strong>{properties.length}</strong> imóveis
              </p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedProperties.length > 0 && (
          <Card className="mb-6 border-blue-500 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedProperties.length} anúncio{selectedProperties.length > 1 ? 's' : ''} selecionado{selectedProperties.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Selecionados
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedProperties([])}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {properties.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">Ainda sem anúncios</h3>
              <p className="text-slate-600 mb-6">Comece por adicionar o seu primeiro imóvel</p>
              <Link to={createPageUrl("AddListing")}>
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Anúncio
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredProperties.length === 0 ? (
          <Card className="text-center py-20">
            <CardContent>
              <Filter className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">Nenhum imóvel encontrado</h3>
              <p className="text-slate-600 mb-6">Tente ajustar os filtros</p>
              <Button onClick={clearFilters} variant="outline">Limpar Filtros</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedProperties.length === filteredProperties.length ? 'Desselecionar' : 'Selecionar'} Todos
              </Button>
              {totalPages > 1 && (
                <p className="text-sm text-slate-600">
                  Página {currentPage} de {totalPages}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-6">
              {paginatedProperties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Checkbox */}
                      <div className="flex items-center justify-center p-4 md:p-6 bg-slate-50">
                        <Checkbox
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={() => toggleSelect(property.id)}
                        />
                      </div>

                      {/* Image */}
                      <div className="md:w-80 h-64 md:h-auto relative">
                        <img
                          src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                        {property.featured && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-amber-400 text-slate-900 border-0">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Destaque
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">
                              {property.title}
                            </h3>
                            <div className="flex items-center text-slate-600 mb-2">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{property.city}, {property.state}</span>
                            </div>
                            <div className="text-slate-900 font-bold text-xl mb-3">
                              €{property.price?.toLocaleString()}
                            </div>
                            
                            {/* Additional Details */}
                            <div className="flex flex-wrap gap-2 mb-3 text-sm text-slate-600">
                              {property.bedrooms > 0 && <span>🛏️ {property.bedrooms} quartos</span>}
                              {property.bathrooms > 0 && <span>🚿 {property.bathrooms} WC</span>}
                              {property.useful_area > 0 && <span>📐 {property.useful_area}m² útil</span>}
                              {property.gross_area > 0 && <span>📏 {property.gross_area}m² bruto</span>}
                              {property.front_count > 0 && <span>🏠 {property.front_count} frentes</span>}
                            </div>
                            
                            {(property.external_id || property.source_url) && (
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {property.external_id && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Hash className="w-3 h-3 mr-1" />
                                    ID: {property.external_id}
                                  </Badge>
                                )}
                                {property.source_url && (
                                  <a
                                    href={property.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex"
                                  >
                                    <Badge variant="secondary" className="text-xs hover:bg-blue-100 cursor-pointer">
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      Ver Original
                                    </Badge>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {/* Status Selector */}
                            <Select 
                              value={property.status} 
                              onValueChange={(value) => handleStatusChange(property.id, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    Ativo
                                  </span>
                                </SelectItem>
                                <SelectItem value="pending">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                    Pendente
                                  </span>
                                </SelectItem>
                                <SelectItem value="sold">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Vendido
                                  </span>
                                </SelectItem>
                                <SelectItem value="rented">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Arrendado
                                  </span>
                                </SelectItem>
                                <SelectItem value="off_market">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                                    Desativado
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Badge variant="outline">
                              {propertyTypeLabels[property.property_type] || property.property_type}
                            </Badge>
                            <Badge variant="outline">
                              {property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-slate-700 mb-4 line-clamp-2">
                          {property.description}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingProperty(property)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleFeatured(property)}
                            className={property.featured ? "border-amber-400 text-amber-600 hover:bg-amber-50" : ""}
                          >
                            <Star className={`w-4 h-4 mr-2 ${property.featured ? "fill-current" : ""}`} />
                            {property.featured ? "Destaque" : "Destacar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicate(property)}
                            disabled={duplicatePropertyMutation.isPending}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </Button>
                          {property.internal_notes && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setViewingNotes(property)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Notas
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(property.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <PaginationItem key={page}>...</PaginationItem>;
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        {/* Internal Notes Dialog */}
        <Dialog open={!!viewingNotes} onOpenChange={(open) => !open && setViewingNotes(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notas Internas - {viewingNotes?.title}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-slate-700 whitespace-pre-line">{viewingNotes?.internal_notes}</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Property Dialog */}
        <EditPropertyDialog
          property={editingProperty}
          open={!!editingProperty}
          onOpenChange={(open) => !open && setEditingProperty(null)}
        />
      </div>
    </div>
  );
}