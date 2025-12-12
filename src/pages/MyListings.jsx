import React, { useMemo, useCallback, useState, useEffect, memo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Trash2, Eye, MapPin, ExternalLink, Hash, CheckSquare, Filter, X, FileText, Edit, Star, Copy, Building2, LayoutGrid, List, Tag, Users, Image, Layers, Globe, BarChart3, Calendar, Home, Store, TrendingUp, Crown, Wand2, Navigation } from "lucide-react";
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
import VisitRouteGenerator from "../components/visits/VisitRouteGenerator";
import PublicationHub from "../components/publication/PublicationHub";
import MarketingPlanGenerator from "../components/marketing/MarketingPlanGenerator";
import BulkActionsBar from "../components/listings/BulkActionsBar";
import AdvancedFilters, { FILTER_TYPES } from "@/components/filters/AdvancedFilters";
import { useAdvancedFilters } from "@/components/filters/useAdvancedFilters";
import { useUndoAction } from "@/components/common/useUndoAction";
import { useAuditLog } from "../components/audit/useAuditLog";
import OptimizedImage from "../components/common/OptimizedImage";
import { QUERY_CONFIG } from "../components/utils/queryClient";
import { Home as HomeIcon } from "lucide-react";
import QuickFilterBadges from "../components/listings/QuickFilterBadges";

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
  const handleSelect = useCallback(() => {
    onToggleSelect(property.id);
  }, [property.id, onToggleSelect]);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 group h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="flex flex-col flex-1">
          <div className="relative h-44 sm:h-48 overflow-hidden bg-slate-100">
            <img
              src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400";
              }}
            />
            <div 
              className="absolute top-2 left-2 z-10 cursor-pointer touch-manipulation active:scale-95" 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSelect();
              }}
            >
              <div className="bg-white/95 backdrop-blur-sm rounded p-2 shadow-sm hover:shadow-md transition-shadow">
                <Checkbox 
                  checked={isSelected} 
                  onCheckedChange={handleSelect}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5"
                />
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
          <div className="p-3 flex-1 flex flex-col" onClick={() => onEdit(property)} style={{ cursor: 'pointer' }}>
            <h3 className="font-semibold text-slate-900 line-clamp-2 mb-1 text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]">{property.title}</h3>
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
            <div className="flex flex-wrap gap-1 mb-2 text-xs">
              <Badge variant="outline" className="text-[10px] sm:text-xs">{propertyTypeLabels[property.property_type] || property.property_type}</Badge>
              <Badge variant="outline" className="text-[10px] sm:text-xs">{property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}</Badge>
              <Badge className={`${statusColors[property.status]} text-[10px] sm:text-xs`}>{statusLabels[property.status]}</Badge>
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
            <div className="flex flex-wrap gap-1 pt-2 border-t mt-auto" onClick={(e) => e.stopPropagation()}>
              <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
                <Button variant="outline" size="sm" className="h-8 text-[10px] sm:text-xs px-2 touch-manipulation active:scale-95"><Eye className="w-3 h-3 mr-1" />Ver</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => onEdit(property)} className="h-8 text-[10px] sm:text-xs px-2 touch-manipulation active:scale-95"><Edit className="w-3 h-3 mr-1" />Editar</Button>
              <Button variant="outline" size="sm" onClick={() => onDuplicate(property)} className="h-8 text-[10px] sm:text-xs px-2 touch-manipulation active:scale-95"><Copy className="w-3 h-3" /></Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPropertyForPublication(property);
                  setPublicationHubOpen(true);
                }}
                className="h-8 text-[10px] sm:text-xs px-2 border-blue-300 text-blue-600 touch-manipulation active:scale-95"
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
                className="h-8 text-[10px] sm:text-xs px-2 border-purple-300 text-purple-600 touch-manipulation active:scale-95"
              >
                <Wand2 className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(property.id)} className="h-8 text-[10px] sm:text-xs px-2 text-red-600 touch-manipulation active:scale-95"><Trash2 className="w-3 h-3" /></Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPropertyForPlan(property);
                  setMarketingPlanOpen(true);
                }}
                className="h-8 text-[10px] sm:text-xs px-2 border-green-300 text-green-600 touch-manipulation active:scale-95"
                title="Plano de Marketing"
              >
                <FileText className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function MyListings() {
  // Auth check - redirect to login if not authenticated
  React.useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      }
    });
  }, []);

  const queryClient = useQueryClient();
  const { executeWithUndo } = useUndoAction();
  const { logAction } = useAuditLog();
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingNotes, setViewingNotes] = useState(null);
  const [editingProperty, setEditingProperty] = useState(null);
  const [activeTab, setActiveTab] = useState("properties");
  const [viewMode, setViewMode] = useState("cards");
  const [groupBy, setGroupBy] = useState("none");
  const [sortBy, setSortBy] = useState("updated_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterLogic, setFilterLogic] = useState("AND");
  const [assignDevelopmentOpen, setAssignDevelopmentOpen] = useState(false);
  const [selectedDevelopment, setSelectedDevelopment] = useState("");
  const [bulkPhotoDialogOpen, setBulkPhotoDialogOpen] = useState(false);
  const [bulkPublicationDialogOpen, setBulkPublicationDialogOpen] = useState(false);
  const [createDevelopmentDialogOpen, setCreateDevelopmentDialogOpen] = useState(false);

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
  const [visitRouteOpen, setVisitRouteOpen] = useState(false);
  const [marketingPlanOpen, setMarketingPlanOpen] = useState(false);
  const [selectedPropertyForPlan, setSelectedPropertyForPlan] = useState(null);
  
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
    last_import: null,
    bedrooms: "all",
    useful_area: {},
    availability_status: "all",
    assigned_consultant: "all",
    development_id: "all",
    has_images: null,
    has_energy_certificate: null,
    published_portals: [],
    published_pages: [],
    visibility: "all"
  });
  
  const ITEMS_PER_PAGE = viewMode === "cards" ? 40 : 30;

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
    ...QUERY_CONFIG.user
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
    queryFn: () => base44.entities.Tag.list('name'),
    ...QUERY_CONFIG.static
  });

  // Filtrar apenas tags de imóveis ou gerais
  const propertyTags = React.useMemo(() => {
    return systemTags.filter(t => t.category === 'property' || t.category === 'general');
  }, [systemTags]);

  // Buscar empreendimentos
  const { data: developments = [] } = useQuery({
    queryKey: ['developments'],
    queryFn: () => base44.entities.Development.list('name'),
    ...QUERY_CONFIG.properties
  });

  // Buscar consultores
  const { data: consultants = [] } = useQuery({
    queryKey: ['allConsultantsForAssignment'],
    queryFn: async () => {
      // Buscar todos os Users
      const users = await base44.entities.User.list();
      return users.map(u => ({
        id: u.id,
        full_name: u.display_name || u.full_name || u.email,
        display_name: u.display_name || u.full_name,
        email: u.email,
        phone: u.phone,
        photo_url: u.photo_url,
        is_active: u.is_active !== false,
        user_type: u.user_type
      }));
    },
    ...QUERY_CONFIG.agents
  });

  // Fetch total count for metadata
  const { data: propertiesMetadata } = useQuery({
    queryKey: ['myPropertiesCount', user?.email, userPermissions],
    queryFn: async () => {
      if (!user) return { total: 0, canViewAll: false };
      
      const userType = user.user_type?.toLowerCase() || '';
      const canViewAll = user.role === 'admin' || userType === 'admin' || userType === 'gestor' ||
                          userPermissions?.properties?.view_all === true ||
                          userPermissions?.canViewAllProperties === true ||
                          user.permissions?.canViewAllProperties === true;
      
      // Fetch a sample to get count (Base44 returns total count in metadata)
      const sample = await base44.entities.Property.list('-updated_date', 1);
      return { total: sample.length > 0 ? 1000 : 0, canViewAll }; // Placeholder - we'll fetch all for filtering
    },
    enabled: !!user,
    ...QUERY_CONFIG.properties
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['myProperties', user?.email, userPermissions, currentPage, filters],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch all properties for client-side filtering (Base44 doesn't support complex server filters)
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
      
      // Consultores vêem imóveis que criaram OU que lhes estão atribuídos
      return allProperties.filter(p => 
        p.created_by === user.email || 
        p.assigned_consultant === user.email
      );
    },
    enabled: !!user,
    ...QUERY_CONFIG.properties
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Property.delete(id),
    onSuccess: async (_, deletedId) => {
      const deleted = properties.find(p => p.id === deletedId);
      await logAction('delete', 'Property', deletedId, deleted?.title);
      
      toast.success("Anúncio eliminado");
      queryClient.invalidateQueries({ queryKey: ['myProperties', 'properties'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Property.delete(id)));
    },
    onSuccess: async (_, ids) => {
      const propertyTitles = ids.map(id => properties.find(p => p.id === id)?.title).filter(Boolean);
      await logAction('bulk_action', 'Property', null, null, {
        action: 'delete',
        count: ids.length,
        items: propertyTitles.slice(0, 10)
      });
      
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

  const bulkToggleFeaturedMutation = useMutation({
    mutationFn: async ({ ids, featured }) => {
      await Promise.all(ids.map(id => 
        base44.entities.Property.update(id, { featured })
      ));
    },
    onSuccess: (_, { ids, featured }) => {
      toast.success(`${ids.length} imóveis ${featured ? 'marcados como' : 'removidos dos'} destaques`);
      setSelectedProperties([]);
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
        if (!window.confirm(`Tem a certeza que deseja eliminar ${selectedProperties.length} imóve${selectedProperties.length > 1 ? 'is' : 'l'}?`)) {
          return;
        }

        if (!window.confirm(`⚠️ CONFIRMA A ELIMINAÇÃO?\n\nEsta ação vai eliminar permanentemente ${selectedProperties.length} imóve${selectedProperties.length > 1 ? 'is' : 'l'}.\n\nClique em OK para confirmar.`)) {
          return;
        }

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

  // Extrair valores únicos para filtros dinâmicos
  const uniqueConsultants = useMemo(() => {
    const consultants = new Set();
    properties.forEach(p => {
      if (p.assigned_consultant) consultants.add(p.assigned_consultant);
    });
    return Array.from(consultants);
  }, [properties]);

  const uniqueDevelopments = useMemo(() => {
    const devs = new Map();
    properties.forEach(p => {
      if (p.development_id && p.development_name) {
        devs.set(p.development_id, p.development_name);
      }
    });
    return Array.from(devs.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [properties]);

  const uniquePortals = useMemo(() => {
    const portals = new Set();
    properties.forEach(p => {
      if (p.published_portals) {
        p.published_portals.forEach(portal => portals.add(portal));
      }
    });
    return Array.from(portals).sort();
  }, [properties]);

  const uniquePages = useMemo(() => {
    const pages = new Set();
    properties.forEach(p => {
      if (p.published_pages) {
        p.published_pages.forEach(page => pages.add(page));
      }
    });
    return Array.from(pages).sort();
  }, [properties]);

  // Configuração dos filtros avançados - memoized
  const filterConfig = useMemo(() => ({
    search: {
      type: FILTER_TYPES.text,
      label: "Pesquisar",
      placeholder: "Título, cidade, morada, ref...",
      searchFields: ["title", "city", "address", "ref_id", "description"]
    },
    status: {
      type: FILTER_TYPES.select,
      label: "Estado",
      field: "status",
      options: [
        { value: "active", label: "✅ Ativo" },
        { value: "pending", label: "⏳ Pendente" },
        { value: "sold", label: "💰 Vendido" },
        { value: "rented", label: "🔑 Arrendado" },
        { value: "off_market", label: "⛔ Desativado" }
      ]
    },
    availability_status: {
      type: FILTER_TYPES.select,
      label: "Disponibilidade",
      field: "availability_status",
      options: [
        { value: "available", label: "Disponível" },
        { value: "sold", label: "Vendido" },
        { value: "reserved", label: "Reservado" },
        { value: "rented", label: "Arrendado" },
        { value: "prospecting", label: "Em Prospecção" },
        { value: "withdrawn", label: "Retirado" },
        { value: "pending_validation", label: "Por Validar" }
      ],
      advanced: true
    },
    property_type: {
      type: FILTER_TYPES.select,
      label: "Tipo",
      field: "property_type",
      options: [
        { value: "house", label: "🏠 Moradia" },
        { value: "apartment", label: "🏢 Apartamento" },
        { value: "condo", label: "🏘️ Condomínio" },
        { value: "townhouse", label: "🏡 Casa Geminada" },
        { value: "building", label: "🏛️ Prédio" },
        { value: "land", label: "🌾 Terreno" },
        { value: "commercial", label: "💼 Comercial" },
        { value: "warehouse", label: "🏭 Armazém" },
        { value: "office", label: "🏢 Escritório" },
        { value: "store", label: "🏪 Loja" },
        { value: "farm", label: "🌳 Quinta" }
      ]
    },
    listing_type: {
      type: FILTER_TYPES.select,
      label: "Negócio",
      field: "listing_type",
      options: [
        { value: "sale", label: "Venda" },
        { value: "rent", label: "Arrendamento" }
      ]
    },
    bedrooms: {
      type: FILTER_TYPES.select,
      label: "Quartos",
      field: "bedrooms",
      options: [
        { value: "0", label: "T0" },
        { value: "1", label: "T1" },
        { value: "2", label: "T2" },
        { value: "3", label: "T3" },
        { value: "4", label: "T4" },
        { value: "5", label: "T5" },
        { value: "6+", label: "T6+" }
      ],
      customFilter: true
    },
    price: {
      type: FILTER_TYPES.numberRange,
      label: "Preço",
      field: "price",
      prefix: "€"
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
      ],
      advanced: true
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
    useful_area: {
      type: FILTER_TYPES.numberRange,
      label: "Área Útil (m²)",
      field: "useful_area",
      suffix: "m²",
      advanced: true
    },
    assigned_consultant: {
      type: FILTER_TYPES.select,
      label: "Consultor",
      field: "assigned_consultant",
      options: [
        { value: "unassigned", label: "Sem consultor" },
        ...uniqueConsultants.map(c => {
          const consultant = consultants.find(cons => cons.email === c);
          return { value: c, label: consultant?.full_name || c };
        })
      ],
      advanced: true,
      customFilter: true
    },
    development_id: {
      type: FILTER_TYPES.select,
      label: "Empreendimento",
      field: "development_id",
      options: [
        { value: "none", label: "Sem empreendimento" },
        ...uniqueDevelopments
      ],
      advanced: true,
      customFilter: true
    },
    tags: {
      type: FILTER_TYPES.multiSelect,
      label: "Etiquetas",
      field: "tags",
      options: propertyTags.map(t => ({ value: t.name, label: t.name })),
      advanced: true
    },
    published_portals: {
      type: FILTER_TYPES.multiSelect,
      label: "Publicado em Portais",
      field: "published_portals",
      options: uniquePortals.map(p => ({ 
        value: p, 
        label: p === 'idealista' ? 'Idealista' :
               p === 'imovirtual' ? 'Imovirtual' :
               p === 'casafari' ? 'Casafari' :
               p === 'olx' ? 'OLX' :
               p === 'supercasa' ? 'Supercasa' : p
      })),
      advanced: true,
      customFilter: true
    },
    published_pages: {
      type: FILTER_TYPES.multiSelect,
      label: "Publicado no Website",
      field: "published_pages",
      options: uniquePages.map(p => ({ 
        value: p, 
        label: p === 'zugruppe' ? 'ZuGruppe' :
               p === 'zuhaus' ? 'ZuHaus' :
               p === 'zuhandel' ? 'ZuHandel' :
               p === 'investor_section' ? 'Investidores' : p
      })),
      advanced: true,
      customFilter: true
    },
    visibility: {
      type: FILTER_TYPES.select,
      label: "Visibilidade",
      field: "visibility",
      options: [
        { value: "public", label: "🌐 Público" },
        { value: "team_only", label: "👥 Apenas Equipa" },
        { value: "private", label: "🔒 Privado" }
      ],
      advanced: true
    },
    has_images: {
      type: FILTER_TYPES.boolean,
      label: "Com Imagens",
      field: "has_images",
      trueLabel: "Sim",
      falseLabel: "Não",
      advanced: true,
      customFilter: true
    },
    has_energy_certificate: {
      type: FILTER_TYPES.boolean,
      label: "Com Cert. Energético",
      field: "has_energy_certificate",
      trueLabel: "Sim",
      falseLabel: "Não",
      advanced: true,
      customFilter: true
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
    },
    created_by: {
      type: FILTER_TYPES.text,
      label: "Criado Por",
      field: "created_by",
      advanced: true
    }
  }), [allStates, allCities, propertyTags, uniqueConsultants, uniqueDevelopments, uniquePortals, uniquePages, consultants]);
  
  // Calcular data/hora da última importação (imóveis com source_url)
  const lastImportTimestamp = useMemo(() => {
    const importedProperties = properties.filter(p => p.source_url && p.created_date);
    if (importedProperties.length === 0) return null;
    
    // Agrupar por minuto de criação para identificar lotes de importação
    const sortedByDate = [...importedProperties].sort((a, b) => {
      const dateA = new Date(a.created_date);
      const dateB = new Date(b.created_date);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
      return dateB - dateA;
    });
    
    if (sortedByDate.length === 0 || !sortedByDate[0].created_date) return null;
    
    // Pegar a data mais recente
    const latestDate = new Date(sortedByDate[0].created_date);
    if (isNaN(latestDate.getTime())) return null;
    
    // Considerar como "mesma importação" tudo criado nos últimos 5 minutos da última importação
    return new Date(latestDate.getTime() - 5 * 60 * 1000);
  }, [properties]);

  // Aplicar filtros avançados
  const baseFilteredProperties = useAdvancedFilters(properties, filters, filterConfig, filterLogic);
  
  // Aplicar filtros customizados e ordenação
  const filteredProperties = useMemo(() => {
    let filtered = baseFilteredProperties;
    
    // Filtro de última importação
    const isLastImportActive = filters.last_import === true || filters.last_import === "true";
    if (isLastImportActive && lastImportTimestamp) {
      filtered = filtered.filter(p => {
        if (!p.source_url || !p.created_date) return false;
        const createdDate = new Date(p.created_date);
        if (isNaN(createdDate.getTime())) return false;
        return createdDate >= lastImportTimestamp;
      });
    }
    
    // Filtro de quartos
    if (filters.bedrooms && filters.bedrooms !== "all") {
      filtered = filtered.filter(p => {
        if (filters.bedrooms === "6+") {
          return p.bedrooms >= 6;
        }
        return String(p.bedrooms) === filters.bedrooms;
      });
    }
    
    // Filtro de consultor
    if (filters.assigned_consultant && filters.assigned_consultant !== "all") {
      if (filters.assigned_consultant === "unassigned" || filters.assigned_consultant === "none") {
        filtered = filtered.filter(p => !p.assigned_consultant || p.assigned_consultant === "");
      } else {
        filtered = filtered.filter(p => p.assigned_consultant === filters.assigned_consultant);
      }
    }
    
    // Filtro de empreendimento
    if (filters.development_id && filters.development_id !== "all") {
      if (filters.development_id === "none") {
        filtered = filtered.filter(p => !p.development_id);
      } else {
        filtered = filtered.filter(p => p.development_id === filters.development_id);
      }
    }
    
    // Filtro de imagens
    const hasImagesFilter = filters.has_images === true || filters.has_images === "true";
    const noImagesFilter = filters.has_images === false || filters.has_images === "false";
    if (hasImagesFilter) {
      filtered = filtered.filter(p => p.images && p.images.length > 0);
    } else if (noImagesFilter) {
      filtered = filtered.filter(p => !p.images || p.images.length === 0);
    }
    
    // Filtro de certificado energético
    const hasCertFilter = filters.has_energy_certificate === true || filters.has_energy_certificate === "true";
    const noCertFilter = filters.has_energy_certificate === false || filters.has_energy_certificate === "false";
    if (hasCertFilter) {
      filtered = filtered.filter(p => p.energy_certificate && p.energy_certificate !== "isento");
    } else if (noCertFilter) {
      filtered = filtered.filter(p => !p.energy_certificate || p.energy_certificate === "isento");
    }
    
    // Filtro de portais publicados (multi-select)
    if (filters.published_portals && filters.published_portals.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.published_portals || p.published_portals.length === 0) return false;
        return filters.published_portals.some(portal => p.published_portals.includes(portal));
      });
    }
    
    // Filtro de páginas publicadas (multi-select)
    if (filters.published_pages && filters.published_pages.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.published_pages || p.published_pages.length === 0) return false;
        return filters.published_pages.some(page => p.published_pages.includes(page));
      });
    }
    
    // Aplicar ordenação
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case "created_date":
            aVal = new Date(a.created_date);
            bVal = new Date(b.created_date);
            break;
          case "updated_date":
            aVal = new Date(a.updated_date);
            bVal = new Date(b.updated_date);
            break;
          case "price":
            aVal = a.price || 0;
            bVal = b.price || 0;
            break;
          case "featured":
            aVal = a.featured ? 1 : 0;
            bVal = b.featured ? 1 : 0;
            break;
          case "title":
            aVal = (a.title || "").toLowerCase();
            bVal = (b.title || "").toLowerCase();
            break;
          default:
            return 0;
        }
        
        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }
    
    return filtered;
  }, [baseFilteredProperties, filters, lastImportTimestamp, sortBy, sortOrder]);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-4 sm:py-8 pb-24 sm:pb-8">
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
              <TabsTrigger value="byConsultant" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-initial">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Por Consultor</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {activeTab === "developments" ? (
          <DevelopmentsTab />
        ) : activeTab === "byConsultant" ? (
          <PropertiesByAgentView />
        ) : (
        <>
        {/* Quick Filter Badges */}
        <QuickFilterBadges
          properties={properties}
          filters={filters}
          onFilterChange={setFilters}
          agents={agents}
          developments={developments}
        />

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
          className="mb-4"
        />

        {selectedProperties.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedProperties.length}
            onClearSelection={() => setSelectedProperties([])}
            onBulkStatusChange={(status) => {
              bulkStatusChangeMutation.mutate({ ids: selectedProperties, status });
            }}
            onBulkVisibilityChange={(visibility) => {
              bulkVisibilityChangeMutation.mutate({ ids: selectedProperties, visibility });
            }}
            onBulkFeaturedToggle={(featured) => {
              bulkToggleFeaturedMutation.mutate({ ids: selectedProperties, featured });
            }}
            onBulkAssignConsultant={(consultantEmail) => {
              const consultant = consultants.find(c => c.email === consultantEmail);
              bulkAssignConsultantMutation.mutate({
                ids: selectedProperties,
                consultantEmail: consultantEmail === "none" ? null : consultantEmail,
                consultantName: consultantEmail === "none" ? null : consultant?.full_name
              });
            }}
            onBulkAddTag={(tagName) => {
              bulkAddTagMutation.mutate({ ids: selectedProperties, tagName });
            }}
            onBulkAssignDevelopment={(developmentId) => {
              const dev = developments.find(d => d.id === developmentId);
              if (dev) {
                bulkAssignDevelopmentMutation.mutate({
                  ids: selectedProperties,
                  developmentId: dev.id,
                  developmentName: dev.name
                });
              }
            }}
            onBulkCreateDevelopment={() => setCreateDevelopmentDialogOpen(true)}
            onBulkPhotoAssign={() => setBulkPhotoDialogOpen(true)}
            onBulkDelete={handleBulkDelete}
            onGenerateVisitRoute={() => setVisitRouteOpen(true)}
            consultants={consultants}
            developments={developments}
            propertyTags={propertyTags}
            isProcessing={
              bulkStatusChangeMutation.isPending ||
              bulkVisibilityChangeMutation.isPending ||
              bulkToggleFeaturedMutation.isPending ||
              bulkAssignAgentMutation.isPending ||
              bulkAssignConsultantMutation.isPending ||
              bulkAddTagMutation.isPending ||
              bulkAssignDevelopmentMutation.isPending ||
              bulkDeleteMutation.isPending
            }
          />
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
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={toggleSelectAll} className="flex-1 sm:flex-initial">
                  {selectedProperties.length === filteredProperties.length ? 'Desselecionar' : 'Selecionar'} Todos
                </Button>
                
                {/* Sort Controls */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated_date">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Data de Atualização
                      </div>
                    </SelectItem>
                    <SelectItem value="created_date">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Data de Criação
                      </div>
                    </SelectItem>
                    <SelectItem value="price">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" />
                        Preço
                      </div>
                    </SelectItem>
                    <SelectItem value="featured">
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3" />
                        Destaque
                      </div>
                    </SelectItem>
                    <SelectItem value="title">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        Título
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
                
                {viewMode === "grouped" && (
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9">
                      <SelectValue placeholder="Agrupar por..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Agrupamento</SelectItem>
                      <SelectItem value="development">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3" />
                          Empreendimento
                        </div>
                      </SelectItem>
                      <SelectItem value="consultant">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          Consultor
                        </div>
                      </SelectItem>
                      <SelectItem value="status">Estado</SelectItem>
                      <SelectItem value="property_type">Tipo</SelectItem>
                      <SelectItem value="city">Cidade</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex border rounded-lg overflow-hidden flex-1 sm:flex-initial">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="rounded-none flex-1 sm:flex-initial"
                    title="Vista Tabela"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="rounded-none flex-1 sm:flex-initial"
                    title="Vista Cards"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grouped" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grouped")}
                    className="rounded-none flex-1 sm:flex-initial"
                    title="Vista Agrupada"
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                </div>
                {totalPages > 1 && (viewMode === "cards" || viewMode === "table") && (
                  <p className="text-xs sm:text-sm text-slate-600 hidden md:block">
                    Página {currentPage} de {totalPages}
                  </p>
                )}
              </div>
                                      </div>

            {viewMode === "table" ? (
                                <>
                                <PropertiesTable
                                  properties={paginatedProperties}
                                  selectedProperties={selectedProperties}
                                  onToggleSelect={toggleSelect}
                                  onToggleSelectAll={toggleSelectAll}
                                  onStatusChange={handleStatusChange}
                                  onEdit={setEditingProperty}
                                  onDelete={handleDelete}
                                  onToggleFeatured={handleToggleFeatured}
                                  onDuplicate={handleDuplicate}
                                />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
              <div className="mt-6 sm:mt-8">
                <Pagination>
                  <PaginationContent className="flex-wrap gap-1">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }

                      return (
                        <PaginationItem key={page} className="hidden sm:block">
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem className="sm:hidden">
                      <span className="text-sm text-slate-600 px-2">
                        {currentPage} / {totalPages}
                      </span>
                    </PaginationItem>
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

        {/* Visit Route Generator */}
        <VisitRouteGenerator
          properties={properties.filter(p => selectedProperties.includes(p.id))}
          open={visitRouteOpen}
          onOpenChange={setVisitRouteOpen}
        />

        {/* Marketing Plan Generator */}
        <MarketingPlanGenerator
          property={selectedPropertyForPlan}
          open={marketingPlanOpen}
          onOpenChange={setMarketingPlanOpen}
        />
        </>
        )}
      </div>
    </div>
  );
}