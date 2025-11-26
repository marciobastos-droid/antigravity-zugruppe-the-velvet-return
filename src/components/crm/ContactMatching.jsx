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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Home, MapPin, Euro, Bed, Bath, 
  Square, Sparkles, Send, Check, ExternalLink,
  Heart, Star, Filter, RefreshCw, ChevronDown,
  ChevronUp, Building2, Calendar, Zap, Mail,
  Phone, MessageSquare, TrendingUp, Eye
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

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
  const [viewMode, setViewMode] = React.useState("list");

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: savedMatches = [] } = useQuery({
    queryKey: ['savedMatches', contact?.id],
    queryFn: async () => {
      if (!contact?.id) return [];
      const feedbacks = await base44.entities.MatchFeedback.filter({ profile_id: contact.id });
      return feedbacks;
    },
    enabled: !!contact?.id
  });

  const saveFeedbackMutation = useMutation({
    mutationFn: (data) => base44.entities.MatchFeedback.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedMatches', contact?.id] });
      toast.success("Feedback guardado");
    }
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  // Get unique cities and amenities for filter options
  const allCities = [...new Set(activeProperties.map(p => p.city).filter(Boolean))].sort();
  const allAmenities = [...new Set(activeProperties.flatMap(p => p.amenities || []))].sort();

  const calculateMatchScore = (property) => {
    let score = 0;
    let maxScore = 0;
    const details = {};

    // Location match (30 points)
    if (filters.cities.length > 0) {
      maxScore += 30;
      if (filters.cities.some(city => 
        property.city?.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(property.city?.toLowerCase() || '')
      )) {
        score += 30;
        details.location = { matched: true, weight: 30 };
      } else {
        details.location = { matched: false, weight: 30 };
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
        details.price = { matched: true, weight: 25, value: price };
      } else if (price >= min * 0.85 && price <= max * 1.15) {
        score += 15;
        details.price = { matched: 'partial', weight: 25, value: price };
      } else {
        details.price = { matched: false, weight: 25, value: price };
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
        details.bedrooms = { matched: true, weight: 15 };
      } else if (beds >= minBeds - 1) {
        score += 8;
        details.bedrooms = { matched: 'partial', weight: 15 };
      }
    }

    // Bathrooms match (10 points)
    if (filters.bathroomsMin) {
      maxScore += 10;
      if (property.bathrooms >= parseInt(filters.bathroomsMin)) {
        score += 10;
        details.bathrooms = { matched: true, weight: 10 };
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
        details.area = { matched: true, weight: 15 };
      } else if (area >= minArea * 0.9) {
        score += 8;
        details.area = { matched: 'partial', weight: 15 };
      }
    }

    // Property type match (10 points)
    if (filters.property_types.length > 0) {
      maxScore += 10;
      if (filters.property_types.includes(property.property_type)) {
        score += 10;
        details.type = { matched: true, weight: 10 };
      }
    }

    // Listing type match (10 points)
    maxScore += 10;
    if (property.listing_type === filters.listing_type) {
      score += 10;
      details.listingType = { matched: true, weight: 10 };
    }

    // Year built match (5 points)
    if (filters.yearBuiltMin) {
      maxScore += 5;
      if (property.year_built >= parseInt(filters.yearBuiltMin)) {
        score += 5;
        details.yearBuilt = { matched: true, weight: 5 };
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
      details.amenities = { matched: matchedAmenities.length, total: filters.amenities.length };
    }

    // Featured bonus
    if (property.featured) {
      score += 5;
    }

    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
    
    return { score: finalScore, details, maxScore, rawScore: score };
  };

  const handleSearch = () => {
    setAnalyzing(true);
    
    setTimeout(() => {
      let filtered = activeProperties;

      // Apply featured filter
      if (filters.onlyFeatured) {
        filtered = filtered.filter(p => p.featured);
      }

      const scored = filtered.map(property => {
        const { score, details } = calculateMatchScore(property);
        return { ...property, matchScore: score, matchDetails: details };
      });

      // Sort results
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
        És um consultor imobiliário experiente. Analisa os seguintes imóveis e encontra os melhores matches para um cliente.

        PERFIL DO CLIENTE:
        - Nome: ${contact?.full_name || "Cliente"}
        - Cidade de interesse: ${filters.cities.join(", ") || "Qualquer"}
        - Tipo de negócio: ${filters.listing_type === 'sale' ? 'Compra' : 'Arrendamento'}
        - Tipos de imóvel preferidos: ${filters.property_types.join(", ") || "Qualquer"}
        - Orçamento: ${filters.priceMin || 0}€ - ${filters.priceMax || "sem limite"}€
        - Quartos: ${filters.bedroomsMin || "0"} a ${filters.bedroomsMax || "sem limite"}
        - Área mínima: ${filters.areaMin || "Qualquer"}m²
        - Comodidades desejadas: ${filters.amenities.join(", ") || "Nenhuma específica"}

        IMÓVEIS DISPONÍVEIS:
        ${activeProperties.slice(0, 40).map(p => `
          ID: ${p.id}
          Título: ${p.title}
          Cidade: ${p.city}
          Preço: €${p.price?.toLocaleString()}
          Quartos: ${p.bedrooms || 'N/A'}
          WCs: ${p.bathrooms || 'N/A'}
          Área: ${p.useful_area || p.square_feet || 'N/A'}m²
          Tipo: ${p.property_type}
          Negócio: ${p.listing_type}
          Comodidades: ${p.amenities?.join(", ") || 'N/A'}
          Destaque: ${p.featured ? 'Sim' : 'Não'}
        `).join('\n')}

        Avalia cada imóvel e retorna os melhores matches com justificação.
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
                  reason: { type: "string" },
                  highlights: { type: "array", items: { type: "string" } }
                }
              }
            },
            summary: { type: "string" }
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
              aiHighlights: m.highlights || []
            };
          }
          return null;
        }).filter(Boolean);
        
        setMatchResults(aiMatches);
        if (result.summary) {
          toast.success(result.summary);
        }
      }
    } catch (error) {
      toast.error("Erro na análise AI - usando pesquisa normal");
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

  const handleSaveFeedback = (property, feedbackType) => {
    saveFeedbackMutation.mutate({
      profile_id: contact.id,
      property_id: property.id,
      match_score: property.matchScore,
      feedback_type: feedbackType,
      match_details: property.matchDetails
    });
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
${p.matchScore ? `\n⭐ Compatibilidade: ${p.matchScore}%` : ''}
      `).join('\n');

      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject: `🏠 ${selectedProps.length} Imóveis Selecionados Para Si`,
        body: `
Olá ${contact.full_name},

Temos o prazer de lhe apresentar ${selectedProps.length} imóvel(is) cuidadosamente selecionados de acordo com as suas preferências:

${propertyList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 Entre em contacto connosco para mais informações ou para agendar uma visita.

Com os melhores cumprimentos,
Zugruppe - Privileged Approach
        `
      });

      toast.success(`Email enviado para ${contact.email}`);
      setSelectedProperties([]);

      // Log communication
      await base44.entities.CommunicationLog.create({
        contact_id: contact.id,
        contact_name: contact.full_name,
        communication_type: 'email',
        direction: 'outbound',
        subject: `Envio de ${selectedProps.length} imóveis`,
        summary: `Enviados ${selectedProps.length} imóveis por email: ${selectedProps.map(p => p.title).join(', ')}`,
        outcome: 'sent',
        communication_date: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });

    } catch (error) {
      toast.error("Erro ao enviar email");
    }
    setSendingEmail(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-slate-400";
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
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{activeProperties.length}</div>
            <div className="text-xs text-blue-600">Imóveis Disponíveis</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{matchResults.length}</div>
            <div className="text-xs text-green-600">Matches Encontrados</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{selectedProperties.length}</div>
            <div className="text-xs text-purple-600">Selecionados</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Critérios de Pesquisa
            </h4>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setExpandedFilters(!expandedFilters)}
              >
                {expandedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {expandedFilters ? "Menos" : "Mais"}
              </Button>
            </div>
          </div>
          
          {/* Basic Filters */}
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <div>
              <Label className="text-xs">Tipo de Negócio</Label>
              <Select 
                value={filters.listing_type} 
                onValueChange={(v) => setFilters({...filters, listing_type: v})}
              >
                <SelectTrigger className="h-9">
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
                className="h-9"
                value={filters.priceMin}
                onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
                placeholder="0"
              />
            </div>

            <div>
              <Label className="text-xs">Preço Máx (€)</Label>
              <Input
                type="number"
                className="h-9"
                value={filters.priceMax}
                onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
                placeholder="1000000"
              />
            </div>

            <div>
              <Label className="text-xs">Quartos Mín</Label>
              <Input
                type="number"
                className="h-9"
                value={filters.bedroomsMin}
                onChange={(e) => setFilters({...filters, bedroomsMin: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>

          {/* Property Types */}
          <div className="mb-4">
            <Label className="text-xs mb-2 block">Tipo de Imóvel</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(propertyTypeLabels).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={filters.property_types.includes(key) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
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
          <div className="mb-4">
            <Label className="text-xs mb-2 block">Cidades</Label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {allCities.slice(0, 15).map(city => (
                <Badge
                  key={city}
                  variant={filters.cities.includes(city) ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    filters.cities.includes(city) ? "bg-blue-600" : "hover:bg-blue-50"
                  }`}
                  onClick={() => toggleCity(city)}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  {city}
                </Badge>
              ))}
            </div>
          </div>

          {/* Expanded Filters */}
          {expandedFilters && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Quartos Máx</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={filters.bedroomsMax}
                    onChange={(e) => setFilters({...filters, bedroomsMax: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">WCs Mín</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={filters.bathroomsMin}
                    onChange={(e) => setFilters({...filters, bathroomsMin: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Área Mín (m²)</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={filters.areaMin}
                    onChange={(e) => setFilters({...filters, areaMin: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-xs">Ano Construção Mín</Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={filters.yearBuiltMin}
                    onChange={(e) => setFilters({...filters, yearBuiltMin: e.target.value})}
                    placeholder="2000"
                  />
                </div>
              </div>

              {allAmenities.length > 0 && (
                <div>
                  <Label className="text-xs mb-2 block">Comodidades</Label>
                  <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                    {allAmenities.slice(0, 12).map(amenity => (
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
                <Label htmlFor="featured" className="text-sm cursor-pointer">
                  Apenas imóveis em destaque
                </Label>
              </div>
            </div>
          )}

          {/* Search Buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button onClick={handleSearch} disabled={analyzing} className="flex-1">
              <Search className="w-4 h-4 mr-2" />
              {analyzing ? "A pesquisar..." : "Pesquisar Matches"}
            </Button>
            <Button 
              onClick={handleAIMatch} 
              disabled={analyzing} 
              variant="outline" 
              className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Match Inteligente (IA)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Properties Actions */}
      {selectedProperties.length > 0 && (
        <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <span className="font-semibold text-green-800">
                    {selectedProperties.length} imóvel(is) selecionado(s)
                  </span>
                  <p className="text-xs text-green-600">Pronto para enviar ao cliente</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMatches}
                  disabled={sendingEmail}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingEmail ? "A enviar..." : "Enviar por Email"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedProperties([])}>
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
          <h4 className="font-semibold text-slate-900">
            {matchResults.length} imóveis encontrados
          </h4>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Melhor Match</SelectItem>
                <SelectItem value="price_asc">Preço ↑</SelectItem>
                <SelectItem value="price_desc">Preço ↓</SelectItem>
                <SelectItem value="date">Mais Recentes</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedProperties(matchResults.map(p => p.id))}
            >
              Selecionar Todos
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {matchResults.length > 0 ? (
        <div className="space-y-3">
          {matchResults.map((property) => {
            const isSelected = selectedProperties.includes(property.id);
            const hasFeedback = savedMatches.some(m => m.property_id === property.id);
            
            return (
              <Card 
                key={property.id} 
                className={`overflow-hidden transition-all ${
                  isSelected 
                    ? 'ring-2 ring-green-500 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Image */}
                    <div 
                      className="w-40 h-32 relative cursor-pointer flex-shrink-0"
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
                          <Home className="w-10 h-10 text-slate-300" />
                        </div>
                      )}
                      
                      {/* Selection Overlay */}
                      <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-green-500/30' : 'bg-black/0 hover:bg-black/10'
                      }`}>
                        {isSelected && (
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Score Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge className={`${getScoreBadgeColor(property.matchScore)} border font-bold`}>
                          {property.matchScore}%
                        </Badge>
                      </div>

                      {property.featured && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-amber-400 text-amber-900 border-0">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Destaque
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="font-semibold text-slate-900 line-clamp-1">{property.title}</h4>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <MapPin className="w-3 h-3" />
                            {property.city}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">
                            €{property.price?.toLocaleString()}
                            {property.listing_type === 'rent' && <span className="text-xs font-normal">/mês</span>}
                          </div>
                        </div>
                      </div>

                      {/* Property Details */}
                      <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                        {property.bedrooms && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            T{property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-3 h-3" />
                            {property.bathrooms} WC
                          </span>
                        )}
                        {(property.useful_area || property.square_feet) && (
                          <span className="flex items-center gap-1">
                            <Square className="w-3 h-3" />
                            {property.useful_area || property.square_feet}m²
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {propertyTypeLabels[property.property_type] || property.property_type}
                        </Badge>
                      </div>

                      {/* Match Score Bar */}
                      <div className="mb-2">
                        <Progress value={property.matchScore} className="h-1.5" />
                      </div>

                      {/* AI Reason */}
                      {property.aiReason && (
                        <p className="text-xs text-purple-600 mb-2 line-clamp-2">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          {property.aiReason}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => togglePropertySelection(property.id)}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3 h-3 mr-1 text-green-600" />
                              Selecionado
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Selecionar
                            </>
                          )}
                        </Button>
                        
                        <Link 
                          to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}
                          target="_blank"
                        >
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        </Link>

                        {!hasFeedback && (
                          <div className="flex items-center gap-1 ml-auto">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                              onClick={() => handleSaveFeedback(property, 'good')}
                            >
                              <TrendingUp className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                              onClick={() => handleSaveFeedback(property, 'excellent')}
                            >
                              <Star className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <Home className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Pesquise imóveis compatíveis</h3>
            <p className="text-sm text-slate-600">
              Configure os critérios acima e clique em "Pesquisar Matches" ou use a IA
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}