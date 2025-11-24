import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, Loader2, ExternalLink, MapPin, Bed, Bath, Maximize, TrendingUp, Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AIMatching({ profiles }) {
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = React.useState(null);
  const [selectedProperty, setSelectedProperty] = React.useState(null);
  const [matching, setMatching] = React.useState(false);
  const [matches, setMatches] = React.useState(null);
  const [reverseMode, setReverseMode] = React.useState(false); // New state for toggling mode

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BuyerProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
    },
  });

  const findMatchesForClient = async () => {
    if (!selectedProfile) {
      toast.error("Selecione um perfil de cliente");
      return;
    }

    setMatching(true);
    setMatches(null);

    try {
      let filteredProperties = properties.filter(p => {
        if (p.status !== 'active') return false;
        if (selectedProfile.listing_type !== 'both' && p.listing_type !== selectedProfile.listing_type) return false;
        if (selectedProfile.budget_min && p.price < selectedProfile.budget_min) return false;
        if (selectedProfile.budget_max && p.price > selectedProfile.budget_max) return false;
        if (selectedProfile.bedrooms_min && (!p.bedrooms || p.bedrooms < selectedProfile.bedrooms_min)) return false;
        if (selectedProfile.bathrooms_min && (!p.bathrooms || p.bathrooms < selectedProfile.bathrooms_min)) return false;
        if (selectedProfile.square_feet_min && (!p.square_feet || p.square_feet < selectedProfile.square_feet_min)) return false;
        if (selectedProfile.property_types && selectedProfile.property_types.length > 0) {
          if (!selectedProfile.property_types.includes(p.property_type)) return false;
        }
        if (selectedProfile.locations && selectedProfile.locations.length > 0) {
          const matchesLocation = selectedProfile.locations.some(loc => 
            p.city?.toLowerCase().includes(loc.toLowerCase()) ||
            p.state?.toLowerCase().includes(loc.toLowerCase()) ||
            loc.toLowerCase().includes(p.city?.toLowerCase()) ||
            loc.toLowerCase().includes(p.state?.toLowerCase())
          );
          if (!matchesLocation) return false;
        }
        return true;
      });

      if (filteredProperties.length === 0) {
        setMatches({ type: 'properties', items: [], message: "Nenhum imóvel encontrado com os critérios especificados" });
        setMatching(false);
        return;
      }

      const propertiesData = filteredProperties.slice(0, 20).map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        city: p.city,
        state: p.state,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        square_feet: p.square_feet,
        property_type: p.property_type,
        amenities: p.amenities,
        description: p.description
      }));

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `És um assistente de matching de imóveis. Tens um cliente com as seguintes preferências:

PERFIL DO CLIENTE:
- Nome: ${selectedProfile.buyer_name}
- Tipo de anúncio: ${selectedProfile.listing_type === 'sale' ? 'Compra' : selectedProfile.listing_type === 'rent' ? 'Arrendamento' : 'Ambos'}
- Orçamento: €${selectedProfile.budget_min?.toLocaleString() || '0'} - €${selectedProfile.budget_max?.toLocaleString() || '∞'}
- Localizações: ${selectedProfile.locations?.join(', ') || 'Qualquer'}
- Tipos de imóvel: ${selectedProfile.property_types?.map(t => t).join(', ') || 'Qualquer'}
- Quartos mínimos: ${selectedProfile.bedrooms_min || 'Qualquer'}
- Casas de banho mínimas: ${selectedProfile.bathrooms_min || 'Qualquer'}
- Área mínima: ${selectedProfile.square_feet_min || 'Qualquer'}m²
- Comodidades desejadas: ${selectedProfile.desired_amenities?.join(', ') || 'Nenhuma específica'}
- Notas: ${selectedProfile.additional_notes || 'Nenhuma'}

IMÓVEIS DISPONÍVEIS:
${JSON.stringify(propertiesData, null, 2)}

Analisa cada imóvel e atribui uma pontuação de match de 0 a 100, considerando:
1. Preço dentro do orçamento (peso: 25%)
2. Localização preferida (peso: 20%)
3. Número de quartos e casas de banho (peso: 20%)
4. Área (peso: 15%)
5. Comodidades desejadas (peso: 10%)
6. Tipo de imóvel (peso: 10%)

Para cada imóvel, fornece:
- match_score: número de 0 a 100
- match_reasons: lista de razões pelas quais é um bom match (máximo 3 razões)
- concerns: lista de preocupações ou pontos negativos (máximo 2)

Ordena os imóveis por match_score (maior primeiro) e retorna apenas os top 10.`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  property_id: { type: "string" },
                  match_score: { type: "number" },
                  match_reasons: { type: "array", items: { type: "string" } },
                  concerns: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      const rankedProperties = aiResult.matches.map(match => {
        const property = filteredProperties.find(p => p.id === match.property_id);
        return {
          ...property,
          match_score: match.match_score,
          match_reasons: match.match_reasons,
          concerns: match.concerns
        };
      }).filter(p => p);

      setMatches({
        type: 'properties',
        items: rankedProperties,
        profile: selectedProfile,
        totalFound: filteredProperties.length
      });

      updateProfileMutation.mutate({
        id: selectedProfile.id,
        data: { last_match_date: new Date().toISOString() }
      });

    } catch (error) {
      toast.error("Erro ao processar matches");
      console.error(error);
    }

    setMatching(false);
  };

  const findMatchesForProperty = async () => {
    if (!selectedProperty) {
      toast.error("Selecione um imóvel");
      return;
    }

    setMatching(true);
    setMatches(null);

    try {
      const activeProfiles = profiles.filter(p => p.status === 'active');
      
      const matchingProfiles = activeProfiles.filter(profile => {
        // Filter profiles based on selectedProperty attributes
        if (profile.listing_type !== 'both' && profile.listing_type !== selectedProperty.listing_type) return false;
        if (profile.budget_min && selectedProperty.price < profile.budget_min) return false;
        if (profile.budget_max && selectedProperty.price > profile.budget_max) return false;
        if (profile.bedrooms_min && (!selectedProperty.bedrooms || selectedProperty.bedrooms < profile.bedrooms_min)) return false;
        if (profile.bathrooms_min && (!selectedProperty.bathrooms || selectedProperty.bathrooms < profile.bathrooms_min)) return false;
        if (profile.square_feet_min && (!selectedProperty.square_feet || selectedProperty.square_feet < profile.square_feet_min)) return false;
        if (profile.property_types?.length > 0 && !profile.property_types.includes(selectedProperty.property_type)) return false;
        if (profile.locations?.length > 0) {
          const matchesLoc = profile.locations.some(loc =>
            selectedProperty.city?.toLowerCase().includes(loc.toLowerCase()) ||
            selectedProperty.state?.toLowerCase().includes(loc.toLowerCase())
          );
          if (!matchesLoc) return false;
        }
        return true;
      });

      if (matchingProfiles.length === 0) {
        setMatches({ type: 'clients', items: [], message: "Nenhum cliente encontrado para este imóvel" });
        setMatching(false);
        return;
      }

      const profilesData = matchingProfiles.slice(0, 20).map(p => ({
        id: p.id,
        buyer_name: p.buyer_name,
        buyer_email: p.buyer_email,
        listing_type: p.listing_type,
        budget_min: p.budget_min,
        budget_max: p.budget_max,
        locations: p.locations,
        property_types: p.property_types,
        bedrooms_min: p.bedrooms_min,
        bathrooms_min: p.bathrooms_min,
        square_feet_min: p.square_feet_min,
        desired_amenities: p.desired_amenities,
        additional_notes: p.additional_notes
      }));

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `És um assistente de matching de imóveis. Tens este imóvel:

IMÓVEL:
- Título: ${selectedProperty.title}
- Preço: €${selectedProperty.price?.toLocaleString() || 'N/A'}
- Localização: ${selectedProperty.city}, ${selectedProperty.state}
- Tipo: ${selectedProperty.property_type}
- Quartos: ${selectedProperty.bedrooms || 0}
- Casas de banho: ${selectedProperty.bathrooms || 0}
- Área: ${selectedProperty.square_feet || 0}m²
- Comodidades: ${selectedProperty.amenities?.join(', ') || 'Nenhuma'}
- Tipo de anúncio: ${selectedProperty.listing_type === 'sale' ? 'Venda' : selectedProperty.listing_type === 'rent' ? 'Arrendamento' : 'Ambos'}

CLIENTES POTENCIAIS:
${JSON.stringify(profilesData, null, 2)}

Analisa cada cliente potencial e atribui uma pontuação de match de 0 a 100, considerando quão bem o imóvel corresponde às suas preferências:
1. Orçamento do cliente vs preço do imóvel (peso: 25%)
2. Localização preferida do cliente vs localização do imóvel (peso: 20%)
3. Número de quartos e casas de banho (mínimo) do cliente vs imóvel (peso: 20%)
4. Área (mínima) do cliente vs imóvel (peso: 15%)
5. Comodidades desejadas do cliente vs comodidades do imóvel (peso: 10%)
6. Tipo de imóvel preferido do cliente vs tipo do imóvel (peso: 10%)

Para cada cliente, fornece:
- match_score: número de 0 a 100
- match_reasons: lista de razões pelas quais o imóvel é um bom match para este cliente (máximo 3 razões)
- concerns: lista de preocupações ou pontos negativos (máximo 2)

Ordena os clientes por match_score (maior primeiro) e retorna apenas os top 10.`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  profile_id: { type: "string" },
                  match_score: { type: "number" },
                  match_reasons: { type: "array", items: { type: "string" } },
                  concerns: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      const rankedProfiles = aiResult.matches.map(match => {
        const profile = matchingProfiles.find(p => p.id === match.profile_id);
        return {
          ...profile,
          match_score: match.match_score,
          match_reasons: match.match_reasons,
          concerns: match.concerns
        };
      }).filter(p => p);

      setMatches({
        type: 'clients',
        items: rankedProfiles,
        property: selectedProperty,
        totalFound: matchingProfiles.length
      });

    } catch (error) {
      toast.error("Erro ao processar matches para imóvel");
      console.error(error);
    }

    setMatching(false);
  };

  const sendMatchesToClient = async () => {
    if (!matches || !matches.items || matches.items.length === 0 || !matches.profile) {
      toast.error("Nenhum match para enviar");
      return;
    }

    try {
      const topMatches = matches.items.slice(0, 5); // Assuming matches.items now contains properties
      const emailBody = `Olá ${matches.profile.buyer_name},

Encontrámos ${matches.items.length} imóveis que correspondem às suas preferências!

MELHORES MATCHES:

${topMatches.map((p, i) => `
${i + 1}. ${p.title}
   📍 ${p.city}, ${p.state}
   💰 €${p.price?.toLocaleString() || 'N/A'}
   🛏️ ${p.bedrooms || 0} quartos • 🚿 ${p.bathrooms || 0} WC • 📐 ${p.square_feet || 0}m²
   ⭐ Match: ${p.match_score}%
   
   ✅ Porquê este imóvel:
   ${p.match_reasons?.map(r => `   • ${r}`).join('\n')}
   
   Ver detalhes: ${window.location.origin}${createPageUrl("PropertyDetails")}?id=${p.id}
`).join('\n---\n')}

Para ver todos os ${matches.items.length} imóveis encontrados, contacte o seu agente.

Cumprimentos,
Equipa Zugruppe`;

      await base44.integrations.Core.SendEmail({
        to: matches.profile.buyer_email,
        subject: `🏠 ${matches.items.length} Imóveis Encontrados para Si!`,
        body: emailBody
      });

      toast.success(`Email enviado para ${matches.profile.buyer_email}`);
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  const notifyClients = async () => {
    if (!matches || matches.type !== 'clients' || !matches.items || matches.items.length === 0 || !matches.property) {
      toast.error("Nenhum cliente para notificar ou imóvel selecionado");
      return;
    }

    try {
      const topClients = matches.items.slice(0, 10);
      
      for (const client of topClients) {
        await base44.integrations.Core.SendEmail({
          to: client.buyer_email,
          subject: `🏠 Novo Imóvel Perfeito Para Si: ${matches.property.title}!`,
          body: `Olá ${client.buyer_name},

Temos um novo imóvel que pode ser exatamente o que procura!

IMÓVEL:
- Título: ${matches.property.title}
- Preço: €${matches.property.price?.toLocaleString() || 'N/A'}
- Localização: ${matches.property.city}, ${matches.property.state}
- Tipo: ${matches.property.property_type}
- Quartos: ${matches.property.bedrooms || 0}
- Casas de banho: ${matches.property.bathrooms || 0}
- Área: ${matches.property.square_feet || 0}m²
- Comodidades: ${matches.property.amenities?.join(', ') || 'Nenhuma'}

⭐ Match: ${client.match_score}%
✅ Porquê este imóvel para si:
${client.match_reasons?.map(r => `• ${r}`).join('\n')}

${matches.property.description ? `Descrição: ${matches.property.description.substring(0, 200)}...` : ''}

Ver detalhes: ${window.location.origin}${createPageUrl("PropertyDetails")}?id=${matches.property.id}

Cumprimentos,
Equipa Zugruppe`
        });
      }

      toast.success(`Notificações enviadas para ${topClients.length} clientes`);
    } catch (error) {
      toast.error("Erro ao enviar notificações");
      console.error(error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-blue-600 bg-blue-50";
    if (score >= 40) return "text-amber-600 bg-amber-50";
    return "text-slate-600 bg-slate-50";
  };

  const activeProfiles = profiles.filter(p => p.status === 'active');
  const activeProperties = properties.filter(p => p.status === 'active');

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600" />
            Matching Automático com IA
          </CardTitle>
          <p className="text-sm text-slate-600">
            A IA analisa e recomenda os melhores matches entre clientes e imóveis
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={!reverseMode ? "default" : "outline"}
              onClick={() => {
                setReverseMode(false);
                setMatches(null);
                setSelectedProperty(null); // Clear property selection when switching mode
              }}
              size="sm"
              className={!reverseMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-700"}
            >
              Imóveis para Cliente
            </Button>
            <Button
              variant={reverseMode ? "default" : "outline"}
              onClick={() => {
                setReverseMode(true);
                setMatches(null);
                setSelectedProfile(null); // Clear profile selection when switching mode
              }}
              size="sm"
              className={reverseMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-700"}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clientes para Imóvel
            </Button>
          </div>

          <div className="flex gap-4">
            {!reverseMode ? (
              <div className="flex-1">
                <Select 
                  value={selectedProfile?.id || ""} 
                  onValueChange={(id) => {
                    const profile = activeProfiles.find(p => p.id === id);
                    setSelectedProfile(profile);
                    setMatches(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um perfil de cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.buyer_name} - {p.buyer_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex-1">
                <Select 
                  value={selectedProperty?.id || ""} 
                  onValueChange={(id) => {
                    const property = activeProperties.find(p => p.id === id);
                    setSelectedProperty(property);
                    setMatches(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um imóvel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProperties.slice(0, 50).map(p => ( // Limit properties for dropdown to avoid too many items
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} - €{p.price?.toLocaleString()} ({p.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button 
              onClick={reverseMode ? findMatchesForProperty : findMatchesForClient}
              disabled={matching || (reverseMode ? !selectedProperty : !selectedProfile)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {matching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Encontrar Matches
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {matches && (
        <>
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    {matches.items.length} Matches Encontrados
                  </h3>
                  {matches.type === 'properties' ? (
                    <p className="text-slate-700">
                      Para: <strong>{matches.profile.buyer_name}</strong> ({matches.profile.buyer_email})
                    </p>
                  ) : (
                    <p className="text-slate-700">
                      Para o imóvel: <strong>{matches.property.title}</strong>
                    </p>
                  )}
                  {matches.totalFound > matches.items.length && (
                    <p className="text-sm text-slate-600 mt-1">
                      {matches.totalFound} correspondiam aos critérios, a mostrar os top {matches.items.length}
                    </p>
                  )}
                </div>
                {matches.items.length > 0 && (
                  <Button 
                    onClick={matches.type === 'properties' ? sendMatchesToClient : notifyClients}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {matches.type === 'properties' ? (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar por Email
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Notificar Clientes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {matches.items.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Sparkles className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{matches.message || "Nenhum match encontrado"}</h3>
                <p className="text-slate-600">
                  {matches.type === 'properties' ? 
                    "Tente ajustar os critérios do perfil do cliente" :
                    "Nenhum cliente corresponde a este imóvel no momento"}
                </p>
              </CardContent>
            </Card>
          ) : matches.type === 'properties' ? (
            <div className="grid gap-6">
              {matches.items.map((property) => (
                <Card key={property.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-80 h-64">
                      <img
                        src={property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={`${getScoreColor(property.match_score)} border-0 text-lg px-3 py-1`}>
                              <TrendingUp className="w-4 h-4 mr-1" />
                              {property.match_score}% Match
                            </Badge>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 mb-2">{property.title}</h3>
                          <div className="flex items-center gap-4 text-slate-600 mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {property.city}, {property.state}
                            </div>
                            <div className="text-2xl font-bold text-slate-900">
                              €{property.price?.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Bed className="w-4 h-4" />
                              {property.bedrooms || 0} quartos
                            </div>
                            <div className="flex items-center gap-1">
                              <Bath className="w-4 h-4" />
                              {property.bathrooms || 0} WC
                            </div>
                            <div className="flex items-center gap-1">
                              <Maximize className="w-4 h-4" />
                              {property.square_feet || 0}m²
                            </div>
                          </div>
                        </div>
                      </div>

                      {property.match_reasons && property.match_reasons.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-green-700 text-sm mb-2">✅ Porquê este imóvel:</h4>
                          <ul className="space-y-1">
                            {property.match_reasons.map((reason, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {property.concerns && property.concerns.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-amber-700 text-sm mb-2">⚠️ Pontos a considerar:</h4>
                          <ul className="space-y-1">
                            {property.concerns.map((concern, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-amber-600">•</span>
                                {concern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Link to={`${createPageUrl("PropertyDetails")}?id=${property.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.items.map((client) => (
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={`${getScoreColor(client.match_score)} border-0 text-lg px-3 py-1`}>
                            <TrendingUp className="w-4 h-4 mr-1" />
                            {client.match_score}% Match
                          </Badge>
                          <h3 className="text-xl font-semibold text-slate-900">{client.buyer_name}</h3>
                        </div>

                        <div className="text-sm text-slate-600 mb-4">
                          <p>{client.buyer_email}</p>
                          {client.buyer_phone && <p>{client.buyer_phone}</p>}
                          {client.budget_min && client.budget_max && (
                            <p className="mt-1">
                              Orçamento: €{client.budget_min.toLocaleString()} - €{client.budget_max.toLocaleString()}
                            </p>
                          )}
                           {client.property_types?.length > 0 && (
                            <p className="mt-1">
                              Tipo(s) de imóvel: {client.property_types.join(', ')}
                            </p>
                          )}
                          {client.locations?.length > 0 && (
                            <p className="mt-1">
                              Localização(ões): {client.locations.join(', ')}
                            </p>
                          )}
                        </div>

                        {client.match_reasons && client.match_reasons.length > 0 && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-green-700 text-sm mb-2">✅ Porquê este cliente:</h4>
                            <ul className="space-y-1">
                              {client.match_reasons.map((reason, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="text-green-600">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {client.concerns && client.concerns.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-amber-700 text-sm mb-2">⚠️ Pontos a considerar:</h4>
                            <ul className="space-y-1">
                              {client.concerns.map((concern, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="text-amber-600">•</span>
                                  {concern}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}