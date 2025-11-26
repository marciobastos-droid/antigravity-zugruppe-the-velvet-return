import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Home, MapPin, Euro, Bed, Bath, 
  Square, Sparkles, Send, Check, ExternalLink,
  Heart, Star, Filter, ChevronDown, ChevronUp, 
  Bell, BellOff, Save, Trash2, X, ThumbsDown,
  Eye, Clock, Bookmark, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ContactMatching({ contact }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState({
    listing_type: "sale",
    property_types: [],
    cities: contact?.city ? [contact.city] : [],
    priceMin: "",
    priceMax: "",
    bedroomsMin: "",
    bedroomsMax: "",
    bathroomsMin: "",
    areaMin: "",
    areaMax: "",
    yearBuiltMin: "",
    amenities: [],
    onlyFeatured: false
  });
  const [matchResults, setMatchResults] = React.useState([]);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [selectedProperties, setSelectedProperties] = React.useState([]);
  const [expandedFilters, setExpandedFilters] = React.useState(false);
  const [sortBy, setSortBy] = React.useState("score");
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [saveSearchDialogOpen, setSaveSearchDialogOpen] = React.useState(false);
  const [searchName, setSearchName] = React.useState("");
  const [alertsEnabled, setAlertsEnabled] = React.useState(false);
  const [alertFrequency, setAlertFrequency] = React.useState("daily");

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: savedSearches = [], refetch: refetchSearches } = useQuery({
    queryKey: ['savedSearches', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      return await base44.entities.SavedSearchCriteria.filter({ contact_id: contact.id });
    },
    enabled: !!contact?.id
  });

  const { data: propertyFeedback = [], refetch: refetchFeedback } = useQuery({
    queryKey: ['propertyFeedback', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      return await base44.entities.PropertyFeedback.filter({ contact_id: contact.id });
    },
    enabled: !!contact?.id
  });

  const saveSearchMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedSearchCriteria.create(data),
    onSuccess: () => {
      toast.success("Pesquisa guardada!");
      refetchSearches();
      setSaveSearchDialogOpen(false);
      setSearchName("");
    }
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSearchCriteria.delete(id),
    onSuccess: () => {
      toast.success("Pesquisa eliminada");
      refetchSearches();
    }
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.SavedSearchCriteria.update(id, { alerts_enabled: enabled }),
    onSuccess: (_, { enabled }) => {
      toast.success(enabled ? "Alertas ativados!" : "Alertas desativados");
      refetchSearches();
    }
  });

  const saveFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      // Check if feedback already exists
      const existing = propertyFeedback.find(f => f.property_id === data.property_id);
      if (existing) {
        return await base44.entities.PropertyFeedback.update(existing.id, data);
      }
      return await base44.entities.PropertyFeedback.create(data);
    },
    onSuccess: () => {
      refetchFeedback();
    }
  });

  const activeProperties = properties.filter(p => p.status === 'active');
  const allCities = [...new Set(activeProperties.map(p => p.city).filter(Boolean))].sort();
  const allAmenities = [...new Set(activeProperties.flatMap(p => p.amenities || []))].sort();

  // Get favorite and rejected property IDs
  const favoriteIds = propertyFeedback.filter(f => f.feedback_type === 'favorite').map(f => f.property_id);
  const rejectedIds = propertyFeedback.filter(f => f.feedback_type === 'rejected').map(f => f.property_id);

  const calculateMatchScore = (property) => {
    let score = 0;
    let maxScore = 0;

    // Location match (30 points)
    if (filters.cities.length > 0) {
      maxScore += 30;
      if (filters.cities.some(city => 
        property.city?.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(property.city?.toLowerCase() || '')
      )) {
        score += 30;
      }
    }

    // Price match (25 points)
    if (filters.priceMin || filters.priceMax) {
      maxScore += 25;
      const price = property.price || 0;
      const min = filters.priceMin ? parseFloat(filters.priceMin) : 0;
      const max = filters.priceMax ? parseFloat(filters.priceMax) : Infinity;
      
      if (price >= min && price <= max) {
        score += 25;
      } else if (price >= min * 0.85 && price <= max * 1.15) {
        score += 15;
      }
    }

    // Bedrooms match (15 points)
    if (filters.bedroomsMin || filters.bedroomsMax) {
      maxScore += 15;
      const beds = property.bedrooms || 0;
      const minBeds = filters.bedroomsMin ? parseInt(filters.bedroomsMin) : 0;
      const maxBeds = filters.bedroomsMax ? parseInt(filters.bedroomsMax) : Infinity;
      
      if (beds >= minBeds && beds <= maxBeds) {
        score += 15;
      } else if (beds >= minBeds - 1) {
        score += 8;
      }
    }

    // Bathrooms match (10 points)
    if (filters.bathroomsMin) {
      maxScore += 10;
      if (property.bathrooms >= parseInt(filters.bathroomsMin)) {
        score += 10;
      }
    }

    // Area match (15 points)
    if (filters.areaMin || filters.areaMax) {
      maxScore += 15;
      const area = property.useful_area || property.square_feet || 0;
      const minArea = filters.areaMin ? parseInt(filters.areaMin) : 0;
      const maxArea = filters.areaMax ? parseInt(filters.areaMax) : Infinity;
      
      if (area >= minArea && area <= maxArea) {
        score += 15;
      } else if (area >= minArea * 0.9) {
        score += 8;
      }
    }

    // Property type match (10 points)
    if (filters.property_types.length > 0) {
      maxScore += 10;
      if (filters.property_types.includes(property.property_type)) {
        score += 10;
      }
    }

    // Listing type match (10 points)
    maxScore += 10;
    if (property.listing_type === filters.listing_type) {
      score += 10;
    }

    // Year built match (5 points)
    if (filters.yearBuiltMin) {
      maxScore += 5;
      if (property.year_built >= parseInt(filters.yearBuiltMin)) {
        score += 5;
      }
    }

    // Amenities match (bonus points)
    if (filters.amenities.length > 0 && property.amenities?.length > 0) {
      const matchedAmenities = filters.amenities.filter(a => 
        property.amenities.some(pa => pa.toLowerCase().includes(a.toLowerCase()))
      );
      const amenityScore = Math.round((matchedAmenities.length / filters.amenities.length) * 10);
      maxScore += 10;
      score += amenityScore;
    }

    // Featured bonus
    if (property.featured) {
      score += 5;
    }

    // Favorite bonus
    if (favoriteIds.includes(property.id)) {
      score += 10;
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
  };

  const handleSearch = () => {
    setAnalyzing(true);
    
    setTimeout(() => {
      let filtered = activeProperties;

      // Exclude rejected properties
      filtered = filtered.filter(p => !rejectedIds.includes(p.id));

      if (filters.onlyFeatured) {
        filtered = filtered.filter(p => p.featured);
      }

      const scored = filtered.map(property => ({
        ...property,
        matchScore: calculateMatchScore(property),
        isFavorite: favoriteIds.includes(property.id),
        isRejected: rejectedIds.includes(property.id)
      }));

      let sorted = scored.filter(p => p.matchScore > 0);
      
      if (sortBy === "score") {
        sorted = sorted.sort((a, b) => b.matchScore - a.matchScore);
      } else if (sortBy === "price_asc") {
        sorted = sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === "price_desc") {
        sorted = sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (sortBy === "date") {
        sorted = sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }

      setMatchResults(sorted.slice(0, 30));
      setAnalyzing(false);
    }, 300);
  };

  const handleAIMatch = async () => {
    setAnalyzing(true);
    try {
      const prompt = `
        És um consultor imobiliário experiente. Analisa os seguintes imóveis e encontra os melhores matches.

        PERFIL DO CLIENTE:
        - Nome: ${contact?.full_name || "Cliente"}
        - Cidade: ${filters.cities.join(", ") || "Qualquer"}
        - Tipo: ${filters.listing_type === 'sale' ? 'Compra' : 'Arrendamento'}
        - Tipos de imóvel: ${filters.property_types.join(", ") || "Qualquer"}
        - Orçamento: ${filters.priceMin || 0}€ - ${filters.priceMax || "sem limite"}€
        - Quartos: ${filters.bedroomsMin || "0"} a ${filters.bedroomsMax || "sem limite"}
        - Área mínima: ${filters.areaMin || "Qualquer"}m²

        IMÓVEIS FAVORITOS DO CLIENTE: ${favoriteIds.join(", ") || "Nenhum"}
        IMÓVEIS REJEITADOS (excluir): ${rejectedIds.join(", ") || "Nenhum"}

        IMÓVEIS DISPONÍVEIS:
        ${activeProperties.filter(p => !rejectedIds.includes(p.id)).slice(0, 40).map(p => `
          ID: ${p.id}, Título: ${p.title}, Cidade: ${p.city}, Preço: €${p.price?.toLocaleString()}, Quartos: ${p.bedrooms || 'N/A'}, Área: ${p.useful_area || p.square_feet || 'N/A'}m²
        `).join('\n')}

        Retorna os melhores matches com justificação.
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  score: { type: "number" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.matches) {
        const aiMatches = result.matches.map(m => {
          const property = activeProperties.find(p => p.id === m.id);
          if (property) {
            return { 
              ...property, 
              matchScore: m.score, 
              aiReason: m.reason,
              isFavorite: favoriteIds.includes(property.id)
            };
          }
          return null;
        }).filter(Boolean);
        
        setMatchResults(aiMatches);
      }
    } catch (error) {
      toast.error("Erro na análise AI");
      handleSearch();
    }
    setAnalyzing(false);
  };

  const togglePropertySelection = (propertyId) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleFeedback = (propertyId, type) => {
    saveFeedbackMutation.mutate({
      contact_id: contact.id,
      property_id: propertyId,
      feedback_type: type
    }, {
      onSuccess: () => {
        toast.success(type === 'favorite' ? '💖 Adicionado aos favoritos' : '👎 Marcado como rejeitado');
        if (type === 'rejected') {
          setMatchResults(prev => prev.filter(p => p.id !== propertyId));
        } else {
          setMatchResults(prev => prev.map(p => 
            p.id === propertyId ? { ...p, isFavorite: true } : p
          ));
        }
      }
    });
  };

  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      toast.error("Introduza um nome para a pesquisa");
      return;
    }

    saveSearchMutation.mutate({
      contact_id: contact.id,
      contact_name: contact.full_name,
      contact_email: contact.email,
      name: searchName,
      criteria: filters,
      alerts_enabled: alertsEnabled,
      alert_frequency: alertFrequency,
      matched_properties_sent: []
    });
  };

  const handleLoadSearch = (search) => {
    setFilters(search.criteria);
    toast.success(`Pesquisa "${search.name}" carregada`);
  };

  const handleSendMatches = async () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos um imóvel");
      return;
    }

    if (!contact.email) {
      toast.error("Contacto não tem email");
      return;
    }

    setSendingEmail(true);
    try {
      const selectedProps = matchResults.filter(p => selectedProperties.includes(p.id));
      
      const propertyList = selectedProps.map(p => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 ${p.title}

• Localização: ${p.city}${p.address ? `, ${p.address}` : ''}
• Preço: €${p.price?.toLocaleString()}${p.listing_type === 'rent' ? '/mês' : ''}
• Tipologia: ${p.bedrooms ? `T${p.bedrooms}` : 'N/A'} | ${p.bathrooms || 'N/A'} WC
• Área: ${p.useful_area || p.square_feet || 'N/A'}m²
${p.amenities?.length ? `• Comodidades: ${p.amenities.slice(0, 5).join(', ')}` : ''}
      `).join('\n');

      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject: `🏠 ${selectedProps.length} Imóveis Selecionados Para Si`,
        body: `
Olá ${contact.full_name},

Temos ${selectedProps.length} imóvel(is) cuidadosamente selecionados:

${propertyList}

Entre em contacto connosco para mais informações.

Cumprimentos,
Zugruppe
        `
      });

      toast.success(`Email enviado para ${contact.email}`);
      setSelectedProperties([]);

      await base44.entities.CommunicationLog.create({
        contact_id: contact.id,
        contact_name: contact.full_name,
        communication_type: 'email',
        direction: 'outbound',
        subject: `Envio de ${selectedProps.length} imóveis`,
        summary: `Enviados ${selectedProps.length} imóveis por email`,
        outcome: 'sent',
        communication_date: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });

    } catch (error) {
      toast.error("Erro ao enviar email");
    }
    setSendingEmail(false);
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 40) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  const propertyTypeLabels = {
    apartment: "Apartamento",
    house: "Moradia",
    townhouse: "Casa Geminada",
    condo: "Condomínio",
    land: "Terreno",
    commercial: "Comercial",
    building: "Prédio"
  };

  const toggleCity = (city) => {
    setFilters(prev => ({
      ...prev,
      cities: prev.cities.includes(city) 
        ? prev.cities.filter(c => c !== city)
        : [...prev.cities, city]
    }));
  };

  const togglePropertyType = (type) => {
    setFilters(prev => ({
      ...prev,
      property_types: prev.property_types.includes(type)
        ? prev.property_types.filter(t => t !== type)
        : [...prev.property_types, type]
    }));
  };

  const toggleAmenity = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const clearFilters = () => {
    setFilters({
      listing_type: "sale",
      property_types: [],
      cities: [],
      priceMin: "",
      priceMax: "",
      bedroomsMin: "",
      bedroomsMax: "",
      bathroomsMin: "",
      areaMin: "",
      areaMax: "",
      yearBuiltMin: "",
      amenities: [],
      onlyFeatured: false
    });
    setMatchResults([]);
  };

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-2 text-center">
            <div className="text-xl font-bold text-blue-700">{activeProperties.length}</div>
            <div className="text-xs text-blue-600">Disponíveis</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-2 text-center">
            <div className="text-xl font-bold text-green-700">{matchResults.length}</div>
            <div className="text-xs text-green-600">Matches</div>
          </CardContent>
        </Card>
        <Card className="bg-pink-50 border-pink-200">
          <CardContent className="p-2 text-center">
            <div className="text-xl font-bold text-pink-700">{favoriteIds.length}</div>
            <div className="text-xs text-pink-600">Favoritos</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-2 text-center">
            <div className="text-xl font-bold text-purple-700">{savedSearches.length}</div>
            <div className="text-xs text-purple-600">Pesquisas</div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-purple-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                Pesquisas Guardadas
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map(search => (
                <div key={search.id} className="flex items-center gap-1 bg-white rounded-lg border border-purple-200 p-1 pl-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleLoadSearch(search)}
                  >
                    {search.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 ${search.alerts_enabled ? 'text-amber-500' : 'text-slate-400'}`}
                    onClick={() => toggleAlertMutation.mutate({ id: search.id, enabled: !search.alerts_enabled })}
                  >
                    {search.alerts_enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                    onClick={() => deleteSearchMutation.mutate(search.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Critérios de Pesquisa
            </h4>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setSaveSearchDialogOpen(true)}
              >
                <Save className="w-3 h-3 mr-1" />
                Guardar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                Limpar
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7"
                onClick={() => setExpandedFilters(!expandedFilters)}
              >
                {expandedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {/* Basic Filters */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div>
              <Label className="text-xs">Negócio</Label>
              <Select 
                value={filters.listing_type} 
                onValueChange={(v) => setFilters({...filters, listing_type: v})}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Compra</SelectItem>
                  <SelectItem value="rent">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Preço Mín (€)</Label>
              <Input
                type="number"
                className="h-8"
                value={filters.priceMin}
                onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-xs">Preço Máx (€)</Label>
              <Input
                type="number"
                className="h-8"
                value={filters.priceMax}
                onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-xs">Quartos Mín</Label>
              <Input
                type="number"
                className="h-8"
                value={filters.bedroomsMin}
                onChange={(e) => setFilters({...filters, bedroomsMin: e.target.value})}
              />
            </div>
          </div>

          {/* Property Types */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Tipo de Imóvel</Label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(propertyTypeLabels).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={filters.property_types.includes(key) ? "default" : "outline"}
                  className={`cursor-pointer text-xs ${
                    filters.property_types.includes(key) ? "bg-slate-900" : "hover:bg-slate-100"
                  }`}
                  onClick={() => togglePropertyType(key)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Cities */}
          <div className="mb-3">
            <Label className="text-xs mb-1 block">Cidades</Label>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {allCities.slice(0, 12).map(city => (
                <Badge
                  key={city}
                  variant={filters.cities.includes(city) ? "default" : "outline"}
                  className={`cursor-pointer text-xs ${
                    filters.cities.includes(city) ? "bg-blue-600" : "hover:bg-blue-50"
                  }`}
                  onClick={() => toggleCity(city)}
                >
                  {city}
                </Badge>
              ))}
            </div>
          </div>

          {/* Expanded Filters */}
          {expandedFilters && (
            <div className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Quartos Máx</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={filters.bedroomsMax}
                    onChange={(e) => setFilters({...filters, bedroomsMax: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">WCs Mín</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={filters.bathroomsMin}
                    onChange={(e) => setFilters({...filters, bathroomsMin: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Área Mín (m²)</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={filters.areaMin}
                    onChange={(e) => setFilters({...filters, areaMin: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Ano Mín</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={filters.yearBuiltMin}
                    onChange={(e) => setFilters({...filters, yearBuiltMin: e.target.value})}
                  />
                </div>
              </div>

              {allAmenities.length > 0 && (
                <div>
                  <Label className="text-xs mb-1 block">Comodidades</Label>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {allAmenities.slice(0, 10).map(amenity => (
                      <Badge
                        key={amenity}
                        variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                        className={`cursor-pointer text-xs ${
                          filters.amenities.includes(amenity) ? "bg-purple-600" : "hover:bg-purple-50"
                        }`}
                        onClick={() => toggleAmenity(amenity)}
                      >
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="featured" 
                  checked={filters.onlyFeatured}
                  onCheckedChange={(checked) => setFilters({...filters, onlyFeatured: checked})}
                />
                <Label htmlFor="featured" className="text-xs cursor-pointer">
                  Apenas destaques
                </Label>
              </div>
            </div>
          )}

          {/* Search Buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button onClick={handleSearch} disabled={analyzing} className="flex-1 h-9">
              <Search className="w-4 h-4 mr-1" />
              {analyzing ? "..." : "Pesquisar"}
            </Button>
            <Button 
              onClick={handleAIMatch} 
              disabled={analyzing} 
              variant="outline" 
              className="flex-1 h-9 border-purple-300 text-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Match IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Actions */}
      {selectedProperties.length > 0 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-green-800 text-sm">
                {selectedProperties.length} selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMatches}
                  disabled={sendingEmail}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 h-8"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {sendingEmail ? "..." : "Enviar Email"}
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedProperties([])}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Header */}
      {matchResults.length > 0 && (
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 text-sm">
            {matchResults.length} imóveis
          </h4>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Melhor Match</SelectItem>
              <SelectItem value="price_asc">Preço ↑</SelectItem>
              <SelectItem value="price_desc">Preço ↓</SelectItem>
              <SelectItem value="date">Recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results */}
      {matchResults.length > 0 ? (
        <div className="space-y-2">
          {matchResults.map((property) => {
            const isSelected = selectedProperties.includes(property.id);
            
            return (
              <Card 
                key={property.id} 
                className={`overflow-hidden transition-all ${
                  isSelected ? 'ring-2 ring-green-500' : 'hover:shadow-md'
                } ${property.isFavorite ? 'border-pink-300 bg-pink-50/30' : ''}`}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Image */}
                    <div 
                      className="w-28 h-24 relative cursor-pointer flex-shrink-0"
                      onClick={() => togglePropertySelection(property.id)}
                    >
                      {property.images?.[0] ? (
                        <img 
                          src={property.images[0]} 
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <Home className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      )}

                      <div className="absolute top-1 right-1">
                        <Badge className={`${getScoreBadgeColor(property.matchScore)} border text-xs font-bold`}>
                          {property.matchScore}%
                        </Badge>
                      </div>

                      {property.isFavorite && (
                        <div className="absolute top-1 left-1">
                          <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-2">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{property.title}</h4>
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <MapPin className="w-3 h-3" />
                            {property.city}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-slate-900 text-sm">
                            €{property.price?.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                        {property.bedrooms && (
                          <span className="flex items-center gap-0.5">
                            <Bed className="w-3 h-3" />
                            T{property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms && (
                          <span className="flex items-center gap-0.5">
                            <Bath className="w-3 h-3" />
                            {property.bathrooms}
                          </span>
                        )}
                        {(property.useful_area || property.square_feet) && (
                          <span className="flex items-center gap-0.5">
                            <Square className="w-3 h-3" />
                            {property.useful_area || property.square_feet}m²
                          </span>
                        )}
                      </div>

                      {property.aiReason && (
                        <p className="text-xs text-purple-600 line-clamp-1 mb-1">
                          ✨ {property.aiReason}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs"
                          onClick={() => togglePropertySelection(property.id)}
                        >
                          <Check className={`w-3 h-3 mr-1 ${isSelected ? 'text-green-600' : ''}`} />
                          {isSelected ? "✓" : "Selecionar"}
                        </Button>
                        
                        <Link 
                          to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                          target="_blank"
                        >
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </Link>

                        <div className="flex items-center gap-0.5 ml-auto">
                          {!property.isFavorite && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 text-pink-500 hover:bg-pink-50"
                              onClick={() => handleFeedback(property.id, 'favorite')}
                            >
                              <Heart className="w-3 h-3" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() => handleFeedback(property.id, 'rejected')}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-6">
          <CardContent>
            <Home className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Pesquise imóveis</h3>
            <p className="text-xs text-slate-600">Configure os critérios e clique em Pesquisar</p>
          </CardContent>
        </Card>
      )}

      {/* Save Search Dialog */}
      <Dialog open={saveSearchDialogOpen} onOpenChange={setSaveSearchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar Pesquisa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome da Pesquisa</Label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Ex: T3 Lisboa até 300k"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="enableAlerts"
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
                <Label htmlFor="enableAlerts" className="cursor-pointer">
                  <Bell className="w-4 h-4 inline mr-1 text-amber-600" />
                  Ativar alertas
                </Label>
              </div>
              {alertsEnabled && (
                <Select value={alertFrequency} onValueChange={setAlertFrequency}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Imediato</SelectItem>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {alertsEnabled && contact?.email && (
              <p className="text-xs text-slate-600">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Alertas serão enviados para: {contact.email}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSaveSearchDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveSearch} className="flex-1" disabled={saveSearchMutation.isPending}>
                <Save className="w-4 h-4 mr-1" />
                {saveSearchMutation.isPending ? "..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}