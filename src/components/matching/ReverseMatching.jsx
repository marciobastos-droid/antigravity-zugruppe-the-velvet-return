import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Home, Users, Search, Star, MapPin, Bed, Bath, Maximize, 
  Euro, Mail, Phone, Target, TrendingUp, ChevronDown, ChevronUp,
  ExternalLink, MessageSquare, Calendar, Info
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ReverseMatching() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [expandedClient, setExpandedClient] = useState(null);
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list('-created_date')
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const activeProperties = properties.filter(p => p.status === 'active');
  const activeProfiles = profiles.filter(p => p.status === 'active');

  const filteredProperties = activeProperties.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return p.title?.toLowerCase().includes(search) ||
           p.city?.toLowerCase().includes(search) ||
           p.ref_id?.toLowerCase().includes(search);
  });

  // Calculate match score (property -> profile)
  const calculateReverseMatchScore = (property, profile) => {
    if (!property || !profile) return { score: 0, details: [], explanation: '' };

    let score = 0;
    let maxScore = 0;
    const details = [];
    const explanationParts = [];

    // 1. Listing type (30 pts)
    maxScore += 30;
    if (property.listing_type === profile.listing_type || profile.listing_type === 'both') {
      score += 30;
      details.push({ label: 'Tipo negócio', match: true, points: 30 });
      explanationParts.push(`✓ Procura ${profile.listing_type === 'sale' ? 'comprar' : 'arrendar'}`);
    } else {
      details.push({ label: 'Tipo negócio', match: false, points: 0 });
      explanationParts.push(`✗ Procura ${profile.listing_type}, imóvel é ${property.listing_type}`);
    }

    // 2. Property type (25 pts)
    if (profile.property_types?.length > 0) {
      maxScore += 25;
      if (profile.property_types.includes(property.property_type)) {
        score += 25;
        details.push({ label: 'Tipo imóvel', match: true, points: 25 });
        explanationParts.push(`✓ Procura ${property.property_type}`);
      } else {
        details.push({ label: 'Tipo imóvel', match: false, points: 0 });
        explanationParts.push(`✗ Procura ${profile.property_types.join(', ')}`);
      }
    }

    // 3. Location (25 pts)
    if (profile.locations?.length > 0) {
      maxScore += 25;
      const locationMatch = profile.locations.some(loc => 
        property.city?.toLowerCase().includes(loc.toLowerCase()) ||
        property.state?.toLowerCase().includes(loc.toLowerCase())
      );
      if (locationMatch) {
        score += 25;
        details.push({ label: 'Localização', match: true, points: 25 });
        explanationParts.push(`✓ Localização desejada`);
      } else {
        details.push({ label: 'Localização', match: false, points: 0 });
        explanationParts.push(`✗ Procura ${profile.locations.join(', ')}`);
      }
    }

    // 4. Budget (15 pts)
    if (profile.budget_min || profile.budget_max) {
      maxScore += 15;
      const price = property.price || 0;
      const inBudget = 
        (!profile.budget_min || price >= profile.budget_min) &&
        (!profile.budget_max || price <= profile.budget_max);
      
      if (inBudget) {
        score += 15;
        details.push({ label: 'Orçamento', match: true, points: 15 });
        explanationParts.push(`✓ Dentro do orçamento (€${price.toLocaleString()})`);
      } else {
        details.push({ label: 'Orçamento', match: false, points: 0 });
        if (price > (profile.budget_max || 0)) {
          explanationParts.push(`✗ Acima do orçamento (+€${(price - profile.budget_max).toLocaleString()})`);
        } else {
          explanationParts.push(`✗ Abaixo do mínimo desejado`);
        }
      }
    }

    // 5. Bedrooms (10 pts)
    if (profile.bedrooms_min) {
      maxScore += 10;
      if (property.bedrooms >= profile.bedrooms_min) {
        score += 10;
        details.push({ label: 'Quartos', match: true, points: 10 });
        explanationParts.push(`✓ T${property.bedrooms} (min: T${profile.bedrooms_min})`);
      } else {
        details.push({ label: 'Quartos', match: false, points: 0 });
        explanationParts.push(`✗ T${property.bedrooms} (min: T${profile.bedrooms_min})`);
      }
    }

    // 6. Bathrooms (5 pts)
    if (profile.bathrooms_min) {
      maxScore += 5;
      if (property.bathrooms >= profile.bathrooms_min) {
        score += 5;
        details.push({ label: 'WC', match: true, points: 5 });
      } else {
        details.push({ label: 'WC', match: false, points: 0 });
      }
    }

    // 7. Area (5 pts)
    if (profile.square_feet_min) {
      maxScore += 5;
      const area = property.useful_area || property.square_feet || 0;
      if (area >= profile.square_feet_min) {
        score += 5;
        details.push({ label: 'Área', match: true, points: 5 });
        explanationParts.push(`✓ ${area}m² (min: ${profile.square_feet_min}m²)`);
      } else {
        details.push({ label: 'Área', match: false, points: 0 });
      }
    }

    // 8. Amenities (10 pts)
    if (profile.desired_amenities?.length > 0 && property.amenities?.length > 0) {
      maxScore += 10;
      const matchedAmenities = profile.desired_amenities.filter(desired =>
        property.amenities.some(a => a.toLowerCase().includes(desired.toLowerCase()))
      );
      const amenitiesScore = (matchedAmenities.length / profile.desired_amenities.length) * 10;
      score += amenitiesScore;
      details.push({ label: 'Comodidades', match: amenitiesScore > 0, points: Math.round(amenitiesScore) });
      if (matchedAmenities.length > 0) {
        explanationParts.push(`✓ ${matchedAmenities.length}/${profile.desired_amenities.length} comodidades`);
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const explanation = explanationParts.join('\n');
    
    return { score: percentage, details, explanation };
  };

  // Find matching profiles for selected property
  const matchedProfiles = selectedProperty ? activeProfiles
    .map(profile => ({
      ...profile,
      matchData: calculateReverseMatchScore(selectedProperty, profile)
    }))
    .filter(p => p.matchData.score >= 40)
    .sort((a, b) => b.matchData.score - a.matchData.score)
    : [];

  const getMatchColor = (score) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 75) return "bg-blue-100 text-blue-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-orange-100 text-orange-800";
  };

  const sendMatchToClient = async (profile) => {
    try {
      const emailBody = `Olá ${profile.buyer_name},\n\nEncontrámos um imóvel que pode interessar:\n\n${selectedProperty.title}\n📍 ${selectedProperty.city}, ${selectedProperty.state}\n💰 €${selectedProperty.price?.toLocaleString()}\n${selectedProperty.bedrooms ? `🛏️ T${selectedProperty.bedrooms}` : ''}\n⭐ Match: ${profile.matchData.score}%\n\n${profile.matchData.explanation}\n\nVer imóvel: ${window.location.origin}${createPageUrl('PropertyDetails')}?id=${selectedProperty.id}\n\nCumprimentos,\nA sua equipa`;

      await base44.integrations.Core.SendEmail({
        to: profile.buyer_email,
        subject: `Novo imóvel: ${selectedProperty.title}`,
        body: emailBody
      });

      toast.success(`Email enviado para ${profile.buyer_name}`);
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="w-6 h-6 text-purple-600" />
          Match Reverso: Imóvel → Clientes
        </h2>
        <p className="text-slate-600 mt-1">
          Encontre os clientes ideais para um imóvel específico
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Imóveis Ativos</p>
            <p className="text-2xl font-bold text-slate-900">{activeProperties.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Perfis Ativos</p>
            <p className="text-2xl font-bold text-slate-900">{activeProfiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Matches Encontrados</p>
            <p className="text-2xl font-bold text-purple-600">{matchedProfiles.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Property Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Imóvel</CardTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar imóvel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {loadingProperties ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto" />
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Nenhum imóvel encontrado</p>
                  </div>
                ) : (
                  filteredProperties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => setSelectedProperty(property)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                        selectedProperty?.id === property.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex gap-3">
                        {property.images?.[0] ? (
                          <img 
                            src={property.images[0]} 
                            alt={property.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                            <Home className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{property.title}</p>
                          <p className="text-sm text-slate-600 truncate">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {property.city}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 mt-1">
                            €{property.price?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Matched Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedProperty ? (
                <>Clientes Compatíveis ({matchedProfiles.length})</>
              ) : (
                'Selecione um Imóvel'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProperty ? (
              <div className="text-center py-12">
                <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Selecione um imóvel para ver clientes compatíveis</p>
              </div>
            ) : loadingProfiles ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
              </div>
            ) : matchedProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhum cliente compatível encontrado</p>
                <p className="text-sm text-slate-500 mt-2">
                  Tente ajustar os critérios ou adicionar mais perfis de cliente
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {matchedProfiles.map((profile) => {
                    const contact = contacts.find(c => c.email === profile.buyer_email);
                    
                    return (
                      <Card key={profile.id} className={`border-2 ${getMatchColor(profile.matchData.score)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900">{profile.buyer_name}</h4>
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                                <Mail className="w-3 h-3" />
                                {profile.buyer_email}
                              </div>
                              {profile.buyer_phone && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Phone className="w-3 h-3" />
                                  {profile.buyer_phone}
                                </div>
                              )}
                            </div>
                            <Badge className={getMatchColor(profile.matchData.score)}>
                              <Star className="w-3 h-3 mr-1" />
                              {profile.matchData.score}%
                            </Badge>
                          </div>

                          {/* Match breakdown */}
                          <div className="mb-3">
                            <Progress value={profile.matchData.score} className="h-2 mb-2" />
                            <div className="flex flex-wrap gap-1">
                              {profile.matchData.details.map((detail, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className={`text-[10px] ${detail.match ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}
                                >
                                  {detail.match ? '✓' : '✗'} {detail.label} ({detail.points})
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Expandable explanation */}
                          {expandedClient === profile.id && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-lg border text-xs">
                              <p className="font-semibold text-slate-700 mb-2">Análise Detalhada:</p>
                              <pre className="text-slate-600 whitespace-pre-line font-sans">
                                {profile.matchData.explanation}
                              </pre>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedClient(expandedClient === profile.id ? null : profile.id)}
                            >
                              {expandedClient === profile.id ? (
                                <><ChevronUp className="w-4 h-4 mr-1" /> Menos</>
                              ) : (
                                <><ChevronDown className="w-4 h-4 mr-1" /> Mais</>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendMatchToClient(profile)}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Enviar
                            </Button>

                            {contact && (
                              <Link to={`${createPageUrl('CRMAdvanced')}?tab=clients&contact=${contact.id}`}>
                                <Button size="sm" variant="outline">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Ver Perfil
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Property Summary */}
      {selectedProperty && (
        <Card className="border-purple-300 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {selectedProperty.images?.[0] && (
                <img 
                  src={selectedProperty.images[0]} 
                  alt={selectedProperty.title}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg">{selectedProperty.title}</h3>
                <p className="text-slate-600 text-sm">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {selectedProperty.city}, {selectedProperty.state}
                </p>
                <p className="text-2xl font-bold text-purple-900 mt-2">
                  €{selectedProperty.price?.toLocaleString()}
                </p>
                <div className="flex gap-3 mt-2 text-sm text-slate-700">
                  {selectedProperty.bedrooms > 0 && (
                    <span><Bed className="w-4 h-4 inline mr-1" />T{selectedProperty.bedrooms}</span>
                  )}
                  {selectedProperty.bathrooms > 0 && (
                    <span><Bath className="w-4 h-4 inline mr-1" />{selectedProperty.bathrooms} WC</span>
                  )}
                  {(selectedProperty.useful_area || selectedProperty.square_feet) && (
                    <span><Maximize className="w-4 h-4 inline mr-1" />{selectedProperty.useful_area || selectedProperty.square_feet}m²</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}