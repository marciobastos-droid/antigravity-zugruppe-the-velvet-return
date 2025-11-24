import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { UserPlus, Mail, Phone, MapPin, DollarSign, Bed, Maximize, Search, Trash2, UserCog, Users, Sparkles, CheckSquare, Filter, X, RefreshCw, TrendingUp, Facebook, Globe, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { debounce } from "lodash";
import AIMatching from "../components/clients/AIMatching";
import AdvancedMatching from "../components/clients/AdvancedMatching";
import PropertyMatchingDialog from "../components/clients/PropertyMatchingDialog";
import AutomatedMatchesTab from "../components/clients/AutomatedMatchesTab";

export default function ClientPreferences() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState("profiles");
  const [selectedProfiles, setSelectedProfiles] = React.useState([]);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [listingTypeFilter, setListingTypeFilter] = React.useState("all");
  const [locationFilter, setLocationFilter] = React.useState("all");
  const [profileTypeFilter, setProfileTypeFilter] = React.useState("all");
  const [partnerTypeFilter, setPartnerTypeFilter] = React.useState("all");
  const [convertDialogOpen, setConvertDialogOpen] = React.useState(false);
  const [matchingProfile, setMatchingProfile] = React.useState(null);
  const [convertingLead, setConvertingLead] = React.useState(null);
  const [conversionFormData, setConversionFormData] = React.useState(null);
  
  const ITEMS_PER_PAGE = 15;

  const [formData, setFormData] = React.useState({
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    profile_type: "comprador",
    partnership_type: "",
    company_name: "",
    lead_source: "",
    listing_type: "sale",
    property_types: [],
    locations: [],
    budget_min: "",
    budget_max: "",
    bedrooms_min: "",
    bathrooms_min: "",
    square_feet_min: "",
    desired_amenities: [],
    additional_notes: "",
    status: "active"
  });

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

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['buyerProfiles', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allProfiles = await base44.entities.BuyerProfile.list('-created_date');
      
      if (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor') {
        return allProfiles;
      }
      
      return allProfiles.filter(p => p.created_by === user.email || p.assigned_agent === user.email);
    },
    enabled: !!user
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date'),
  });

  const { data: partnerLeads = [] } = useQuery({
    queryKey: ['partnerLeads'],
    queryFn: async () => {
      const allOpps = await base44.entities.Opportunity.list('-created_date');
      return allOpps.filter(o => o.lead_type === 'parceiro' && o.status !== 'closed');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BuyerProfile.create(data),
    onSuccess: () => {
      toast.success("Perfil criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BuyerProfile.update(id, data),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BuyerProfile.delete(id),
    onSuccess: () => {
      toast.success("Perfil eliminado");
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.BuyerProfile.delete(id)));
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} perfil${ids.length === 1 ? '' : 's'} eliminado${ids.length === 1 ? '' : 's'}`);
      setSelectedProfiles([]);
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
    },
  });

  const processMatchesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('processAutomatedMatches'),
    onSuccess: (response) => {
      const data = response.data;
      toast.success(`${data.total_matches} matches encontrados para ${data.profiles_with_matches} cliente(s)!`);
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error("Erro ao processar matches");
    }
  });

  // Calculate matches for a profile
  const calculateMatches = (profile) => {
    if (!properties || properties.length === 0) return 0;
    
    const activeProperties = properties.filter(p => p.status === 'active');
    let matchCount = 0;

    for (const property of activeProperties) {
      if (profile.listing_type !== 'both' && property.listing_type !== profile.listing_type) {
        continue;
      }

      let score = 0;
      let maxScore = 0;

      // Price
      if (profile.budget_min || profile.budget_max) {
        maxScore += 30;
        if ((!profile.budget_min || property.price >= profile.budget_min) &&
            (!profile.budget_max || property.price <= profile.budget_max)) {
          score += 30;
        }
      }

      // Location
      if (profile.locations?.length > 0) {
        maxScore += 25;
        if (profile.locations.some(loc => 
          property.city?.toLowerCase().includes(loc.toLowerCase()) ||
          property.address?.toLowerCase().includes(loc.toLowerCase())
        )) {
          score += 25;
        }
      }

      // Property type
      if (profile.property_types?.length > 0) {
        maxScore += 20;
        if (profile.property_types.includes(property.property_type)) {
          score += 20;
        }
      }

      // Bedrooms
      if (profile.bedrooms_min) {
        maxScore += 10;
        if (property.bedrooms >= profile.bedrooms_min) {
          score += 10;
        }
      }

      // Area
      if (profile.square_feet_min) {
        maxScore += 10;
        const area = property.useful_area || property.gross_area || property.square_feet;
        if (area >= profile.square_feet_min) {
          score += 10;
        }
      }

      const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      if (finalScore >= 70) {
        matchCount++;
      }
    }

    return matchCount;
  };

  const startConversion = (lead) => {
    setConvertingLead(lead);
    setConversionFormData({
      buyer_name: lead.buyer_name || "",
      buyer_email: lead.buyer_email || "",
      buyer_phone: lead.buyer_phone || "",
      profile_type: "parceiro_comprador",
      company_name: lead.company_name || "",
      partnership_type: lead.partnership_type || "",
      locations: lead.location ? [lead.location] : [],
      additional_notes: lead.message ? `Convertido de lead de parceiro.\n\nMensagem original:\n${lead.message}` : "",
    });
  };

  const convertLeadMutation = useMutation({
    mutationFn: async () => {
      if (!convertingLead || !conversionFormData) return;

      const profileData = {
        buyer_name: conversionFormData.buyer_name,
        buyer_email: conversionFormData.buyer_email,
        buyer_phone: conversionFormData.buyer_phone,
        profile_type: conversionFormData.profile_type,
        lead_source: convertingLead.lead_source || "other",
        listing_type: "both",
        locations: conversionFormData.locations,
        additional_notes: `${conversionFormData.additional_notes}\n\nEmpresa: ${conversionFormData.company_name}\nTipo de Parceria: ${conversionFormData.partnership_type}\nLead ID: ${convertingLead.id}`,
        status: "active",
        assigned_agent: user?.email
      };
      
      const profile = await base44.entities.BuyerProfile.create(profileData);
      
      await base44.entities.Opportunity.update(convertingLead.id, { 
        status: 'closed',
        converted_to_opportunity_id: profile.id
      });
      
      return profile;
    },
    onSuccess: () => {
      toast.success("Lead convertido em perfil de parceiro!");
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['partnerLeads'] });
      setConvertingLead(null);
      setConversionFormData(null);
    },
    onError: () => {
      toast.error("Erro ao converter lead");
    }
  });

  const resetForm = () => {
    setFormData({
      buyer_name: "",
      buyer_email: "",
      buyer_phone: "",
      profile_type: "comprador",
      partnership_type: "",
      company_name: "",
      lead_source: "",
      listing_type: "sale",
      property_types: [],
      locations: [],
      budget_min: "",
      budget_max: "",
      bedrooms_min: "",
      bathrooms_min: "",
      square_feet_min: "",
      desired_amenities: [],
      additional_notes: "",
      status: "active"
    });
    setEditingProfile(null);
    setDialogOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      budget_min: formData.budget_min ? Number(formData.budget_min) : undefined,
      budget_max: formData.budget_max ? Number(formData.budget_max) : undefined,
      bedrooms_min: formData.bedrooms_min ? Number(formData.bedrooms_min) : undefined,
      bathrooms_min: formData.bathrooms_min ? Number(formData.bathrooms_min) : undefined,
      square_feet_min: formData.square_feet_min ? Number(formData.square_feet_min) : undefined,
      assigned_agent: user?.email
    };

    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setFormData({
      buyer_name: profile.buyer_name || "",
      buyer_email: profile.buyer_email || "",
      buyer_phone: profile.buyer_phone || "",
      profile_type: profile.profile_type || "comprador",
      partnership_type: profile.partnership_type || "",
      company_name: profile.company_name || "",
      lead_source: profile.lead_source || "",
      listing_type: profile.listing_type || "sale",
      property_types: profile.property_types || [],
      locations: profile.locations || [],
      budget_min: profile.budget_min || "",
      budget_max: profile.budget_max || "",
      bedrooms_min: profile.bedrooms_min || "",
      bathrooms_min: profile.bathrooms_min || "",
      square_feet_min: profile.square_feet_min || "",
      desired_amenities: profile.desired_amenities || [],
      additional_notes: profile.additional_notes || "",
      status: profile.status || "active"
    });
    setDialogOpen(true);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Eliminar perfil de "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Eliminar ${selectedProfiles.length} perfis selecionados?`)) {
      bulkDeleteMutation.mutate(selectedProfiles);
    }
  };

  const toggleSelect = (id) => {
    setSelectedProfiles(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedProfiles(prev =>
      prev.length === filteredProfiles.length && filteredProfiles.length > 0 ? [] : filteredProfiles.map(p => p.id)
    );
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setListingTypeFilter("all");
    setLocationFilter("all");
    setProfileTypeFilter("all");
    setPartnerTypeFilter("all");
    setCurrentPage(1);
  };

  const uniqueLocations = Array.from(
    new Set(profiles.filter(p => p.locations?.length > 0).flatMap(p => p.locations))
  ).sort();

  const getLeadsForProfile = (profile) => {
    return opportunities.filter(o => o.buyer_email === profile.buyer_email);
  };

  const filteredProfiles = profiles.filter(p => {
    // Excluir parceiros da listagem de perfis
    if (p.profile_type === 'parceiro_comprador' || p.profile_type === 'parceiro_vendedor') return false;
    
    const matchesSearch = debouncedSearch === "" || 
      p.buyer_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.buyer_email?.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesListingType = listingTypeFilter === "all" || p.listing_type === listingTypeFilter;
    const matchesLocation = locationFilter === "all" || p.locations?.includes(locationFilter);
    const matchesProfileType = profileTypeFilter === "all" || p.profile_type === profileTypeFilter;
    
    return matchesSearch && matchesStatus && matchesListingType && matchesLocation && matchesProfileType;
  });

  const filteredPartners = profiles.filter(p => p.profile_type === 'parceiro_comprador' || p.profile_type === 'parceiro_vendedor').filter(p => {
    const matchesSearch = debouncedSearch === "" || 
      p.buyer_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.buyer_email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesLocation = locationFilter === "all" || p.locations?.includes(locationFilter);
    const matchesPartnerType = partnerTypeFilter === "all" || p.profile_type === partnerTypeFilter;
    return matchesSearch && matchesStatus && matchesLocation && matchesPartnerType;
  });

  // Pagination for profiles
  const totalPagesProfiles = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE);
  const startIndexProfiles = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProfiles = filteredProfiles.slice(startIndexProfiles, startIndexProfiles + ITEMS_PER_PAGE);
  
  // Pagination for partners
  const totalPagesPartners = Math.ceil(filteredPartners.length / ITEMS_PER_PAGE);
  const startIndexPartners = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPartners = filteredPartners.slice(startIndexPartners, startIndexPartners + ITEMS_PER_PAGE);
  
  // Reset to page 1 when filters or tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, listingTypeFilter, locationFilter, profileTypeFilter, partnerTypeFilter, activeTab]);

  const propertyTypeLabels = {
    house: "Moradia",
    apartment: "Apartamento",
    condo: "Condomínio",
    townhouse: "Casa geminada",
    building: "Prédio",
    land: "Terreno",
    commercial: "Comercial"
  };

  const getSourceIcon = (source) => {
    const icons = {
      facebook_ads: Facebook,
      website: Globe,
      referral: Users,
      direct_contact: Phone,
      real_estate_portal: Building2,
      networking: Users,
      other: Mail
    };
    return icons[source] || Mail;
  };

  const getSourceLabel = (source) => {
    const labels = {
      facebook_ads: "Facebook Ads",
      website: "Website",
      referral: "Indicação",
      direct_contact: "Contacto Direto",
      real_estate_portal: "Portal",
      networking: "Networking",
      other: "Outro"
    };
    return labels[source] || source;
  };

  const getProfileTypeColor = (type) => {
    const colors = {
      comprador: "bg-blue-100 text-blue-800",
      vendedor: "bg-green-100 text-green-800",
      parceiro: "bg-purple-100 text-purple-800"
    };
    return colors[type] || "bg-slate-100 text-slate-800";
  };

  const hasActiveFilters = () => {
    if (activeTab === "profiles") {
      return searchTerm || statusFilter !== "all" || listingTypeFilter !== "all" || locationFilter !== "all" || profileTypeFilter !== "all";
    } else if (activeTab === "partners") {
      return searchTerm || statusFilter !== "all" || locationFilter !== "all" || partnerTypeFilter !== "all";
    }
    return false;
  }

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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Perfis de Clientes</h1>
            <p className="text-slate-600">Gerir preferências dos clientes e encontrar matches automáticos</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => processMatchesMutation.mutate()}
              disabled={processMatchesMutation.isPending}
              variant="outline"
              className="border-green-500 text-green-700 hover:bg-green-50"
            >
              {processMatchesMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Processar Matches
                </>
              )}
            </Button>

            {partnerLeads.length > 0 && (
              <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-500 text-blue-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Converter Parceiros ({partnerLeads.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Converter Leads de Parceiros em Perfis</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    {partnerLeads.map((lead) => (
                      <Card key={lead.id} className="border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">{lead.buyer_name}</h4>
                              {lead.company_name && (
                                <p className="text-sm text-slate-600">{lead.company_name}</p>
                              )}
                              {lead.partnership_type && (
                                <Badge variant="outline" className="mt-1">{lead.partnership_type}</Badge>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2 text-sm text-slate-700">
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {lead.buyer_email}
                                </div>
                                {lead.buyer_phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {lead.buyer_phone}
                                  </div>
                                )}
                                {lead.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {lead.location}
                                  </div>
                                )}
                              </div>
                              {lead.message && (
                                <p className="text-sm text-slate-600 mt-2 line-clamp-2">{lead.message}</p>
                              )}
                              <p className="text-xs text-slate-500 mt-2">
                                Criado: {format(new Date(lead.created_date), "d 'de' MMM, HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                startConversion(lead);
                                setConvertDialogOpen(false);
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Converter
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Novo Perfil
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProfile ? "Editar Perfil" : "Novo Perfil de Cliente"}</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Cliente *</Label>
                      <Input
                        required
                        value={formData.buyer_name}
                        onChange={(e) => setFormData({...formData, buyer_name: e.target.value})}
                        placeholder="João Silva"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        required
                        type="email"
                        value={formData.buyer_email}
                        onChange={(e) => setFormData({...formData, buyer_email: e.target.value})}
                        placeholder="joao@exemplo.com"
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={formData.buyer_phone}
                        onChange={(e) => setFormData({...formData, buyer_phone: e.target.value})}
                        placeholder="+351 912 345 678"
                      />
                    </div>
                    <div>
                      <Label>Tipo de Perfil *</Label>
                      <Select value={formData.profile_type} onValueChange={(v) => setFormData({...formData, profile_type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comprador">Comprador</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                          <SelectItem value="parceiro_comprador">Parceiro Comprador</SelectItem>
                          <SelectItem value="parceiro_vendedor">Parceiro Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(formData.profile_type === 'parceiro_comprador' || formData.profile_type === 'parceiro_vendedor') && (
                      <>
                        <div>
                          <Label>Tipo de Parceria</Label>
                          <Input
                            value={formData.partnership_type}
                            onChange={(e) => setFormData({...formData, partnership_type: e.target.value})}
                            placeholder="Ex: Angariador, Construtor, Investidor"
                          />
                        </div>
                        <div>
                          <Label>Nome da Empresa</Label>
                          <Input
                            value={formData.company_name}
                            onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                            placeholder="Nome da empresa"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <Label>Origem</Label>
                      <Select value={formData.lead_source} onValueChange={(v) => setFormData({...formData, lead_source: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Indicação</SelectItem>
                          <SelectItem value="direct_contact">Contacto Direto</SelectItem>
                          <SelectItem value="real_estate_portal">Portal Imobiliário</SelectItem>
                          <SelectItem value="networking">Networking</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Anúncio *</Label>
                      <Select value={formData.listing_type} onValueChange={(v) => setFormData({...formData, listing_type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">Compra</SelectItem>
                          <SelectItem value="rent">Arrendamento</SelectItem>
                          <SelectItem value="both">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Tipos de Imóvel</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(propertyTypeLabels).map(([key, label]) => (
                        <Badge
                          key={key}
                          variant={formData.property_types.includes(key) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setFormData({...formData, property_types: toggleArrayItem(formData.property_types, key)})}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Localizações (separadas por vírgula)</Label>
                    <Input
                      value={formData.locations.join(", ")}
                      onChange={(e) => setFormData({...formData, locations: e.target.value.split(",").map(l => l.trim()).filter(Boolean)})}
                      placeholder="Lisboa, Porto, Cascais"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Orçamento Mínimo (€)</Label>
                      <Input
                        type="number"
                        value={formData.budget_min}
                        onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                        placeholder="150000"
                      />
                    </div>
                    <div>
                      <Label>Orçamento Máximo (€)</Label>
                      <Input
                        type="number"
                        value={formData.budget_max}
                        onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                        placeholder="500000"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Quartos Mínimos</Label>
                      <Input
                        type="number"
                        value={formData.bedrooms_min}
                        onChange={(e) => setFormData({...formData, bedrooms_min: e.target.value})}
                        placeholder="2"
                      />
                    </div>
                    <div>
                      <Label>Casas de Banho Mínimas</Label>
                      <Input
                        type="number"
                        value={formData.bathrooms_min}
                        onChange={(e) => setFormData({...formData, bathrooms_min: e.target.value})}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label>Área Mínima (m²)</Label>
                      <Input
                        type="number"
                        value={formData.square_feet_min}
                        onChange={(e) => setFormData({...formData, square_feet_min: e.target.value})}
                        placeholder="80"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Comodidades Desejadas (separadas por vírgula)</Label>
                    <Input
                      value={formData.desired_amenities.join(", ")}
                      onChange={(e) => setFormData({...formData, desired_amenities: e.target.value.split(",").map(a => a.trim()).filter(Boolean)})}
                      placeholder="Piscina, Garagem, Varanda"
                    />
                  </div>

                  <div>
                    <Label>Notas Adicionais</Label>
                    <Textarea
                      value={formData.additional_notes}
                      onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                      placeholder="Preferências específicas do cliente..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                      {editingProfile ? "Atualizar" : "Criar Perfil"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Conversion Review Dialog */}
        <Dialog open={!!convertingLead} onOpenChange={(open) => {
          if (!open) {
            setConvertingLead(null);
            setConversionFormData(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Revisar e Converter Parceiro
              </DialogTitle>
            </DialogHeader>
            
            {conversionFormData && (
              <form onSubmit={(e) => { e.preventDefault(); convertLeadMutation.mutate(); }} className="space-y-4 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Revise os dados antes de converter</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Complete ou corrija as informações do parceiro. Este perfil será criado como parceiro ativo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Parceiro *</Label>
                    <Input
                      required
                      value={conversionFormData.buyer_name}
                      onChange={(e) => setConversionFormData({...conversionFormData, buyer_name: e.target.value})}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      required
                      type="email"
                      value={conversionFormData.buyer_email}
                      onChange={(e) => setConversionFormData({...conversionFormData, buyer_email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={conversionFormData.buyer_phone}
                      onChange={(e) => setConversionFormData({...conversionFormData, buyer_phone: e.target.value})}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Perfil *</Label>
                    <Select 
                      value={conversionFormData.profile_type} 
                      onValueChange={(v) => setConversionFormData({...conversionFormData, profile_type: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parceiro_comprador">Parceiro Comprador</SelectItem>
                        <SelectItem value="parceiro_vendedor">Parceiro Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={conversionFormData.company_name}
                      onChange={(e) => setConversionFormData({...conversionFormData, company_name: e.target.value})}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tipo de Parceria</Label>
                  <Input
                    value={conversionFormData.partnership_type}
                    onChange={(e) => setConversionFormData({...conversionFormData, partnership_type: e.target.value})}
                    placeholder="Ex: Angariador, Construtor, Investidor, etc."
                  />
                </div>

                <div>
                  <Label>Localizações de Atuação (separadas por vírgula)</Label>
                  <Input
                    value={conversionFormData.locations.join(", ")}
                    onChange={(e) => setConversionFormData({...conversionFormData, locations: e.target.value.split(",").map(l => l.trim()).filter(Boolean)})}
                    placeholder="Lisboa, Porto, Cascais"
                  />
                </div>

                <div>
                  <Label>Notas Adicionais</Label>
                  <Textarea
                    value={conversionFormData.additional_notes}
                    onChange={(e) => setConversionFormData({...conversionFormData, additional_notes: e.target.value})}
                    rows={4}
                    placeholder="Informações adicionais sobre o parceiro..."
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setConvertingLead(null);
                      setConversionFormData(null);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={convertLeadMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {convertLeadMutation.isPending ? "A converter..." : "Confirmar Conversão"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "profiles" ? "default" : "outline"}
            onClick={() => setActiveTab("profiles")}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Clientes
          </Button>
          <Button
            variant={activeTab === "partners" ? "default" : "outline"}
            onClick={() => setActiveTab("partners")}
            className="flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Parceiros
          </Button>
          <Button
            variant={activeTab === "automated" ? "default" : "outline"}
            onClick={() => setActiveTab("automated")}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Matches Automáticos
          </Button>
          <Button
            variant={activeTab === "matching" ? "default" : "outline"}
            onClick={() => setActiveTab("matching")}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Matching Avançado
          </Button>
        </div>

        {activeTab === "profiles" ? (
          <>
            {selectedProfiles.length > 0 && (
              <Card className="mb-6 border-blue-500 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {selectedProfiles.length} perfil{selectedProfiles.length > 1 ? 's' : ''} selecionado{selectedProfiles.length > 1 ? 's' : ''}
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
                      <Button variant="outline" size="sm" onClick={() => setSelectedProfiles([])}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-slate-700" />
                  <h3 className="font-semibold text-slate-900">Filtros</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Pesquisar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nome ou email..."
                        className="pl-10 pr-8"
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
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Perfil</label>
                    <Select value={profileTypeFilter} onValueChange={setProfileTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="comprador">Comprador</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                        <SelectItem value="parceiro">Parceiro</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Anúncio</label>
                    <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="sale">Compra</SelectItem>
                        <SelectItem value="rent">Arrendamento</SelectItem>
                        <SelectItem value="both">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Localização</label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {uniqueLocations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    A mostrando <strong>{filteredProfiles.length}</strong> de <strong>{profiles.length}</strong> perfis
                  </p>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters() && (
                      <Button variant="link" size="sm" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    )}
                    {filteredProfiles.length > 0 && (
                      <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                        {selectedProfiles.length === filteredProfiles.length ? 'Desselecionar' : 'Selecionar'} Todos
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredProfiles.length === 0 ? (
              <Card className="text-center py-20">
                <CardContent>
                  <UserPlus className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                    {profiles.length === 0 ? "Nenhum perfil criado" : "Nenhum perfil encontrado"}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {profiles.length === 0 ? "Comece por criar o primeiro perfil de cliente" : "Tente ajustar os filtros"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {paginatedProfiles.map((profile) => (
                    <Card key={profile.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedProfiles.includes(profile.id)}
                            onCheckedChange={() => toggleSelect(profile.id)}
                            className="mt-1"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <h3 className="text-xl font-semibold text-slate-900">{profile.buyer_name}</h3>
                              <Badge className={getProfileTypeColor(profile.profile_type)}>
                                {profile.profile_type === 'comprador' ? 'Comprador' :
                                 profile.profile_type === 'vendedor' ? 'Vendedor' : 'Parceiro'}
                              </Badge>
                              <Badge className={profile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                                {profile.status === 'active' ? 'Ativo' : profile.status === 'paused' ? 'Pausado' : 'Fechado'}
                              </Badge>
                              {profile.lead_source && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  {React.createElement(getSourceIcon(profile.lead_source), { className: "w-3 h-3" })}
                                  {getSourceLabel(profile.lead_source)}
                                </Badge>
                              )}
                              {profile.assigned_agent && (
                                <Badge variant="outline">
                                  <UserCog className="w-3 h-3 mr-1" />
                                  Agente
                                </Badge>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-500" />
                                {profile.buyer_email}
                              </div>
                              {profile.buyer_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-slate-500" />
                                  {profile.buyer_phone}
                                </div>
                              )}
                              {profile.locations && profile.locations.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-slate-500" />
                                  {profile.locations.join(", ")}
                                </div>
                              )}
                              {(profile.budget_min || profile.budget_max) && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-slate-500" />
                                  {profile.budget_min ? `€${profile.budget_min.toLocaleString()}` : '€0'} - {profile.budget_max ? `€${profile.budget_max.toLocaleString()}` : '∞'}
                                </div>
                              )}
                              {profile.bedrooms_min > 0 && (
                                <div className="flex items-center gap-2">
                                  <Bed className="w-4 h-4 text-slate-500" />
                                  Min. {profile.bedrooms_min} quartos
                                </div>
                              )}
                              {profile.square_feet_min > 0 && (
                                <div className="flex items-center gap-2">
                                  <Maximize className="w-4 h-4 text-slate-500" />
                                  Min. {profile.square_feet_min}m²
                                </div>
                              )}
                            </div>

                            {profile.property_types && profile.property_types.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {profile.property_types.map(type => (
                                  <Badge key={type} variant="secondary" className="text-xs">
                                    {propertyTypeLabels[type]}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {profile.last_match_date && (
                              <p className="text-xs text-slate-500 mt-2">
                                Último match: {format(new Date(profile.last_match_date), "d 'de' MMM, HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            {(() => {
                              const matchCount = calculateMatches(profile);
                              return (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => setMatchingProfile(profile)}
                                  className="bg-blue-600 hover:bg-blue-700 relative"
                                >
                                  <TrendingUp className="w-4 h-4 mr-2" />
                                  Ver Matches
                                  {matchCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                                      {matchCount}
                                    </span>
                                  )}
                                </Button>
                              );
                            })()}
                            <Button variant="outline" size="sm" onClick={() => handleEdit(profile)}>
                              Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(profile.id, profile.buyer_name)} className="text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {totalPagesProfiles > 1 && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {[...Array(totalPagesProfiles)].map((_, i) => {
                          const page = i + 1;
                          if (
                            page === 1 ||
                            page === totalPagesProfiles ||
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
                            onClick={() => setCurrentPage(p => Math.min(totalPagesProfiles, p + 1))}
                            className={currentPage === totalPagesProfiles ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </>
        ) : activeTab === "partners" ? (
          <>
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-purple-700" />
                  <h3 className="font-semibold text-slate-900">Filtros de Parceiros</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Pesquisar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nome ou email..."
                        className="pl-10 pr-8"
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
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Localização</label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {uniqueLocations.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de Parceiro</label>
                    <Select value={partnerTypeFilter} onValueChange={setPartnerTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="parceiro_comprador">Parceiro Comprador</SelectItem>
                        <SelectItem value="parceiro_vendedor">Parceiro Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    A mostrar <strong>{filteredPartners.length}</strong> de <strong>{profiles.filter(p => p.profile_type === 'parceiro_comprador' || p.profile_type === 'parceiro_vendedor').length}</strong> parceiros
                  </p>
                  {hasActiveFilters() && (
                    <Button variant="link" size="sm" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {filteredPartners.length === 0 ? (
              <Card className="text-center py-20">
                <CardContent>
                  <Building2 className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                    Nenhum parceiro encontrado
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {profiles.filter(p => p.profile_type === 'parceiro_comprador' || p.profile_type === 'parceiro_vendedor').length === 0 ? "Crie perfis de parceiros para gerir colaborações" : "Ajuste os filtros para encontrar parceiros existentes"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4">
                  {paginatedPartners.map((profile) => (
                    <Card key={profile.id} className="hover:shadow-md transition-shadow border-purple-200">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <h3 className="text-xl font-semibold text-slate-900">{profile.buyer_name}</h3>
                              <Badge className="bg-purple-100 text-purple-800">
                                {profile.profile_type === 'parceiro_comprador' ? 'Parceiro Comprador' : 'Parceiro Vendedor'}
                              </Badge>
                              {profile.partnership_type && (
                                <Badge variant="outline">{profile.partnership_type}</Badge>
                              )}
                              {profile.company_name && (
                                <Badge variant="outline" className="bg-slate-50">
                                  {profile.company_name}
                                </Badge>
                              )}
                              <Badge className={profile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                                {profile.status === 'active' ? 'Ativo' : profile.status === 'paused' ? 'Pausado' : 'Fechado'}
                              </Badge>
                              {profile.lead_source && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  {React.createElement(getSourceIcon(profile.lead_source), { className: "w-3 h-3" })}
                                  {getSourceLabel(profile.lead_source)}
                                </Badge>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-500" />
                                {profile.buyer_email}
                              </div>
                              {profile.buyer_phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-slate-500" />
                                  {profile.buyer_phone}
                                </div>
                              )}
                              {profile.locations && profile.locations.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-slate-500" />
                                  {profile.locations.join(", ")}
                                </div>
                              )}
                            </div>

                            {profile.additional_notes && (
                              <p className="text-sm text-slate-600 mt-3 line-clamp-2">{profile.additional_notes}</p>
                            )}

                            {profile.last_match_date && (
                              <p className="text-xs text-slate-500 mt-2">
                                Último match: {format(new Date(profile.last_match_date), "d 'de' MMM, HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            {(() => {
                              const matchCount = calculateMatches(profile);
                              return (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => setMatchingProfile(profile)}
                                  className="bg-blue-600 hover:bg-blue-700 relative"
                                >
                                  <TrendingUp className="w-4 h-4 mr-2" />
                                  Ver Matches
                                  {matchCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                                      {matchCount}
                                    </span>
                                  )}
                                </Button>
                              );
                            })()}
                            <Button variant="outline" size="sm" onClick={() => handleEdit(profile)}>
                              Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(profile.id, profile.buyer_name)} className="text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          </div>
                          </CardContent>
                          </Card>
                          ))}
                          </div>
                {totalPagesPartners > 1 && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {[...Array(totalPagesPartners)].map((_, i) => {
                          const page = i + 1;
                          if (
                            page === 1 ||
                            page === totalPagesPartners ||
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
                            onClick={() => setCurrentPage(p => Math.min(totalPagesPartners, p + 1))}
                            className={currentPage === totalPagesPartners ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
            </>
            ) : activeTab === "automated" ? (
          <AutomatedMatchesTab profiles={profiles} />
        ) : activeTab === "matching" ? (
          <AdvancedMatching profiles={profiles} />
        ) : null}
      </div>

      <PropertyMatchingDialog 
        profile={matchingProfile}
        open={!!matchingProfile}
        onOpenChange={(open) => !open && setMatchingProfile(null)}
      />
    </div>
  );
}