import React, { useMemo, useCallback, useState, useEffect, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Trash2, Eye, MapPin, ExternalLink, Hash, CheckSquare, Filter, X, FileText, Edit, Star, Copy, Building2, LayoutGrid, List, Tag, Users, Image, Layers, Sparkles, Globe, BarChart3, Calendar, Home, Store, TrendingUp, Crown } from "lucide-react";
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
import PropertiesByAgentView from "../components/listings/PropertiesByAgentView";
import GroupedPropertiesView from "../components/listings/GroupedPropertiesView";
import BulkPhotoAssign from "../components/listings/BulkPhotoAssign";
import BulkPublicationDialog from "../components/listings/BulkPublicationDialog";
import CreateDevelopmentFromProperties from "@/components/developments/CreateDevelopmentFromProperties";
import AIPropertyEnhancer from "../components/listings/AIPropertyEnhancer";
import PublicationHub from "../components/publication/PublicationHub";
import AdvancedFilters, { FILTER_TYPES } from "@/components/filters/AdvancedFilters";
import { useAdvancedFilters } from "@/components/filters/useAdvancedFilters";
import { useUndoAction } from "@/components/common/useUndoAction";

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
  propertyTypeLabels,
  statusLabels,
  statusColors,
  setSelectedPropertyForAI,
  setAiEnhancerOpen
}) {
  const handleSelect = useCallback((e) => {
    e.stopPropagation();
    onToggleSelect(property.id);
  }, [property.id, onToggleSelect]);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 group">
      <CardContent className="p-0">
        <div className="flex flex-col">
          <div className="relative h-48 overflow-hidden bg-slate-100">
            <img
              src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute top-2 left-2" onClick={(e) => {
              e.stopPropagation();
              handleSelect(e);
            }}>
              <div className="bg-white/90 backdrop-blur-sm rounded p-1">
                <Checkbox checked={isSelected} onCheckedChange={handleSelect} />
              </div>
            </div>
            {property.featured && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-amber-400 text-slate-900 border-0">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Destaque
                </Badge>
              </div>
            )}
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-slate-900/90 text-white border-0 font-bold">
                {property.currency === 'EUR' ? '€' : 
                 property.currency === 'USD' ? '$' :
                 property.currency === 'GBP' ? '£' :
                 property.currency === 'AED' ? 'د.إ' :
                 property.currency || '€'}{property.price?.toLocaleString()}
              </Badge>
            </div>
          </div>
          <div className="p-3" onClick={() => onEdit(property)} style={{ cursor: 'pointer' }}>
            <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1 text-sm">{property.title}</h3>
            <div className="flex items-center text-slate-600 mb-2 text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              <span className="line-clamp-1">
                {property.city}, {property.state}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2 text-xs text-slate-600">
              {property.bedrooms > 0 && <span>🛏️ T{property.bedrooms}</span>}
              {property.bathrooms > 0 && <span>🚿 {property.bathrooms}</span>}
              {property.useful_area > 0 && <span>📐 {property.useful_area}m²</span>}
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant="outline" className="text-xs">{propertyTypeLabels[property.property_type] || property.property_type}</Badge>
              <Badge variant="outline" className="text-xs">{property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}</Badge>
              <Badge className={`${statusColors[property.status]} text-xs`}>{statusLabels[property.status]}</Badge>
            </div>
            
            {/* Publication Status */}
            <div className="mb-2 pt-2 border-t border-slate-100">
              <div className="flex flex-col gap-1">
                {/* Portals */}
                {property.published_portals && property.published_portals.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {property.published_portals.slice(0, 2).map((portal, idx) => (
                        <span key={idx} className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {portal === 'idealista' ? 'Idealista' :
                           portal === 'imovirtual' ? 'Imovirtual' :
                           portal === 'casafari' ? 'Casafari' :
                           portal === 'olx' ? 'OLX' :
                           portal === 'supercasa' ? 'Supercasa' :
                           portal === 'custojusto' ? 'CustoJusto' : portal}
                        </span>
                      ))}
                      {property.published_portals.length > 2 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          +{property.published_portals.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500">Sem portais</span>
                  </div>
                )}
                
                {/* Website Pages */}
                {property.published_pages && property.published_pages.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {property.published_pages.map((page, idx) => {
                      const pageIcon = 
                        page === 'zugruppe' ? <Building2 className="w-3 h-3" /> :
                        page === 'zuhaus' ? <Home className="w-3 h-3" /> :
                        page === 'zuhandel' ? <Store className="w-3 h-3" /> :
                        page === 'homepage_featured' ? <Star className="w-3 h-3" /> :
                        page === 'investor_section' ? <TrendingUp className="w-3 h-3" /> :
                        page === 'luxury_collection' ? <Crown className="w-3 h-3" /> :
                        <ExternalLink className="w-3 h-3" />;
                      
                      const pageName = 
                        page === 'zugruppe' ? 'ZuGruppe' :
                        page === 'zuhaus' ? 'ZuHaus' :
                        page === 'zuhandel' ? 'ZuHandel' :
                        page === 'homepage_featured' ? 'Homepage' :
                        page === 'investor_section' ? 'Investidores' :
                        page === 'luxury_collection' ? 'Luxo' : page;
                      
                      return (
                        <span key={idx} className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                          {pageIcon}
                          {pageName}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500">Sem páginas web</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
              <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2"><Eye className="w-3 h-3 mr-1" />Ver</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => onEdit(property)} className="h-7 text-xs px-2"><Edit className="w-3 h-3 mr-1" />Editar</Button>
              <Button variant="outline" size="sm" onClick={() => onDuplicate(property)} className="h-7 text-xs px-2"><Copy className="w-3 h-3" /></Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPropertyForPublication(property);
                  setPublicationHubOpen(true);
                }}
                className="h-7 text-xs px-2 border-blue-300 text-blue-600"
                title="Central de Publicação"
              >
                <BarChart3 className="w-3 h-3" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPropertyForAI(property);
                  setAiEnhancerOpen(true);
                }}
                className="h-7 text-xs px-2 border-purple-300 text-purple-600"
              >
                <Sparkles className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(property.id)} className="h-7 text-xs px-2 text-red-600"><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function MyListings() {
  const queryClient = useQueryClient();
      const { executeWithUndo } = useUndoAction();
      const [selectedProperties, setSelectedProperties] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingNotes, setViewingNotes] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [activeTab, setActiveTab] = useState("properties");
  const [viewMode, setViewMode] = useState("cards");
    const [groupBy, setGroupBy] = useState("none");
  const [filterLogic, setFilterLogic] = useState("AND");
  const [assignDevelopmentOpen, setAssignDevelopmentOpen] = useState(false);
  const [selectedDevelopment, setSelectedDevelopment] = useState("");
  const [bulkPhotoDialogOpen, setBulkPhotoDialogOpen] = useState(false);
  const [bulkPublicationDialogOpen, setBulkPublicationDialogOpen] = useState(false);
  const [createDevelopmentDialogOpen, setCreateDevelopmentDialogOpen] = useState(false);
  const [assignAgentOpen, setAssignAgentOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [aiEnhancerOpen, setAiEnhancerOpen] = useState(false);
  const [selectedPropertyForAI, setSelectedPropertyForAI] = useState(null);
  const [publicationHubOpen, setPublicationHubOpen] = useState(false);
  const [selectedPropertyForPublication, setSelectedPropertyForPublication] = useState(null);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkVisibilityOpen, setBulkVisibilityOpen] = useState(false);
  const [bulkVisibility, setBulkVisibility] = useState("");
  const [assignConsultantOpen, setAssignConsultantOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState("");
  
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    property_type: "all",
    listing_type: "all",
    country: "all",
    price: {},
    tags: [],
    state: "all",
    city: "all",
    created_date: {},
    updated_date: {},
    featured: null,
    last_import: null
  });
  
  const ITEMS_PER_PAGE = viewMode === "cards" ? 40 : 30;

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // Buscar permissões do utilizador
  const { data: userPermissions } = useQuery({
    queryKey: ['myUserPermissions', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const perms = await base44.entities.UserPermission.filter({ user_email: user.email });
      return perms[0]?.permissions || null;
    },
    enabled: !!user?.email
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

  // Buscar agentes (combinar Users com entidade Agent)
  const { data: agents = [] } = useQuery({
    queryKey: ['allUsersForAssignment'],
    queryFn: async () => {
      // Buscar todos os Users primeiro
      const users = await base44.entities.User.list();
      const usersList = users.map(u => ({
        id: u.id,
        full_name: u.display_name || u.full_name || u.email,
        email: u.email,
        is_active: true,
        source: 'user'
      }));
      
      // Tentar buscar também da entidade Agent (pode falhar por RLS)
      try {
        const agentsList = await base44.entities.Agent.list('full_name');
        if (agentsList.length > 0) {
          // Combinar, evitando duplicados por email
          const userEmails = new Set(usersList.map(u => u.email));
          const uniqueAgents = agentsList
            .filter(a => !userEmails.has(a.email))
            .map(a => ({
              id: a.id,
              full_name: a.full_name,
              email: a.email,
              is_active: a.is_active !== false,
              source: 'agent'
            }));
          return [...usersList, ...uniqueAgents];
        }
      } catch (e) {
        // RLS pode bloquear - ignorar
      }
      
      return usersList;
    }
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['myProperties', user?.email, userPermissions],
    queryFn: async () => {
      if (!user) return [];
      const allProperties = await base44.entities.Property.list('-updated_date');
      
      const userType = user.user_type?.toLowerCase() || '';
      
      // Admin/Gestor vê todos os imóveis
      if (user.role === 'admin' || userType === 'admin' || userType === 'gestor') {
        return allProperties;
      }
      
      // Verifica permissão properties.view_all na entidade UserPermission
      if (userPermissions?.properties?.view_all === true) {
        return allProperties;
      }
      
      // Verifica permissão canViewAllProperties (fallback)
      if (userPermissions?.canViewAllProperties === true) {
        return allProperties;
      }
      
      // Verifica permissão no user.permissions (fallback)
      if (user.permissions?.canViewAllProperties === true) {
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
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
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

  const bulkAssignAgentMutation = useMutation({
    mutationFn: async ({ ids, agentId, agentName }) => {
      await Promise.all(ids.map(id => 
        base44.entities.Property.update(id, { 
          agent_id: agentId,
          agent_name: agentName
        })
      ));
    },
    onSuccess: (_, { ids, agentName }) => {
      toast.success(`${ids.length} imóveis atribuídos a "${agentName}"`);
      setSelectedProperties([]);
      setAssignAgentOpen(false);
      setSelectedAgent("");
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
    },
  });

  const bulkAssignConsultantMutation = useMutation({
    mutationFn: async ({ ids, consultantEmail, consultantName }) => {
      await Promise.all(ids.map(id => 
        base44.entities.Property.update(id, { 
          assigned_consultant: consultantEmail,
          assigned_consultant_name: consultantName
        })
      ));
    },
    onSuccess: (_, { ids, consultantName }) => {
      toast.success(`${ids.length} imóveis atribuídos a "${consultantName}"`);
      setSelectedProperties([]);
      setAssignConsultantOpen(false);
      setSelectedConsultant("");
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
    },
  });

  const bulkStatusChangeMutation = useMutation({
    mutationFn: async ({ ids, status }) => {
      await Promise.all(ids.map(id => 
        base44.entities.Property.update(id, { status })
      ));
    },
    onSuccess: (_, { ids, status }) => {
      toast.success(`${ids.length} imóveis marcados como "${statusLabels[status]}"`);
      setSelectedProperties([]);
      setBulkStatusOpen(false);
      setBulkStatus("");
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
    },
  });

  const bulkVisibilityChangeMutation = useMutation({
    mutationFn: async ({ ids, visibility }) => {
      await Promise.all(ids.map(id => 
        base44.entities.Property.update(id, { visibility })
      ));
    },
    onSuccess: (_, { ids, visibility }) => {
      const visibilityLabels = {
        public: "Público",
        team_only: "Apenas Equipa",
        private: "Privado"
      };
      toast.success(`${ids.length} imóveis com visibilidade alterada para "${visibilityLabels[visibility]}"`);
      setSelectedProperties([]);
      setBulkVisibilityOpen(false);
      setBulkVisibility("");
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

  const handleDelete = useCallback(async (id) => {
        const propertyToDelete = properties.find(p => p.id === id);
        if (!propertyToDelete) return;

        // Store property data for potential undo
        const propertyData = { ...propertyToDelete };
        delete propertyData.id;
        delete propertyData.created_date;
        delete propertyData.updated_date;

        executeWithUndo({
          action: () => deleteMutation.mutate(id),
          undoAction: async () => {
            await base44.entities.Property.create(propertyData);
            queryClient.invalidateQueries({ queryKey: ['myProperties'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          },
          successMessage: "Imóvel eliminado",
          undoMessage: "Imóvel restaurado"
        });
      }, [deleteMutation, properties, executeWithUndo, queryClient]);

  const handleBulkDelete = useCallback(() => {
        const propertiesToDelete = properties.filter(p => selectedProperties.includes(p.id));
        const propertiesData = propertiesToDelete.map(p => {
          const data = { ...p };
          delete data.id;
          delete data.created_date;
          delete data.updated_date;
          return data;
        });

        executeWithUndo({
          action: () => bulkDeleteMutation.mutate(selectedProperties),
          undoAction: async () => {
            await base44.entities.Property.bulkCreate(propertiesData);
            queryClient.invalidateQueries({ queryKey: ['myProperties'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          },
          successMessage: `${selectedProperties.length} imóveis eliminados`,
          undoMessage: `${selectedProperties.length} imóveis restaurados`
        });
      }, [selectedProperties, bulkDeleteMutation, properties, executeWithUndo, queryClient]);

  const statusLabelsMap = useMemo(() => ({
    active: "Ativo",
    pending: "Pendente", 
    sold: "Vendido",
    rented: "Arrendado",
    off_market: "Desativado"
  }), []);

  const handleStatusChange = useCallback(async (propertyId, newStatus) => {
        const property = properties.find(p => p.id === propertyId);
        const previousStatus = property?.status;

        executeWithUndo({
          action: async () => {
            await base44.entities.Property.update(propertyId, { status: newStatus });
            queryClient.invalidateQueries({ queryKey: ['myProperties'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          },
          undoAction: async () => {
            await base44.entities.Property.update(propertyId, { status: previousStatus });
            queryClient.invalidateQueries({ queryKey: ['myProperties'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          },
          successMessage: `Estado alterado para "${statusLabelsMap[newStatus]}"`,
          undoMessage: `Estado revertido para "${statusLabelsMap[previousStatus]}"`
        });
      }, [queryClient, statusLabelsMap, properties, executeWithUndo]);

  const handleToggleFeatured = useCallback((property) => {
        const wasFeatured = property.featured;

        executeWithUndo({
          action: () => updatePropertyMutation.mutate({ id: property.id, data: { featured: !wasFeatured } }),
          undoAction: async () => {
            await base44.entities.Property.update(property.id, { featured: wasFeatured });
            queryClient.invalidateQueries({ queryKey: ['myProperties'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
          },
          successMessage: wasFeatured ? "Removido dos destaques" : "Marcado como destaque",
          undoMessage: wasFeatured ? "Restaurado como destaque" : "Removido dos destaques"
        });
      }, [updatePropertyMutation, executeWithUndo, queryClient]);

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
    created_by: {
      type: FILTER_TYPES.text,
      label: "Criado Por",
      field: "created_by",
      advanced: true
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
    country: {
      type: FILTER_TYPES.select,
      label: "País",
      field: "country",
      options: [
        { value: "Portugal", label: "🇵🇹 Portugal" },
        { value: "Spain", label: "🇪🇸 Espanha" },
        { value: "France", label: "🇫🇷 França" },
        { value: "United Kingdom", label: "🇬🇧 Reino Unido" },
        { value: "United Arab Emirates", label: "🇦🇪 Emirados Árabes" },
        { value: "United States", label: "🇺🇸 Estados Unidos" },
        { value: "Brazil", label: "🇧🇷 Brasil" },
        { value: "Angola", label: "🇦🇴 Angola" }
      ]
    },
    price: {
      type: FILTER_TYPES.numberRange,
      label: "Preço",
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
    },
    last_import: {
      type: FILTER_TYPES.boolean,
      label: "Última Importação",
      field: "last_import",
      trueLabel: "Sim",
      falseLabel: "Não",
      advanced: true,
      customFilter: true
    }
  }), [allStates, allCities, propertyTags]);
  
  // Calcular data/hora da última importação (imóveis com source_url)
  const lastImportTimestamp = useMemo(() => {
    const importedProperties = properties.filter(p => p.source_url);
    if (importedProperties.length === 0) return null;
    
    // Agrupar por minuto de criação para identificar lotes de importação
    const sortedByDate = [...importedProperties].sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
    
    if (sortedByDate.length === 0) return null;
    
    // Pegar a data mais recente
    const latestDate = new Date(sortedByDate[0].created_date);
    // Considerar como "mesma importação" tudo criado nos últimos 5 minutos da última importação
    return new Date(latestDate.getTime() - 5 * 60 * 1000);
  }, [properties]);

  // Aplicar filtros avançados
  const baseFilteredProperties = useAdvancedFilters(properties, filters, filterConfig, filterLogic);
  
  // Aplicar filtro de última importação manualmente
  const filteredProperties = useMemo(() => {
    // Verificar se filtro está ativo (pode ser true ou "true")
    const isLastImportActive = filters.last_import === true || filters.last_import === "true";
    
    if (!isLastImportActive || !lastImportTimestamp) {
      return baseFilteredProperties;
    }
    
    return baseFilteredProperties.filter(p => {
      if (!p.source_url) return false;
      const createdDate = new Date(p.created_date);
      return createdDate >= lastImportTimestamp;
    });
  }, [baseFilteredProperties, filters.last_import, lastImportTimestamp]);

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
  
  // Reset to page 1 when filters change - use stringified version to prevent infinite loops
  const filtersString = JSON.stringify(filters);
  useEffect(() => { 
    setCurrentPage(1); 
  }, [filtersString]);

  // Reset city filter when state changes
  const prevStateRef = React.useRef(filters.state);
  useEffect(() => {
    if (prevStateRef.current !== filters.state && filters.state !== "all" && filters.city !== "all") {
      setFilters(prev => ({ ...prev, city: "all" }));
    }
    prevStateRef.current = filters.state;
  }, [filters.state, filters.city]);

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
            {(user?.role === 'admin' || user?.user_type?.toLowerCase() === 'admin' || user?.user_type?.toLowerCase() === 'gestor') && (
              <TabsTrigger value="byAgent" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Por Agente</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {activeTab === "developments" ? (
          <DevelopmentsTab />
        ) : activeTab === "byAgent" ? (
          <PropertiesByAgentView />
        ) : (
        <>
        {/* Quick Filters */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={filters.created_by === user?.email ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (filters.created_by === user?.email) {
                // Remove filter
                const { created_by, ...rest } = filters;
                setFilters(rest);
              } else {
                // Add filter
                setFilters(prev => ({ ...prev, created_by: user?.email }));
              }
            }}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Apenas os Meus Imóveis
          </Button>
        </div>

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
                  <Popover open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white">
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Alterar Estado
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="end">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-900">Alterar estado para:</p>
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar estado..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">✅ Ativo</SelectItem>
                            <SelectItem value="pending">⏳ Pendente</SelectItem>
                            <SelectItem value="sold">💰 Vendido</SelectItem>
                            <SelectItem value="rented">🔑 Arrendado</SelectItem>
                            <SelectItem value="off_market">⛔ Desativado</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setBulkStatusOpen(false);
                              setBulkStatus("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            disabled={!bulkStatus || bulkStatusChangeMutation.isPending}
                            onClick={() => {
                              bulkStatusChangeMutation.mutate({
                                ids: selectedProperties,
                                status: bulkStatus
                              });
                            }}
                          >
                            {bulkStatusChangeMutation.isPending ? "A alterar..." : "Aplicar"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={bulkVisibilityOpen} onOpenChange={setBulkVisibilityOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white">
                        <Eye className="w-4 h-4 mr-2" />
                        Alterar Visibilidade
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="end">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-900">Alterar visibilidade para:</p>
                        <Select value={bulkVisibility} onValueChange={setBulkVisibility}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar visibilidade..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">🌐 Público</SelectItem>
                            <SelectItem value="team_only">👥 Apenas Equipa</SelectItem>
                            <SelectItem value="private">🔒 Privado</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setBulkVisibilityOpen(false);
                              setBulkVisibility("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            disabled={!bulkVisibility || bulkVisibilityChangeMutation.isPending}
                            onClick={() => {
                              bulkVisibilityChangeMutation.mutate({
                                ids: selectedProperties,
                                visibility: bulkVisibility
                              });
                            }}
                          >
                            {bulkVisibilityChangeMutation.isPending ? "A alterar..." : "Aplicar"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={assignConsultantOpen} onOpenChange={setAssignConsultantOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white">
                        <Users className="w-4 h-4 mr-2" />
                        Atribuir Consultor
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="end">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-900">Selecionar Consultor</p>
                        <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolher consultor..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {agents.filter(a => a.is_active !== false).map((agent) => (
                              <SelectItem key={agent.id} value={agent.email}>
                                {agent.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setAssignConsultantOpen(false);
                              setSelectedConsultant("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            disabled={!selectedConsultant || bulkAssignConsultantMutation.isPending}
                            onClick={() => {
                              const consultant = agents.find(a => a.email === selectedConsultant);
                              bulkAssignConsultantMutation.mutate({
                                ids: selectedProperties,
                                consultantEmail: selectedConsultant === "none" ? null : selectedConsultant,
                                consultantName: selectedConsultant === "none" ? null : consultant?.full_name
                              });
                            }}
                          >
                            {bulkAssignConsultantMutation.isPending ? "A atribuir..." : "Atribuir"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

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
                  <Button variant="outline" size="sm" className="bg-white" onClick={() => setBulkPhotoDialogOpen(true)}>
                    <Image className="w-4 h-4 mr-2" />
                    Aplicar Fotos
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white" onClick={() => setBulkPublicationDialogOpen(true)}>
                    <Globe className="w-4 h-4 mr-2" />
                    Gerir Publicação
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white" onClick={() => setCreateDevelopmentDialogOpen(true)}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Criar Empreendimento
                  </Button>
                  <Popover open={assignAgentOpen} onOpenChange={setAssignAgentOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white">
                        <Users className="w-4 h-4 mr-2" />
                        Atribuir Agente
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="end">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-900">Selecionar Agente</p>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolher agente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.filter(a => a.is_active !== false).map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setAssignAgentOpen(false);
                              setSelectedAgent("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            disabled={!selectedAgent || bulkAssignAgentMutation.isPending}
                            onClick={() => {
                              const agent = agents.find(a => a.id === selectedAgent);
                              if (agent) {
                                bulkAssignAgentMutation.mutate({
                                  ids: selectedProperties,
                                  agentId: agent.id,
                                  agentName: agent.full_name
                                });
                              }
                            }}
                          >
                            {bulkAssignAgentMutation.isPending ? "A atribuir..." : "Atribuir"}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover open={assignDevelopmentOpen} onOpenChange={setAssignDevelopmentOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white">
                        <Building2 className="w-4 h-4 mr-2" />
                        Atribuir Empreendimento
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="end">
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-900">Selecionar Empreendimento</p>
                        <Select value={selectedDevelopment} onValueChange={setSelectedDevelopment}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolher empreendimento..." />
                          </SelectTrigger>
                          <SelectContent>
                            {developments.map((dev) => (
                              <SelectItem key={dev.id} value={dev.id}>
                                {dev.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setAssignDevelopmentOpen(false);
                              setSelectedDevelopment("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1"
                            disabled={!selectedDevelopment || bulkAssignDevelopmentMutation.isPending}
                            onClick={() => {
                              const dev = developments.find(d => d.id === selectedDevelopment);
                              if (dev) {
                                bulkAssignDevelopmentMutation.mutate({
                                  ids: selectedProperties,
                                  developmentId: dev.id,
                                  developmentName: dev.name
                                });
                              }
                            }}
                          >
                            {bulkAssignDevelopmentMutation.isPending ? "A atribuir..." : "Atribuir"}
                          </Button>
                        </div>
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
                                          title="Vista Tabela"
                                        >
                                          <List className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant={viewMode === "cards" ? "default" : "ghost"}
                                          size="sm"
                                          onClick={() => setViewMode("cards")}
                                          className="rounded-none"
                                          title="Vista Cards"
                                        >
                                          <LayoutGrid className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant={viewMode === "grouped" ? "default" : "ghost"}
                                          size="sm"
                                          onClick={() => setViewMode("grouped")}
                                          className="rounded-none"
                                          title="Vista Agrupada"
                                        >
                                          <Layers className="w-4 h-4" />
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
                              ) : viewMode === "grouped" ? (
                                <GroupedPropertiesView
                                  properties={filteredProperties}
                                  selectedProperties={selectedProperties}
                                  onToggleSelect={toggleSelect}
                                  onEdit={setEditingProperty}
                                  onStatusChange={handleStatusChange}
                                  onToggleFeatured={handleToggleFeatured}
                                  onDuplicate={handleDuplicate}
                                  onDelete={handleDelete}
                                  groupBy={groupBy}
                                  onGroupByChange={setGroupBy}
                                />
                              ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  statusLabels={statusLabels}
                  statusColors={statusColors}
                  setSelectedPropertyForAI={setSelectedPropertyForAI}
                  setAiEnhancerOpen={setAiEnhancerOpen}
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

        {/* Bulk Photo Assign Dialog */}
        <BulkPhotoAssign
          open={bulkPhotoDialogOpen}
          onOpenChange={setBulkPhotoDialogOpen}
          selectedPropertyIds={selectedProperties}
        />

        {/* Bulk Publication Dialog */}
        <BulkPublicationDialog
          open={bulkPublicationDialogOpen}
          onOpenChange={setBulkPublicationDialogOpen}
          selectedPropertyIds={selectedProperties}
          properties={properties}
        />

        {/* Create Development from Properties Dialog */}
        <CreateDevelopmentFromProperties
          open={createDevelopmentDialogOpen}
          onOpenChange={setCreateDevelopmentDialogOpen}
          selectedPropertyIds={selectedProperties}
          onSuccess={() => {
            setSelectedProperties([]);
            setActiveTab("developments");
          }}
        />

        {/* AI Property Enhancer Dialog */}
        <AIPropertyEnhancer
          open={aiEnhancerOpen}
          onOpenChange={setAiEnhancerOpen}
          property={selectedPropertyForAI}
        />

        {/* Publication Hub Dialog */}
        <Dialog open={publicationHubOpen} onOpenChange={setPublicationHubOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <PublicationHub
              property={selectedPropertyForPublication}
              open={publicationHubOpen}
              onOpenChange={setPublicationHubOpen}
            />
          </DialogContent>
        </Dialog>
        </>
        )}
      </div>
    </div>
  );
}