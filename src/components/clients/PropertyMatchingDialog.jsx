import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, MapPin, Bed, Bath, Maximize, Euro, Star, TrendingUp, ExternalLink, Mail, Calendar, Settings, ChevronDown, ChevronUp, ThumbsUp, StickyNote, Image as ImageIcon, CheckCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import AIRecommendationsPanel from "./AIRecommendationsPanel";

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

export default function PropertyMatchingDialog({ profile, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [showWeights, setShowWeights] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState(null);
  const [suggestingProperty, setSuggestingProperty] = useState(null);
  const [suggestionNote, setSuggestionNote] = useState("");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
    enabled: open && !!profile
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BuyerProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
      toast.success("Sugestão registada com sucesso!");
      setSuggestingProperty(null);
      setSuggestionNote("");
    },
  });

  const calculateMatchScore = (property, profile) => {
    if (!property || !profile) return { score: 0, details: [], breakdown: {} };

    let score = 0;
    let maxScore = 0;
    const details = [];
    const breakdown = {};

    // Listing type match
    const listingTypeWeight = weights.listing_type || DEFAULT_WEIGHTS.listing_type;
    maxScore += listingTypeWeight;
    if (property.listing_type === profile.listing_type || profile.listing_type === 'both') {
      score += listingTypeWeight;
      details.push({ label: 'Tipo de negócio', match: true, points: listingTypeWeight });
      breakdown.listing_type = { matched: true, score: listingTypeWeight, max: listingTypeWeight };
    } else {
      details.push({ label: 'Tipo de negócio', match: false, points: 0 });
      breakdown.listing_type = { matched: false, score: 0, max: listingTypeWeight };
    }

    // Property type match
    if (profile.property_types && profile.property_types.length > 0) {
      const propertyTypeWeight = weights.property_type || DEFAULT_WEIGHTS.property_type;
      maxScore += propertyTypeWeight;
      if (profile.property_types.includes(property.property_type)) {
        score += propertyTypeWeight;
        details.push({ label: 'Tipo de imóvel', match: true, points: propertyTypeWeight });
        breakdown.property_type = { matched: true, score: propertyTypeWeight, max: propertyTypeWeight };
      } else {
        details.push({ label: 'Tipo de imóvel', match: false, points: 0 });
        breakdown.property_type = { matched: false, score: 0, max: propertyTypeWeight };
      }
    }

    // Location match
    if (profile.locations && profile.locations.length > 0) {
      const locationWeight = weights.location || DEFAULT_WEIGHTS.location;
      maxScore += locationWeight;
      const locationMatch = profile.locations.some(loc => 
        property.city?.toLowerCase().includes(loc.toLowerCase()) ||
        property.state?.toLowerCase().includes(loc.toLowerCase())
      );
      if (locationMatch) {
        score += locationWeight;
        details.push({ label: 'Localização', match: true, points: locationWeight });
        breakdown.location = { matched: true, score: locationWeight, max: locationWeight };
      } else {
        details.push({ label: 'Localização', match: false, points: 0 });
        breakdown.location = { matched: false, score: 0, max: locationWeight };
      }
    }

    // Price range with proximity scoring
    if (profile.budget_min || profile.budget_max) {
      const priceWeight = weights.price || DEFAULT_WEIGHTS.price;
      maxScore += priceWeight;
      const withinBudget = 
        (!profile.budget_min || property.price >= profile.budget_min) &&
        (!profile.budget_max || property.price <= profile.budget_max);
      
      if (withinBudget) {
        // Full points if within budget
        score += priceWeight;
        details.push({ label: 'Orçamento', match: true, points: priceWeight });
        breakdown.price = { matched: true, score: priceWeight, max: priceWeight };
      } else {
        // Partial points based on proximity
        const midpoint = ((profile.budget_min || 0) + (profile.budget_max || property.price)) / 2;
        const deviation = Math.abs(property.price - midpoint) / midpoint;
        const proximityScore = Math.max(0, priceWeight * (1 - deviation));
        score += proximityScore;
        details.push({ label: 'Orçamento', match: false, points: Math.round(proximityScore) });
        breakdown.price = { matched: false, score: proximityScore, max: priceWeight };
      }
    }

    // Bedrooms
    if (profile.bedrooms_min) {
      const bedroomsWeight = weights.bedrooms || DEFAULT_WEIGHTS.bedrooms;
      maxScore += bedroomsWeight;
      if (property.bedrooms >= profile.bedrooms_min) {
        score += bedroomsWeight;
        details.push({ label: 'Quartos', match: true, points: bedroomsWeight });
        breakdown.bedrooms = { matched: true, score: bedroomsWeight, max: bedroomsWeight };
      } else {
        details.push({ label: 'Quartos', match: false, points: 0 });
        breakdown.bedrooms = { matched: false, score: 0, max: bedroomsWeight };
      }
    }

    // Bathrooms
    if (profile.bathrooms_min) {
      const bathroomsWeight = weights.bathrooms || DEFAULT_WEIGHTS.bathrooms;
      maxScore += bathroomsWeight;
      if (property.bathrooms >= profile.bathrooms_min) {
        score += bathroomsWeight;
        details.push({ label: 'Casas de banho', match: true, points: bathroomsWeight });
        breakdown.bathrooms = { matched: true, score: bathroomsWeight, max: bathroomsWeight };
      } else {
        details.push({ label: 'Casas de banho', match: false, points: 0 });
        breakdown.bathrooms = { matched: false, score: 0, max: bathroomsWeight };
      }
    }

    // Area
    if (profile.square_feet_min) {
      const areaWeight = weights.area || DEFAULT_WEIGHTS.area;
      maxScore += areaWeight;
      const propertyArea = property.useful_area || property.square_feet || 0;
      if (propertyArea >= profile.square_feet_min) {
        score += areaWeight;
        details.push({ label: 'Área', match: true, points: areaWeight });
        breakdown.area = { matched: true, score: areaWeight, max: areaWeight };
      } else {
        details.push({ label: 'Área', match: false, points: 0 });
        breakdown.area = { matched: false, score: 0, max: areaWeight };
      }
    }

    // Amenities with partial matching
    if (profile.desired_amenities && profile.desired_amenities.length > 0 && property.amenities) {
      const amenitiesWeight = weights.amenities || DEFAULT_WEIGHTS.amenities;
      maxScore += amenitiesWeight;
      const amenitiesMatch = profile.desired_amenities.filter(desired =>
        property.amenities.some(a => a.toLowerCase().includes(desired.toLowerCase()))
      );
      const amenitiesScore = (amenitiesMatch.length / profile.desired_amenities.length) * amenitiesWeight;
      score += amenitiesScore;
      details.push({ label: 'Comodidades', match: amenitiesScore > 0, points: Math.round(amenitiesScore) });
      breakdown.amenities = { matched: amenitiesScore > 0, score: amenitiesScore, max: amenitiesWeight, matchedCount: amenitiesMatch.length, totalCount: profile.desired_amenities.length };
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return { score: percentage, details, breakdown };
  };

  const matchedProperties = profile ? properties
    .filter(p => p.status === 'active')
    .map(p => ({
      ...p,
      matchScore: calculateMatchScore(p, profile)
    }))
    .filter(p => p.matchScore.score >= 40) // Lowered threshold
    .sort((a, b) => b.matchScore.score - a.matchScore.score) : [];

  const handleSuggestProperty = async (property) => {
    if (!suggestionNote.trim()) {
      toast.error("Adicione uma nota sobre esta sugestão");
      return;
    }

    const suggestion = {
      property_id: property.id,
      property_title: property.title,
      property_price: property.price,
      property_city: property.city,
      match_score: property.matchScore.score,
      note: suggestionNote,
      suggested_at: new Date().toISOString(),
      suggested_by: (await base44.auth.me()).email
    };

    const currentNotes = profile.additional_notes || "";
    const updatedNotes = `${currentNotes}\n\n[SUGESTÃO - ${new Date().toLocaleDateString('pt-PT')}]\nImóvel: ${property.title} (${property.city})\nMatch: ${property.matchScore.score}%\nPreço: €${property.price?.toLocaleString()}\nNota: ${suggestionNote}\n---`;

    updateProfileMutation.mutate({
      id: profile.id,
      data: { additional_notes: updatedNotes }
    });
  };

  const sendMatchEmail = async () => {
    if (!profile || matchedProperties.length === 0) {
      toast.error("Nenhum imóvel para enviar");
      return;
    }

    setSending(true);

    try {
      const topMatches = matchedProperties.slice(0, 5);
      
      let emailBody = `Olá ${profile.buyer_name},\n\n`;
      emailBody += `Encontrámos ${matchedProperties.length} imóveis que correspondem ao seu perfil:\n\n`;
      
      topMatches.forEach((prop, idx) => {
        emailBody += `${idx + 1}. ${prop.title}\n`;
        emailBody += `   📍 ${prop.city}\n`;
        emailBody += `   💰 €${prop.price?.toLocaleString()}\n`;
        emailBody += `   ⭐ Match: ${prop.matchScore.score}%\n`;
        emailBody += `   🔗 Ver: ${window.location.origin}${createPageUrl('PropertyDetails')}?id=${prop.id}\n\n`;
      });

      emailBody += `\nPara ver todos os imóveis, contacte-nos.\n\nCumprimentos,\nA sua equipa`;

      await base44.integrations.Core.SendEmail({
        to: profile.buyer_email,
        subject: `${matchedProperties.length} imóveis que correspondem ao seu perfil`,
        body: emailBody
      });

      toast.success("Email enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar email");
      console.error(error);
    }

    setSending(false);
  };

  const getMatchColor = (score) => {
    if (score >= 90) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 75) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-orange-100 text-orange-800 border-orange-300";
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    toast.success("Pesos resetados para padrão");
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Imóveis Correspondentes - {profile.buyer_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="traditional" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="traditional">
            <TrendingUp className="w-4 h-4 mr-2" />
            Matching Tradicional
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Sparkles className="w-4 h-4 mr-2" />
            Recomendações IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traditional" className="space-y-4 mt-4">
          {/* Weights Configuration */}
          <Card className="border-purple-500 bg-purple-50">
            <CardContent className="p-4">
              <button
                onClick={() => setShowWeights(!showWeights)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">Configurar Pesos de Matching</span>
                </div>
                {showWeights ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {showWeights && (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-purple-700">Ajuste a importância de cada critério (0-100)</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(weights).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm capitalize">
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
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={resetWeights}>
                      Resetar Padrão
                    </Button>
                    <p className="text-xs text-purple-600 flex items-center">
                      Total de pontos: {Object.values(weights).reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Summary */}
          <Card className="border-blue-500 bg-blue-50">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-600 mb-1">Tipo de Negócio</p>
                  <Badge variant="outline">
                    {profile.listing_type === 'sale' ? '💰 Venda' : profile.listing_type === 'rent' ? '🏠 Arrendamento' : '🔄 Ambos'}
                  </Badge>
                </div>
                {profile.property_types?.length > 0 && (
                  <div>
                    <p className="text-slate-600 mb-1">Tipos de Imóvel</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.property_types.map((type, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.locations?.length > 0 && (
                  <div>
                    <p className="text-slate-600 mb-1">Localizações</p>
                    <p className="font-medium text-slate-900">{profile.locations.join(', ')}</p>
                  </div>
                )}
                {(profile.budget_min || profile.budget_max) && (
                  <div>
                    <p className="text-slate-600 mb-1">Orçamento</p>
                    <p className="font-medium text-slate-900">
                      {profile.budget_min && `€${profile.budget_min.toLocaleString()}`}
                      {profile.budget_min && profile.budget_max && ' - '}
                      {profile.budget_max && `€${profile.budget_max.toLocaleString()}`}
                    </p>
                  </div>
                )}
                {profile.bedrooms_min && (
                  <div>
                    <p className="text-slate-600 mb-1">Quartos</p>
                    <p className="font-medium text-slate-900">Mínimo {profile.bedrooms_min}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Home className="w-5 h-5 text-blue-600" />
              {matchedProperties.length} Imóveis Encontrados
            </h3>
            {matchedProperties.length > 0 && (
              <Button onClick={sendMatchEmail} disabled={sending}>
                <Mail className="w-4 h-4 mr-2" />
                {sending ? 'A enviar...' : 'Enviar Email'}
              </Button>
            )}
          </div>

          {/* Matched Properties */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
            </div>
          ) : matchedProperties.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhum imóvel corresponde aos critérios deste perfil</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matchedProperties.map((property) => (
                <Card key={property.id} className={`border-2 ${getMatchColor(property.matchScore.score)}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {property.images?.[0] ? (
                          <img 
                            src={property.images[0]} 
                            alt={property.title}
                            className="w-40 h-40 object-cover rounded-lg"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-40 h-40 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Home className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-lg truncate">{property.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                              <MapPin className="w-4 h-4" />
                              {property.city}, {property.state}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getMatchColor(property.matchScore.score)}>
                              <Star className="w-3 h-3 mr-1" />
                              {property.matchScore.score}% Match
                            </Badge>
                            <p className="text-xl font-bold text-slate-900">
                              €{property.price?.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-slate-700 mb-3">
                          {property.bedrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bed className="w-4 h-4" />
                              {property.bedrooms} quartos
                            </div>
                          )}
                          {property.bathrooms > 0 && (
                            <div className="flex items-center gap-1">
                              <Bath className="w-4 h-4" />
                              {property.bathrooms} WCs
                            </div>
                          )}
                          {(property.useful_area || property.square_feet) && (
                            <div className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" />
                              {property.useful_area || property.square_feet}m²
                            </div>
                          )}
                          {property.images?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="w-4 h-4" />
                              {property.images.length} fotos
                            </div>
                          )}
                        </div>

                        {/* Match Details */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {property.matchScore.details.slice(0, 6).map((detail, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className={`text-xs ${detail.match ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'}`}
                            >
                              {detail.match ? '✓' : '✗'} {detail.label} ({detail.points}pts)
                            </Badge>
                          ))}
                        </div>

                        {/* Expandable Details */}
                        <Collapsible open={expandedProperty === property.id} onOpenChange={() => setExpandedProperty(expandedProperty === property.id ? null : property.id)}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="mb-2">
                              {expandedProperty === property.id ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                              {expandedProperty === property.id ? 'Menos detalhes' : 'Mais detalhes'}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 pt-3 border-t">
                            {property.description && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">Descrição:</p>
                                <p className="text-sm text-slate-600 line-clamp-3">{property.description}</p>
                              </div>
                            )}
                            
                            {property.amenities?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-700 mb-1">Comodidades:</p>
                                <div className="flex flex-wrap gap-1">
                                  {property.amenities.map((amenity, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">{amenity}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <p className="text-xs font-semibold text-slate-700 mb-2">Breakdown de Score:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(property.matchScore.breakdown).map(([key, value]) => (
                                  <div key={key} className="flex items-center justify-between">
                                    <span className="text-slate-600 capitalize">{key.replace('_', ' ')}:</span>
                                    <span className={`font-semibold ${value.matched ? 'text-green-600' : 'text-red-600'}`}>
                                      {Math.round(value.score)}/{value.max}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        <div className="flex gap-2 flex-wrap">
                          <Link to={`${createPageUrl('PropertyDetails')}?id=${property.id}`} target="_blank">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </Link>
                          
                          {suggestingProperty === property.id ? (
                            <div className="flex-1 flex gap-2">
                              <Textarea
                                value={suggestionNote}
                                onChange={(e) => setSuggestionNote(e.target.value)}
                                placeholder="Nota sobre esta sugestão..."
                                className="h-20 text-sm"
                              />
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleSuggestProperty(property)}
                                  disabled={updateProfileMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Confirmar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSuggestingProperty(null);
                                    setSuggestionNote("");
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => setSuggestingProperty(property.id)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <ThumbsUp className="w-4 h-4 mr-2" />
                              Sugerir ao Cliente
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai">
          <AIRecommendationsPanel profile={profile} />
        </TabsContent>
      </Tabs>
      </DialogContent>
    </Dialog>
  );
}