import React, { useMemo, useCallback, useState, useEffect, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Trash2, Eye, MapPin, ExternalLink, Hash, CheckSquare, Filter, X, FileText, Edit, Star, Copy, Building2, LayoutGrid, List, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EditPropertyDialog from "../components/listings/EditPropertyDialog";
import PropertiesTable from "../components/listings/PropertiesTable";
import DevelopmentsTab from "../components/developments/DevelopmentsTab";
import AdvancedFilters, { FILTER_TYPES } from "@/components/filters/AdvancedFilters";
import { useAdvancedFilters } from "@/components/filters/useAdvancedFilters";

// Memoized Property Card component for better performance
const PropertyCard = memo(function PropertyCard({ 
  property, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onStatusChange,
  onToggleFeatured,
  onDuplicate,
  onDelete,
  onViewNotes,
  propertyTypeLabels
}) {
  const handleClick = useCallback(() => onEdit(property), [property, onEdit]);
  const handleSelect = useCallback((e) => {
    e.stopPropagation();
    onToggleSelect(property.id);
  }, [property.id, onToggleSelect]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={handleClick}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="flex items-center justify-center p-4 md:p-6 bg-slate-50" onClick={handleSelect}>
            <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(property.id)} />
          </div>
          <div className="md:w-80 h-64 md:h-auto relative">
            <img
              src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
              alt={property.title}
              className="w-full h-full object-cover"
              loading="lazy"
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
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{property.title}</h3>
                <div className="flex items-center text-slate-600 mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{property.city}, {property.state}</span>
                </div>
                <div className="text-slate-900 font-bold text-xl mb-3">€{property.price?.toLocaleString()}</div>
                <div className="flex flex-wrap gap-2 mb-3 text-sm text-slate-600">
                  {property.bedrooms > 0 && <span>🛏️ {property.bedrooms} quartos</span>}
                  {property.bathrooms > 0 && <span>🚿 {property.bathrooms} WC</span>}
                  {property.useful_area > 0 && <span>📐 {property.useful_area}m²</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <Select value={property.status} onValueChange={(v) => onStatusChange(property.id, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full" />Ativo</span></SelectItem>
                    <SelectItem value="pending"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-yellow-500 rounded-full" />Pendente</span></SelectItem>
                    <SelectItem value="sold"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full" />Vendido</span></SelectItem>
                    <SelectItem value="rented"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full" />Arrendado</span></SelectItem>
                    <SelectItem value="off_market"><span className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-500 rounded-full" />Desativado</span></SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline">{propertyTypeLabels[property.property_type] || property.property_type}</Badge>
                <Badge variant="outline">{property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}</Badge>
              </div>
            </div>
            <p className="text-slate-700 mb-4 line-clamp-2">{property.description}</p>
            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
                <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-2" />Ver</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => onEdit(property)}><Edit className="w-4 h-4 mr-2" />Editar</Button>
              <Button variant="outline" size="sm" onClick={() => onToggleFeatured(property)} className={property.featured ? "border-amber-400 text-amber-600" : ""}>
                <Star className={`w-4 h-4 mr-2 ${property.featured ? "fill-current" : ""}`} />{property.featured ? "Destaque" : "Destacar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDuplicate(property)}><Copy className="w-4 h-4 mr-2" />Duplicar</Button>
              {property.internal_notes && <Button variant="outline" size="sm" onClick={() => onViewNotes(property)}><FileText className="w-4 h-4 mr-2" />Notas</Button>}
              <Button variant="outline" size="sm" onClick={() => onDelete(property.id)} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-2" />Eliminar</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function MyListings() {
  const queryClient = useQueryClient();
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingNotes, setViewingNotes] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [activeTab, setActiveTab] = useState("properties");
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? "cards" : "table");
  const [filterLogic, setFilterLogic] = useState("AND");
  const [assignDevelopmentOpen, setAssignDevelopmentOpen] = useState(false);
  const [selectedDevelopment, setSelectedDevelopment] = useState("");
  
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    property_type: "all",
    listing_type: "all",
    price: {},
    tags: [],
    state: "all",
    city: "all",
    created_date: {},
    updated_date: {},
    featured: null
  });
  
  const ITEMS_PER_PAGE = 10;

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // Buscar tags criadas nas ferramentas
  const { data: systemTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => base44.entities.Tag.list('name')
  });

  // Filtrar apenas tags de imóveis ou gerais
  const propertyTags = React.useMemo(() => {
    return systemTags.filter(t => t.category === 'property' || t.category === 'general');
  }, [systemTags]);

  // Buscar empreendimentos
  const { data: developments = [] } = useQuery({
    queryKey: ['developments'],
    queryFn: () => base44.entities.Development.list('name')
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['myProperties', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allProperties = await base44.entities.Property.list('-updated_date');
      
      const userType = user.user_type?.toLowerCase() || '';
      const permissions = user.permissions || {};
      
      // Admin/Gestor vê todos os imóveis
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allProperties;
      }
      
      // Verifica permissão canViewAllProperties
      if (permissions.canViewAllProperties === true) {
        return allProperties;
      }
      
      // Agentes vêem imóveis que criaram OU que lhes estão atribuídos OU onde são agente
      return allProperties.filter(p => 
        p.created_by === user.email || 
        p.assigned_consultant === user.email ||
        p.agent_id === user.id
      );
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
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar estado");
    }
  });

  const bulkAddTagMutation = useMutation({
    mutationFn: async ({ ids, tagName }) => {
      const propertiesToUpdate = properties.filter(p => ids.includes(p.id));
      await Promise.all(propertiesToUpdate.map(property => {
        const currentTags = property.tags || [];
        if (!currentTags.includes(tagName)) {
          return base44.entities.Property.update(property.id, { tags: [...currentTags, tagName] });
        }
        return Promise.resolve();
      }));
    },
    onSuccess: (_, { ids, tagName }) => {
      toast.success(`Etiqueta "${tagName}" adicionada a ${ids.length} imóveis`);
      setSelectedProperties([]);
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
    },
  });

  const bulkAssignDevelopmentMutation = useMutation({
    mutationFn: async ({ ids, developmentId, developmentName }) => {
      await Promise.all(ids.map(id => 
        base44.entities.Property.update(id, { 
          development_id: developmentId,
          development_name: developmentName
        })
      ));
    },
    onSuccess: (_, { ids, developmentName }) => {
      toast.success(`${ids.length} imóveis atribuídos a "${developmentName}"`);
      setSelectedProperties([]);
      setAssignDevelopmentOpen(false);
      setSelectedDevelopment("");
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
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

  const handleDelete = useCallback((id) => {
    if (window.confirm("Tem a certeza que deseja eliminar este anúncio?")) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleBulkDelete = useCallback(() => {
    if (window.confirm(`Eliminar ${selectedProperties.length} anúncios selecionados?`)) {
      bulkDeleteMutation.mutate(selectedProperties);
    }
  }, [selectedProperties, bulkDeleteMutation]);

  const statusLabelsMap = useMemo(() => ({
    active: "Ativo",
    pending: "Pendente", 
    sold: "Vendido",
    rented: "Arrendado",
    off_market: "Desativado"
  }), []);

  const handleStatusChange = useCallback(async (propertyId, newStatus) => {
    try {
      await base44.entities.Property.update(propertyId, { status: newStatus });
      toast.success(`Estado alterado para "${statusLabelsMap[newStatus]}"`);
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    } catch (error) {
      console.error("Erro ao alterar estado:", error);
      toast.error("Erro ao alterar estado do imóvel");
    }
  }, [queryClient, statusLabelsMap]);

  const handleToggleFeatured = useCallback((property) => {
    updatePropertyMutation.mutate(
      { id: property.id, data: { featured: !property.featured } },
      { onSuccess: () => toast.success(property.featured ? "Removido dos destaques" : "Marcado como destaque") }
    );
  }, [updatePropertyMutation]);

  const handleDuplicate = useCallback((property) => {
    if (window.confirm(`Duplicar o imóvel "${property.title}"?`)) {
      duplicatePropertyMutation.mutate(property);
    }
  }, [duplicatePropertyMutation]);

  const toggleSelect = useCallback((id) => {
    setSelectedProperties(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  }, []);

  // Extrair todos os distritos e concelhos únicos - memoized
  const allStates = useMemo(() => {
    const statesSet = new Set();
    properties.forEach(p => { if (p.state) statesSet.add(p.state); });
    return Array.from(statesSet).sort();
  }, [properties]);

  const allCities = useMemo(() => {
    const citiesSet = new Set();
    properties.forEach(p => {
      if (p.city && (filters.state === "all" || p.state === filters.state)) {
        citiesSet.add(p.city);
      }
    });
    return Array.from(citiesSet).sort();
  }, [properties, filters.state]);

  // Configuração dos filtros avançados - memoized
  const filterConfig = useMemo(() => ({
    search: {
      type: FILTER_TYPES.text,
      label: "Pesquisar",
      placeholder: "Título, cidade, morada...",
      searchFields: ["title", "city", "address", "ref_id"]
    },
    status: {
      type: FILTER_TYPES.select,
      label: "Estado",
      field: "status",
      options: [
        { value: "active", label: "Ativo" },
        { value: "pending", label: "Pendente" },
        { value: "sold", label: "Vendido" },
        { value: "rented", label: "Arrendado" },
        { value: "off_market", label: "Desativado" }
      ]
    },
    property_type: {
      type: FILTER_TYPES.select,
      label: "Tipo de Imóvel",
      field: "property_type",
      options: [
        { value: "house", label: "Moradia" },
        { value: "apartment", label: "Apartamento" },
        { value: "condo", label: "Condomínio" },
        { value: "townhouse", label: "Casa Geminada" },
        { value: "building", label: "Prédio" },
        { value: "land", label: "Terreno" },
        { value: "commercial", label: "Comercial" },
        { value: "warehouse", label: "Armazém" },
        { value: "office", label: "Escritório" },
        { value: "store", label: "Loja" },
        { value: "farm", label: "Quinta" },
        { value: "development", label: "Empreendimento" }
      ]
    },
    listing_type: {
      type: FILTER_TYPES.select,
      label: "Tipo de Anúncio",
      field: "listing_type",
      options: [
        { value: "sale", label: "Venda" },
        { value: "rent", label: "Arrendamento" }
      ]
    },
    price: {
      type: FILTER_TYPES.numberRange,
      label: "Preço (€)",
      field: "price",
      prefix: "€"
    },
    state: {
      type: FILTER_TYPES.select,
      label: "Distrito",
      field: "state",
      options: allStates.map(s => ({ value: s, label: s })),
      advanced: true
    },
    city: {
      type: FILTER_TYPES.select,
      label: "Concelho",
      field: "city",
      options: allCities.map(c => ({ value: c, label: c })),
      advanced: true
    },
    tags: {
      type: FILTER_TYPES.multiSelect,
      label: "Etiquetas",
      field: "tags",
      options: propertyTags.map(t => ({ value: t.name, label: t.name })),
      advanced: true
    },
    created_date: {
      type: FILTER_TYPES.dateRange,
      label: "Data de Criação",
      field: "created_date",
      advanced: true
    },
    updated_date: {
      type: FILTER_TYPES.dateRange,
      label: "Data de Atualização",
      field: "updated_date",
      advanced: true
    },
    featured: {
      type: FILTER_TYPES.boolean,
      label: "Destaque",
      field: "featured",
      trueLabel: "Sim",
      falseLabel: "Não",
      advanced: true
    }
  }), [allStates, allCities, propertyTags]);

  // Aplicar filtros avançados
  const filteredProperties = useAdvancedFilters(properties, filters, filterConfig, filterLogic);

  const toggleSelectAll = useCallback(() => {
    setSelectedProperties(prev =>
      prev.length === filteredProperties.length && filteredProperties.length > 0 ? [] : filteredProperties.map(p => p.id)
    );
  }, [filteredProperties]);
  
  // Pagination - memoized
  const totalPages = useMemo(() => Math.ceil(filteredProperties.length / ITEMS_PER_PAGE), [filteredProperties.length]);
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProperties.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProperties, currentPage]);
  
  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  // Reset city filter when state changes
  useEffect(() => {
    if (filters.state !== "all") {
      setFilters(prev => ({ ...prev, city: "all" }));
    }
  }, [filters.state]);

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

  const propertyTypeLabels = useMemo(() => ({
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
  }), []);

  const hasActiveFilters = useMemo(() => Object.entries(filters).some(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== null && v !== "" && v !== undefined);
    }
    return value !== "" && value !== "all" && value !== null && value !== undefined;
  }), [filters]);
  
  // Memoized selected set for O(1) lookup
  const selectedSet = useMemo(() => new Set(selectedProperties), [selectedProperties]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900">Os Meus Anúncios</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1 sm:mt-2">Gerir imóveis e empreendimentos</p>
          </div>
          {activeTab === "properties" && (
            <Link to={createPageUrl("AddListing")} className="w-full sm:w-auto">
              <Button className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Anúncio
              </Button>
            </Link>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="properties" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Imóveis</span>
              <span className="hidden sm:inline">({properties.length})</span>
            </TabsTrigger>
            <TabsTrigger value="developments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Empreendimentos</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "developments" ? (
          <DevelopmentsTab />
        ) : (
        <>
        {/* Advanced Filters */}
        <AdvancedFilters
          filterConfig={filterConfig}
          filters={filters}
          onFiltersChange={setFilters}
          savedFiltersKey="properties"
          totalCount={properties.length}
          filteredCount={filteredProperties.length}
          showSavedFilters={true}
          showLogicToggle={true}
          className="mb-6"
        />

        {selectedProperties.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-blue-500 bg-blue-50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <span className="font-medium text-sm sm:text-base text-blue-900">
                    {selectedProperties.length} selecionado{selectedProperties.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white">
                        <Tag className="w-4 h-4 mr-2" />
                        Adicionar Etiqueta
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="end">
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {propertyTags.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-2">Sem etiquetas disponíveis</p>
                        ) : (
                          propertyTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => bulkAddTagMutation.mutate({ ids: selectedProperties, tagName: tag.name })}
                              className="w-full flex items-center p-2 rounded-lg text-left hover:bg-slate-50 transition-colors"
                            >
                              <Badge
                                style={{
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color,
                                  borderColor: tag.color
                                }}
                                className="border"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag.name}
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
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
            </CardContent>
          </Card>
        ) : (
          <>
            {/* View Mode Toggle */}
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedProperties.length === filteredProperties.length ? 'Desselecionar' : 'Selecionar'} Todos
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="rounded-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="rounded-none"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
                {totalPages > 1 && viewMode === "cards" && (
                  <p className="text-sm text-slate-600">
                    Página {currentPage} de {totalPages}
                  </p>
                )}
              </div>
            </div>

            {viewMode === "table" ? (
              <PropertiesTable
                properties={filteredProperties}
                selectedProperties={selectedProperties}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onStatusChange={handleStatusChange}
                onEdit={setEditingProperty}
                onDelete={handleDelete}
                onToggleFeatured={handleToggleFeatured}
                onDuplicate={handleDuplicate}
              />
            ) : (
            <>
            <div className="grid grid-cols-1 gap-6">
              {paginatedProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSelected={selectedSet.has(property.id)}
                  onToggleSelect={toggleSelect}
                  onEdit={setEditingProperty}
                  onStatusChange={handleStatusChange}
                  onToggleFeatured={handleToggleFeatured}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onViewNotes={setViewingNotes}
                  propertyTypeLabels={propertyTypeLabels}
                />
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
        </>
        )}
      </div>
    </div>
  );
}