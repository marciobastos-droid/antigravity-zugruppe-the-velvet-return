import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, MapPin, Bed, Bath, Maximize, Euro, Star, TrendingUp, 
  ExternalLink, Mail, Settings, ChevronDown, ChevronUp, 
  ThumbsUp, ThumbsDown, Eye, CheckCircle, X, Heart, HeartOff,
  Sparkles, AlertCircle, Calendar, MessageSquare, Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MatchFeedbackWidget from "../matching/MatchFeedbackWidget";
import AIRecommendationsPanel from "../clients/AIRecommendationsPanel";

const DEFAULT_WEIGHTS = {
  listing_type: 30,
  property_type: 20,
  location: 25,
  price: 15,
  bedrooms: 10,
  bathrooms: 5,
  area: 5,
  amenities: 10
};

export default function EnhancedPropertyMatching({ profile, compact = false }) {
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [showWeights, setShowWeights] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
    enabled: !!profile
  });

  const { data: matchHistory = [] } = useQuery({
    queryKey: ['propertyInteractions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      return await base44.entities.PropertyInteraction.filter({ profile_id: profile.id });
    },
    enabled: !!profile
  });

  const recordInteractionMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyInteraction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyInteractions', profile.id] });
    },
  });

  const calculateDetailedMatchScore = (property, profile) => {
    if (!property || !profile) return { score: 0, details: [], breakdown: {}, explanation: '' };

    let score = 0;
    let maxScore = 0;
    const details = [];
    const breakdown = {};
    const explanationParts = [];

    // 1. Listing type match
    const listingTypeWeight = weights.listing_type;
    maxScore += listingTypeWeight;
    if (property.listing_type === profile.listing_type || profile.listing_type === 'both') {
      score += listingTypeWeight;
      details.push({ label: 'Tipo de negócio', match: true, points: listingTypeWeight, max: listingTypeWeight });
      breakdown.listing_type = { matched: true, score: listingTypeWeight, max: listingTypeWeight };
      explanationParts.push(`✓ Tipo de negócio corresponde (${property.listing_type})`);
    } else {
      details.push({ label: 'Tipo de negócio', match: false, points: 0, max: listingTypeWeight });
      breakdown.listing_type = { matched: false, score: 0, max: listingTypeWeight };
      explanationParts.push(`✗ Tipo de negócio não corresponde (procura: ${profile.listing_type}, imóvel: ${property.listing_type})`);
    }

    // 2. Property type match
    if (profile.property_types && profile.property_types.length > 0) {
      const propertyTypeWeight = weights.property_type;
      maxScore += propertyTypeWeight;
      if (profile.property_types.includes(property.property_type)) {
        score += propertyTypeWeight;
        details.push({ label: 'Tipo de imóvel', match: true, points: propertyTypeWeight, max: propertyTypeWeight });
        breakdown.property_type = { matched: true, score: propertyTypeWeight, max: propertyTypeWeight };
        explanationParts.push(`✓ Tipo de imóvel desejado (${property.property_type})`);
      } else {
        details.push({ label: 'Tipo de imóvel', match: false, points: 0, max: propertyTypeWeight });
        breakdown.property_type = { matched: false, score: 0, max: propertyTypeWeight };
        explanationParts.push(`✗ Tipo de imóvel diferente (procura: ${profile.property_types.join(', ')}, imóvel: ${property.property_type})`);
      }
    }

    // 3. Location match
    if (profile.locations && profile.locations.length > 0) {
      const locationWeight = weights.location;
      maxScore += locationWeight;
      const matchedLocation = profile.locations.find(loc => 
        property.city?.toLowerCase().includes(loc.toLowerCase()) ||
        property.state?.toLowerCase().includes(loc.toLowerCase())
      );
      if (matchedLocation) {
        score += locationWeight;
        details.push({ label: 'Localização', match: true, points: locationWeight, max: locationWeight });
        breakdown.location = { matched: true, score: locationWeight, max: locationWeight, matchedLocation };
        explanationParts.push(`✓ Localização desejada (${matchedLocation})`);
      } else {
        details.push({ label: 'Localização', match: false, points: 0, max: locationWeight });
        breakdown.location = { matched: false, score: 0, max: locationWeight };
        explanationParts.push(`✗ Localização fora da área procurada`);
      }
    }

    // 4. Price range with granular scoring
    if (profile.budget_min || profile.budget_max) {
      const priceWeight = weights.price;
      maxScore += priceWeight;
      const price = property.price || 0;
      const budgetMin = profile.budget_min || 0;
      const budgetMax = profile.budget_max || Infinity;
      
      if (price >= budgetMin && price <= budgetMax) {
        // Perfect match - full points
        score += priceWeight;
        details.push({ label: 'Orçamento', match: true, points: priceWeight, max: priceWeight });
        breakdown.price = { matched: true, score: priceWeight, max: priceWeight, difference: 0 };
        explanationParts.push(`✓ Dentro do orçamento (€${price.toLocaleString()})`);
      } else {
        // Calculate proximity score
        const midpoint = (budgetMin + budgetMax) / 2;
        const range = budgetMax - budgetMin || budgetMax || price;
        const deviation = Math.abs(price - midpoint);
        const proximityRatio = Math.max(0, 1 - (deviation / range));
        const proximityScore = priceWeight * proximityRatio * 0.5; // Max 50% of points for proximity
        
        score += proximityScore;
        details.push({ label: 'Orçamento', match: false, points: Math.round(proximityScore), max: priceWeight });
        breakdown.price = { matched: false, score: proximityScore, max: priceWeight, difference: price - midpoint };
        
        if (price > budgetMax) {
          explanationParts.push(`⚠ Acima do orçamento máximo (+€${(price - budgetMax).toLocaleString()})`);
        } else {
          explanationParts.push(`⚠ Abaixo do orçamento mínimo (-€${(budgetMin - price).toLocaleString()})`);
        }
      }
    }

    // 5. Bedrooms
    if (profile.bedrooms_min) {
      const bedroomsWeight = weights.bedrooms;
      maxScore += bedroomsWeight;
      const beds = property.bedrooms || 0;
      if (beds >= profile.bedrooms_min) {
        score += bedroomsWeight;
        details.push({ label: 'Quartos', match: true, points: bedroomsWeight, max: bedroomsWeight });
        breakdown.bedrooms = { matched: true, score: bedroomsWeight, max: bedroomsWeight, value: beds };
        explanationParts.push(`✓ Quartos suficientes (T${beds})`);
      } else {
        details.push({ label: 'Quartos', match: false, points: 0, max: bedroomsWeight });
        breakdown.bedrooms = { matched: false, score: 0, max: bedroomsWeight, value: beds };
        explanationParts.push(`✗ Menos quartos que o desejado (T${beds} vs mín. T${profile.bedrooms_min})`);
      }
    }

    // 6. Bathrooms
    if (profile.bathrooms_min) {
      const bathroomsWeight = weights.bathrooms;
      maxScore += bathroomsWeight;
      const baths = property.bathrooms || 0;
      if (baths >= profile.bathrooms_min) {
        score += bathroomsWeight;
        details.push({ label: 'Casas de banho', match: true, points: bathroomsWeight, max: bathroomsWeight });
        breakdown.bathrooms = { matched: true, score: bathroomsWeight, max: bathroomsWeight };
        explanationParts.push(`✓ Casas de banho suficientes (${baths})`);
      } else {
        details.push({ label: 'Casas de banho', match: false, points: 0, max: bathroomsWeight });
        breakdown.bathrooms = { matched: false, score: 0, max: bathroomsWeight };
      }
    }

    // 7. Area
    if (profile.square_feet_min) {
      const areaWeight = weights.area;
      maxScore += areaWeight;
      const propertyArea = property.useful_area || property.square_feet || 0;
      if (propertyArea >= profile.square_feet_min) {
        score += areaWeight;
        details.push({ label: 'Área', match: true, points: areaWeight, max: areaWeight });
        breakdown.area = { matched: true, score: areaWeight, max: areaWeight };
        explanationParts.push(`✓ Área adequada (${propertyArea}m²)`);
      } else {
        details.push({ label: 'Área', match: false, points: 0, max: areaWeight });
        breakdown.area = { matched: false, score: 0, max: areaWeight };
        explanationParts.push(`✗ Área insuficiente (${propertyArea}m² vs mín. ${profile.square_feet_min}m²)`);
      }
    }

    // 8. Amenities with granular scoring
    if (profile.desired_amenities && profile.desired_amenities.length > 0) {
      const amenitiesWeight = weights.amenities;
      maxScore += amenitiesWeight;
      const propertyAmenities = property.amenities || [];
      const matchedAmenities = profile.desired_amenities.filter(desired =>
        propertyAmenities.some(a => a.toLowerCase().includes(desired.toLowerCase()))
      );
      const amenitiesScore = (matchedAmenities.length / profile.desired_amenities.length) * amenitiesWeight;
      score += amenitiesScore;
      details.push({ label: 'Comodidades', match: amenitiesScore > 0, points: Math.round(amenitiesScore), max: amenitiesWeight });
      breakdown.amenities = { 
        matched: amenitiesScore > 0, 
        score: amenitiesScore, 
        max: amenitiesWeight, 
        matchedCount: matchedAmenities.length, 
        totalCount: profile.desired_amenities.length,
        matchedList: matchedAmenities
      };
      
      if (matchedAmenities.length > 0) {
        explanationParts.push(`✓ ${matchedAmenities.length}/${profile.desired_amenities.length} comodidades desejadas`);
      } else {
        explanationParts.push(`✗ Nenhuma comodidade desejada encontrada`);
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const explanation = explanationParts.join('\n');
    
    return { score: percentage, details, breakdown, explanation, maxScore, earnedScore: Math.round(score) };
  };

  const activeProperties = properties.filter(p => p.status === 'active');

  const scoredProperties = activeProperties
    .map(p => ({
      ...p,
      matchData: calculateDetailedMatchScore(p, profile)
    }))
    .sort((a, b) => b.matchData.score - a.matchData.score);

  // Filter by tab
  const getFilteredProperties = (tab) => {
    return scoredProperties.filter(p => {
      const interaction = matchHistory.find(h => h.property_id === p.id);
      
      if (tab === "favorites") return interaction?.interaction_type === "shortlisted";
      if (tab === "rejected") return interaction?.interaction_type === "rejected";
      if (tab === "viewed") return interaction?.interaction_type === "viewed";
      if (tab === "high") return p.matchData.score >= 75;
      if (tab === "medium") return p.matchData.score >= 50 && p.matchData.score < 75;
      if (tab === "low") return p.matchData.score < 50;
      
      return true; // "all"
    });
  }

  const handleMarkProperty = async (property, type) => {
    await recordInteractionMutation.mutateAsync({
      profile_id: profile.id,
      property_id: property.id,
      interaction_type: type,
      match_score: property.matchData.score,
      property_features: {
        price: property.price,
        bedrooms: property.bedrooms,
        city: property.city,
        property_type: property.property_type
      }
    });

    const messages = {
      shortlisted: "Imóvel marcado como favorito",
      rejected: "Imóvel descartado",
      viewed: "Visualização registada"
    };
    toast.success(messages[type] || "Interação registada");
  };

  const getMatchColor = (score) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 75) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (score >= 40) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getMatchLabel = (score) => {
    if (score >= 90) return "Excelente";
    if (score >= 75) return "Muito Bom";
    if (score >= 60) return "Bom";
    if (score >= 40) return "Razoável";
    return "Fraco";
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    toast.success("Pesos resetados");
  };

  if (!profile) return null;

  // Stats
  const favoriteCount = matchHistory.filter(h => h.interaction_type === "shortlisted").length;
  const rejectedCount = matchHistory.filter(h => h.interaction_type === "rejected").length;
  const viewedCount = matchHistory.filter(h => h.interaction_type === "viewed").length;
  const highMatchCount = scoredProperties.filter(p => p.matchData.score >= 75).length;

  const renderPropertiesList = (tabValue) => {
    const filteredPropertiesForTab = getFilteredProperties(tabValue);
    return (
      <ScrollArea className="h-[600px] pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        ) : filteredPropertiesForTab.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                {tabValue === "favorites" ? "Nenhum favorito marcado" :
                 tabValue === "rejected" ? "Nenhum imóvel descartado" :
                 tabValue === "viewed" ? "Nenhum imóvel visualizado" :
                 "Nenhum imóvel corresponde aos critérios desta categoria"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPropertiesForTab.map((property) => {
              const interaction = matchHistory.find(h => h.property_id === property.id);
              const isFavorite = interaction?.interaction_type === "shortlisted";
              const isRejected = interaction?.interaction_type === "rejected";
              const isViewed = interaction?.interaction_type === "viewed";

              return (
                <Card 
                  key={property.id} 
                  className={`border-2 transition-all hover:shadow-md ${
                    isFavorite ? 'border-pink-300 bg-pink-50' :
                    isRejected ? 'border-slate-300 bg-slate-50 opacity-60' :
                    getMatchColor(property.matchData.score)
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {property.images?.[0] ? (
                          <img 
                            src={property.images[0]} 
                            alt={property.title}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Home className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate">{property.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                              <MapPin className="w-4 h-4" />
                              {property.city}, {property.state}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getMatchColor(property.matchData.score)}>
                              <Star className="w-3 h-3 mr-1" />
                              {property.matchData.score}% - {getMatchLabel(property.matchData.score)}
                            </Badge>
                            <p className="text-lg font-bold text-slate-900">
                              €{property.price?.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Quick Info */}
                        <div className="flex flex-wrap gap-3 text-sm text-slate-700 mb-3">
                          {property.bedrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bed className="w-4 h-4" />
                              T{property.bedrooms}
                            </div>
                          )}
                          {property.bathrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bath className="w-4 h-4" />
                              {property.bathrooms} WC
                            </div>
                          )}
                          {(property.useful_area || property.square_feet) && (
                            <div className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" />
                              {property.useful_area || property.square_feet}m²
                            </div>
                          )}
                        </div>

                        {/* Score Breakdown */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">Score: {property.matchData.earnedScore}/{property.matchData.maxScore} pontos</span>
                            <button 
                              onClick={() => setExpandedProperty(expandedProperty === property.id ? null : property.id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Info className="w-3 h-3" />
                              {expandedProperty === property.id ? 'Ocultar' : 'Ver'} detalhes
                            </button>
                          </div>
                          <Progress value={property.matchData.score} className="h-2" />
                          
                          {/* Criteria badges */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {property.matchData.details.slice(0, 4).map((detail, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className={`text-[10px] ${detail.match ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-600'}`}
                              >
                                {detail.match ? '✓' : '✗'} {detail.label}: {detail.points}/{detail.max}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedProperty === property.id && (
                          <div className="mt-3 p-3 bg-white rounded-lg border space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-1">Análise Detalhada:</p>
                              <pre className="text-xs text-slate-600 whitespace-pre-line font-sans">
                                {property.matchData.explanation}
                              </pre>
                            </div>
                            
                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-2">Breakdown de Pontuação:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(property.matchData.breakdown).map(([key, value]) => (
                                  <div key={key} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                                    <span className="text-slate-600 capitalize">
                                      {key === 'listing_type' ? 'Tipo Negócio' :
                                       key === 'property_type' ? 'Tipo Imóvel' :
                                       key === 'location' ? 'Localização' :
                                       key === 'price' ? 'Preço' :
                                       key === 'bedrooms' ? 'Quartos' :
                                       key === 'bathrooms' ? 'WC' :
                                       key === 'area' ? 'Área' :
                                       key === 'amenities' ? 'Comodidades' : key}
                                    </span>
                                    <span className={`font-semibold ${value.matched ? 'text-green-600' : 'text-red-600'}`}>
                                      {Math.round(value.score)}/{value.max}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {interaction && (
                              <div className="pt-2 border-t">
                                <p className="text-xs font-semibold text-slate-700 mb-1">Histórico:</p>
                                <p className="text-xs text-slate-600">
                                  {interaction.interaction_type === 'shortlisted' && '❤️ Marcado como favorito'}
                                  {interaction.interaction_type === 'rejected' && '👎 Descartado'}
                                  {interaction.interaction_type === 'viewed' && '👁️ Visualizado'}
                                  {' em '}
                                  {format(new Date(interaction.created_date), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap mt-3">
                          <Link to={`${createPageUrl('PropertyDetails')}?id=${property.id}`} target="_blank">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Imóvel
                            </Button>
                          </Link>
                          
                          <Button 
                            variant={isFavorite ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleMarkProperty(property, "shortlisted")}
                            className={isFavorite ? "bg-pink-600 hover:bg-pink-700" : ""}
                          >
                            {isFavorite ? <Heart className="w-4 h-4 mr-2 fill-current" /> : <Heart className="w-4 h-4 mr-2" />}
                            {isFavorite ? 'Favorito' : 'Marcar'}
                          </Button>

                          <Button 
                            variant={isRejected ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleMarkProperty(property, "rejected")}
                            className={isRejected ? "bg-slate-600" : ""}
                          >
                            {isRejected ? <HeartOff className="w-4 h-4 mr-2" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                            {isRejected ? 'Descartado' : 'Descartar'}
                          </Button>

                          {!isViewed && (
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkProperty(property, "viewed")}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Marcar Visto
                            </Button>
                          )}
                        </div>

                        {/* Feedback Widget */}
                        <div className="mt-3">
                          <MatchFeedbackWidget
                            profileId={profile.id}
                            propertyId={property.id}
                            matchScore={property.matchData.score}
                            matchDetails={property.matchData.breakdown}
                            criteriaWeights={weights}
                            compact={true}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{profile.buyer_name}</h3>
          <p className="text-sm text-slate-600">{profile.buyer_email}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {favoriteCount} favoritos
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {highMatchCount} matches ótimos
          </Badge>
        </div>
      </div>

      {/* Weights Configuration */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <button
            onClick={() => setShowWeights(!showWeights)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-900">Configurar Pesos de Critérios</span>
            </div>
            {showWeights ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showWeights && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-purple-700">
                Ajuste a importância de cada critério no cálculo do match
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(weights).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">
                        {key === 'listing_type' ? 'Tipo de Negócio' :
                         key === 'property_type' ? 'Tipo de Imóvel' :
                         key === 'location' ? 'Localização' :
                         key === 'price' ? 'Preço' :
                         key === 'bedrooms' ? 'Quartos' :
                         key === 'bathrooms' ? 'Casas de Banho' :
                         key === 'area' ? 'Área' :
                         key === 'amenities' ? 'Comodidades' : key}
                      </Label>
                      <span className="text-sm font-semibold text-purple-900">{value}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(newValue) => setWeights({...weights, [key]: newValue[0]})}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="outline" size="sm" onClick={resetWeights}>
                  Resetar Padrão
                </Button>
                <p className="text-xs text-purple-600">
                  Total: {Object.values(weights).reduce((a, b) => a + b, 0)} pontos
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="ai" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            IA
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            Todos ({scoredProperties.length})
          </TabsTrigger>
          <TabsTrigger value="high" className="text-xs">
            Alto ({scoredProperties.filter(p => p.matchData.score >= 75).length})
          </TabsTrigger>
          <TabsTrigger value="medium" className="text-xs">
            Médio ({scoredProperties.filter(p => p.matchData.score >= 50 && p.matchData.score < 75).length})
          </TabsTrigger>
          <TabsTrigger value="low" className="text-xs">
            Baixo ({scoredProperties.filter(p => p.matchData.score < 50).length})
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs">
            <Heart className="w-3 h-3 mr-1" />
            ({favoriteCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">
            <X className="w-3 h-3 mr-1" />
            ({rejectedCount})
          </TabsTrigger>
          <TabsTrigger value="viewed" className="text-xs">
            <Eye className="w-3 h-3 mr-1" />
            ({viewedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-4">
          <AIRecommendationsPanel profile={profile} />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {renderPropertiesList("all")}
        </TabsContent>
        
        <TabsContent value="high" className="mt-4">
          {renderPropertiesList("high")}
        </TabsContent>
        
        <TabsContent value="medium" className="mt-4">
          {renderPropertiesList("medium")}
        </TabsContent>
        
        <TabsContent value="low" className="mt-4">
          {renderPropertiesList("low")}
        </TabsContent>
        
        <TabsContent value="favorites" className="mt-4">
          {renderPropertiesList("favorites")}
        </TabsContent>
        
        <TabsContent value="rejected" className="mt-4">
          {renderPropertiesList("rejected")}
        </TabsContent>
        
        <TabsContent value="viewed" className="mt-4">
          {renderPropertiesList("viewed")}
        </TabsContent>
      </Tabs>

      {/* Match History Summary */}
      {matchHistory.length > 0 && (
        <Card className="border-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Histórico de Interações</p>
                <p className="text-xs text-slate-600">
                  Total: {matchHistory.length} imóveis • 
                  Última: {format(new Date(matchHistory[0]?.created_date || new Date()), "d 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-pink-600" />
                  <span>{favoriteCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span>{viewedCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <X className="w-3 h-3 text-slate-600" />
                  <span>{rejectedCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}