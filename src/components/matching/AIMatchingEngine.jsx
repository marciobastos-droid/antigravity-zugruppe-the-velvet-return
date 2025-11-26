import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Loader2, Search, Users, Building2, 
  Target, TrendingUp, Heart, Star, MapPin, Euro,
  Bed, Bath, Maximize, ChevronRight, Send, Check,
  Brain, Zap, Filter, RefreshCw, Eye, Mail, Phone,
  ThumbsUp, ThumbsDown, MessageSquare, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AIMatchingEngine() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profiles");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matching, setMatching] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMatchDetails, setShowMatchDetails] = useState(null);
  const [sendingMatch, setSendingMatch] = useState(null);

  // Fetch data
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list('-created_date')
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const { data: properties = [], isLoading: loadingProperties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['propertyInteractions'],
    queryFn: () => base44.entities.PropertyInteraction.list('-created_date')
  });

  const activeProperties = properties.filter(p => p.status === 'active' && p.availability_status === 'available');

  // Filter profiles
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = !searchTerm || 
      p.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate basic match score
  const calculateBasicScore = (profile, property) => {
    let score = 0;
    let maxScore = 0;
    const details = [];

    // Price match (25 points max)
    maxScore += 25;
    if (profile.budget_min || profile.budget_max) {
      const price = property.price || 0;
      const min = profile.budget_min || 0;
      const max = profile.budget_max || Infinity;
      
      if (price >= min && price <= max) {
        score += 25;
        details.push({ factor: "Preço dentro do orçamento", score: 25, max: 25 });
      } else if (price < min * 0.9 || price > max * 1.1) {
        details.push({ factor: "Preço fora do orçamento", score: 0, max: 25 });
      } else {
        score += 10;
        details.push({ factor: "Preço próximo do orçamento", score: 10, max: 25 });
      }
    } else {
      score += 15;
      details.push({ factor: "Sem filtro de orçamento", score: 15, max: 25 });
    }

    // Location match (25 points max)
    maxScore += 25;
    if (profile.locations?.length > 0) {
      const propertyLocation = (property.city || '').toLowerCase();
      const propertyState = (property.state || '').toLowerCase();
      const matchedLocation = profile.locations.some(loc => 
        propertyLocation.includes(loc.toLowerCase()) || 
        propertyState.includes(loc.toLowerCase()) ||
        loc.toLowerCase().includes(propertyLocation)
      );
      if (matchedLocation) {
        score += 25;
        details.push({ factor: "Localização preferida", score: 25, max: 25 });
      } else {
        details.push({ factor: "Localização diferente", score: 0, max: 25 });
      }
    } else {
      score += 15;
      details.push({ factor: "Sem filtro de localização", score: 15, max: 25 });
    }

    // Property type match (15 points max)
    maxScore += 15;
    if (profile.property_types?.length > 0) {
      if (profile.property_types.includes(property.property_type)) {
        score += 15;
        details.push({ factor: "Tipo de imóvel preferido", score: 15, max: 15 });
      } else {
        details.push({ factor: "Tipo de imóvel diferente", score: 0, max: 15 });
      }
    } else {
      score += 10;
      details.push({ factor: "Sem filtro de tipo", score: 10, max: 15 });
    }

    // Bedrooms match (15 points max)
    maxScore += 15;
    if (profile.bedrooms_min) {
      if (property.bedrooms >= profile.bedrooms_min) {
        score += 15;
        details.push({ factor: "Quartos suficientes", score: 15, max: 15 });
      } else {
        const diff = profile.bedrooms_min - property.bedrooms;
        if (diff === 1) {
          score += 5;
          details.push({ factor: "1 quarto a menos", score: 5, max: 15 });
        } else {
          details.push({ factor: "Poucos quartos", score: 0, max: 15 });
        }
      }
    } else {
      score += 10;
      details.push({ factor: "Sem filtro de quartos", score: 10, max: 15 });
    }

    // Area match (10 points max)
    maxScore += 10;
    const area = property.useful_area || property.square_feet || 0;
    if (profile.square_feet_min && area > 0) {
      if (area >= profile.square_feet_min) {
        score += 10;
        details.push({ factor: "Área suficiente", score: 10, max: 10 });
      } else {
        const ratio = area / profile.square_feet_min;
        if (ratio > 0.85) {
          score += 5;
          details.push({ factor: "Área próxima do desejado", score: 5, max: 10 });
        } else {
          details.push({ factor: "Área insuficiente", score: 0, max: 10 });
        }
      }
    } else {
      score += 7;
      details.push({ factor: "Sem filtro de área", score: 7, max: 10 });
    }

    // Listing type match (10 points max)
    maxScore += 10;
    if (profile.listing_type && profile.listing_type !== 'both') {
      if (property.listing_type === profile.listing_type) {
        score += 10;
        details.push({ factor: "Tipo de negócio correto", score: 10, max: 10 });
      } else {
        details.push({ factor: "Tipo de negócio diferente", score: 0, max: 10 });
      }
    } else {
      score += 10;
      details.push({ factor: "Aceita venda e arrendamento", score: 10, max: 10 });
    }

    return {
      score: Math.round((score / maxScore) * 100),
      details,
      rawScore: score,
      maxScore
    };
  };

  // AI-enhanced matching
  const runAIMatching = async (profile) => {
    setMatching(true);
    setMatchProgress(0);
    setMatches([]);
    setSelectedProfile(profile);

    try {
      setMatchProgress(10);
      
      // Step 1: Calculate basic scores for all properties
      const basicMatches = activeProperties.map(property => ({
        property,
        ...calculateBasicScore(profile, property)
      })).filter(m => m.score >= 30).sort((a, b) => b.score - a.score);

      setMatchProgress(30);

      if (basicMatches.length === 0) {
        setMatches([]);
        toast.info("Nenhum imóvel corresponde aos critérios básicos");
        setMatching(false);
        return;
      }

      // Step 2: Get top candidates for AI analysis
      const topCandidates = basicMatches.slice(0, 20);
      setMatchProgress(40);

      // Step 3: AI enhanced analysis
      const profileContext = `
PERFIL DO CLIENTE:
- Nome: ${profile.buyer_name}
- Tipo: ${profile.profile_type || 'comprador'}
- Orçamento: €${profile.budget_min?.toLocaleString() || 0} - €${profile.budget_max?.toLocaleString() || 'sem limite'}
- Localizações: ${profile.locations?.join(', ') || 'Qualquer'}
- Tipos de Imóvel: ${profile.property_types?.join(', ') || 'Qualquer'}
- Quartos mínimos: ${profile.bedrooms_min || 'N/A'}
- Área mínima: ${profile.square_feet_min || 'N/A'}m²
- Amenidades desejadas: ${profile.desired_amenities?.join(', ') || 'N/A'}
- Notas adicionais: ${profile.additional_notes || 'N/A'}
- Origem: ${profile.lead_source || 'N/A'}
`;

      const propertiesContext = topCandidates.map((m, i) => `
IMÓVEL #${i + 1} (Score Base: ${m.score}%):
- ID: ${m.property.id}
- Título: ${m.property.title}
- Tipo: ${m.property.property_type}
- Preço: €${m.property.price?.toLocaleString()}
- Localização: ${m.property.city}, ${m.property.state}
- Quartos: ${m.property.bedrooms || 0} | WCs: ${m.property.bathrooms || 0}
- Área: ${m.property.useful_area || m.property.square_feet || 0}m²
- Amenidades: ${m.property.amenities?.join(', ') || 'N/A'}
- Descrição: ${m.property.description?.substring(0, 200) || 'N/A'}
`).join('\n');

      setMatchProgress(50);

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `És um especialista em matching imobiliário. Analisa a compatibilidade entre o perfil do cliente e os imóveis candidatos.

${profileContext}

IMÓVEIS CANDIDATOS:
${propertiesContext}

TAREFAS:
1. Para cada imóvel, avalia a compatibilidade real considerando:
   - Alinhamento com necessidades explícitas
   - Fatores implícitos (estilo de vida, investimento, família)
   - Potencial oculto que o cliente pode não ter considerado
   - Pontos negativos e riscos

2. Gera um ranking final com scores ajustados (0-100)

3. Para os top 5, explica:
   - Por que este imóvel é bom para este cliente
   - Argumentos de venda personalizados
   - Possíveis objeções e como ultrapassá-las

Retorna análise detalhada em JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            rankings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  property_id: { type: "string" },
                  ai_score: { type: "number" },
                  compatibility_level: { type: "string", enum: ["excellent", "good", "moderate", "weak"] },
                  key_strengths: { type: "array", items: { type: "string" } },
                  potential_concerns: { type: "array", items: { type: "string" } },
                  sales_pitch: { type: "string" },
                  hidden_value: { type: "string" },
                  objection_handlers: { type: "array", items: { type: "string" } }
                }
              }
            },
            profile_insights: {
              type: "object",
              properties: {
                inferred_needs: { type: "array", items: { type: "string" } },
                buyer_persona: { type: "string" },
                decision_factors: { type: "array", items: { type: "string" } },
                recommended_approach: { type: "string" }
              }
            }
          }
        }
      });

      setMatchProgress(80);

      // Merge AI results with basic matches
      const enhancedMatches = topCandidates.map(match => {
        const aiData = aiResult.rankings?.find(r => r.property_id === match.property.id);
        return {
          ...match,
          aiScore: aiData?.ai_score || match.score,
          compatibilityLevel: aiData?.compatibility_level || 'moderate',
          keyStrengths: aiData?.key_strengths || [],
          potentialConcerns: aiData?.potential_concerns || [],
          salesPitch: aiData?.sales_pitch || '',
          hiddenValue: aiData?.hidden_value || '',
          objectionHandlers: aiData?.objection_handlers || []
        };
      }).sort((a, b) => b.aiScore - a.aiScore);

      setMatches(enhancedMatches);
      setMatchProgress(100);

      // Store profile insights
      if (aiResult.profile_insights) {
        setSelectedProfile(prev => ({
          ...prev,
          _insights: aiResult.profile_insights
        }));
      }

      toast.success(`${enhancedMatches.length} matches encontrados!`);

    } catch (error) {
      console.error("AI Matching error:", error);
      toast.error("Erro no matching com IA");
    }

    setMatching(false);
  };

  // Send match to client
  const sendMatchToClient = async (match) => {
    setSendingMatch(match.property.id);
    
    try {
      const profile = selectedProfile;
      
      // Create communication log
      await base44.entities.PropertyInteraction.create({
        profile_id: profile.id,
        property_id: match.property.id,
        interaction_type: 'contacted',
        match_score: match.aiScore,
        property_features: {
          title: match.property.title,
          price: match.property.price,
          city: match.property.city
        }
      });

      // Update profile last match date
      await base44.entities.BuyerProfile.update(profile.id, {
        last_match_date: new Date().toISOString()
      });

      toast.success("Match enviado ao cliente!");
      queryClient.invalidateQueries({ queryKey: ['propertyInteractions'] });

    } catch (error) {
      toast.error("Erro ao enviar match");
    }

    setSendingMatch(null);
  };

  const getCompatibilityColor = (level) => {
    switch (level) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'moderate': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCompatibilityLabel = (level) => {
    switch (level) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bom';
      case 'moderate': return 'Moderado';
      default: return 'Fraco';
    }
  };

  const isLoading = loadingProfiles || loadingProperties || loadingContacts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Motor de Matching com IA</h2>
              <p className="text-sm text-slate-600 font-normal">
                Encontre os imóveis perfeitos para cada cliente com inteligência artificial
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">{profiles.length}</div>
              <div className="text-sm text-slate-600">Perfis Ativos</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{activeProperties.length}</div>
              <div className="text-sm text-slate-600">Imóveis Disponíveis</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-pink-600">{interactions.length}</div>
              <div className="text-sm text-slate-600">Interações</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">
                {profiles.filter(p => p.last_match_date).length}
              </div>
              <div className="text-sm text-slate-600">Matches Enviados</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Profiles List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Perfis de Clientes
                </CardTitle>
                <Badge variant="outline">{filteredProfiles.length}</Badge>
              </div>
              
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="paused">Pausados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="p-3 space-y-2">
                  {filteredProfiles.map(profile => (
                    <div
                      key={profile.id}
                      onClick={() => runAIMatching(profile)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedProfile?.id === profile.id 
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {profile.buyer_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">{profile.buyer_name}</h4>
                            <p className="text-xs text-slate-500">{profile.buyer_email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {profile.profile_type === 'cliente_comprador' ? 'Comprador' :
                           profile.profile_type === 'cliente_vendedor' ? 'Vendedor' :
                           profile.profile_type === 'parceiro_comprador' ? 'Parceiro C.' : 'Parceiro V.'}
                        </Badge>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {profile.locations?.slice(0, 2).map((loc, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            <MapPin className="w-3 h-3 mr-1" />
                            {loc}
                          </Badge>
                        ))}
                        {profile.budget_max && (
                          <Badge variant="secondary" className="text-xs">
                            <Euro className="w-3 h-3 mr-1" />
                            até {(profile.budget_max / 1000).toFixed(0)}k
                          </Badge>
                        )}
                        {profile.bedrooms_min && (
                          <Badge variant="secondary" className="text-xs">
                            T{profile.bedrooms_min}+
                          </Badge>
                        )}
                      </div>
                      
                      {profile.last_match_date && (
                        <p className="text-xs text-slate-400 mt-2">
                          Último match: {new Date(profile.last_match_date).toLocaleDateString('pt-PT')}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {filteredProfiles.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhum perfil encontrado</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Matches Results */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Resultados do Matching
                </CardTitle>
                {matches.length > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-800">
                    {matches.length} matches
                  </Badge>
                )}
              </div>
              
              {selectedProfile && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Matching para: {selectedProfile.buyer_name}
                      </p>
                      {selectedProfile._insights?.buyer_persona && (
                        <p className="text-xs text-slate-600 mt-1">
                          Persona: {selectedProfile._insights.buyer_persona}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAIMatching(selectedProfile)}
                      disabled={matching}
                    >
                      <RefreshCw className={`w-4 h-4 mr-1 ${matching ? 'animate-spin' : ''}`} />
                      Re-analisar
                    </Button>
                  </div>
                  
                  {selectedProfile._insights?.inferred_needs?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedProfile._insights.inferred_needs.map((need, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-white">
                          {need}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {matching && (
                <div className="py-8">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Brain className="w-16 h-16 text-indigo-500 animate-pulse" />
                      <Sparkles className="w-6 h-6 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <p className="text-slate-600 mt-4 mb-2">A analisar com IA...</p>
                    <Progress value={matchProgress} className="w-64 h-2" />
                    <p className="text-xs text-slate-500 mt-1">{matchProgress}%</p>
                  </div>
                </div>
              )}
              
              {!matching && matches.length === 0 && !selectedProfile && (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Selecione um Perfil
                  </h3>
                  <p className="text-slate-500">
                    Clique num perfil à esquerda para iniciar o matching com IA
                  </p>
                </div>
              )}
              
              {!matching && matches.length === 0 && selectedProfile && (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">
                    Sem Matches
                  </h3>
                  <p className="text-slate-500">
                    Nenhum imóvel corresponde aos critérios deste perfil
                  </p>
                </div>
              )}
              
              {!matching && matches.length > 0 && (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {matches.map((match, index) => (
                      <div
                        key={match.property.id}
                        className="p-4 border rounded-lg hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex gap-4">
                          {/* Rank Badge */}
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-amber-100 text-amber-700' :
                              index === 1 ? 'bg-slate-200 text-slate-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              #{index + 1}
                            </div>
                            <div className="mt-2 text-center">
                              <div className="text-2xl font-bold text-indigo-600">{match.aiScore}%</div>
                              <Badge className={`text-xs mt-1 ${getCompatibilityColor(match.compatibilityLevel)}`}>
                                {getCompatibilityLabel(match.compatibilityLevel)}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Property Image */}
                          <div className="w-28 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                            {match.property.images?.[0] ? (
                              <img 
                                src={match.property.images[0]} 
                                alt={match.property.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-slate-300" />
                              </div>
                            )}
                          </div>
                          
                          {/* Property Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-slate-900 line-clamp-1">
                                  {match.property.title}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {match.property.city}
                                  <span className="font-semibold text-slate-900">
                                    €{match.property.price?.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                              {match.property.bedrooms > 0 && (
                                <span className="flex items-center gap-1">
                                  <Bed className="w-3.5 h-3.5" />
                                  T{match.property.bedrooms}
                                </span>
                              )}
                              {match.property.bathrooms > 0 && (
                                <span className="flex items-center gap-1">
                                  <Bath className="w-3.5 h-3.5" />
                                  {match.property.bathrooms}
                                </span>
                              )}
                              {(match.property.useful_area || match.property.square_feet) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Maximize className="w-3.5 h-3.5" />
                                  {match.property.useful_area || match.property.square_feet}m²
                                </span>
                              )}
                            </div>
                            
                            {/* Key Strengths */}
                            {match.keyStrengths?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {match.keyStrengths.slice(0, 3).map((strength, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs bg-green-50 text-green-700">
                                    <Check className="w-3 h-3 mr-1" />
                                    {strength}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => setShowMatchDetails(match)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Detalhes
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendMatchToClient(match)}
                              disabled={sendingMatch === match.property.id}
                            >
                              {sendingMatch === match.property.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-1" />
                                  Enviar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Match Details Dialog */}
      <Dialog open={!!showMatchDetails} onOpenChange={() => setShowMatchDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Análise de Match Detalhada
            </DialogTitle>
          </DialogHeader>
          
          {showMatchDetails && (
            <div className="space-y-4">
              {/* Property Summary */}
              <div className="flex gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-24 h-20 rounded-lg overflow-hidden bg-slate-200">
                  {showMatchDetails.property.images?.[0] ? (
                    <img 
                      src={showMatchDetails.property.images[0]} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{showMatchDetails.property.title}</h3>
                  <p className="text-sm text-slate-600">
                    {showMatchDetails.property.city} • €{showMatchDetails.property.price?.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-2xl font-bold text-indigo-600">{showMatchDetails.aiScore}%</div>
                    <Badge className={getCompatibilityColor(showMatchDetails.compatibilityLevel)}>
                      {getCompatibilityLabel(showMatchDetails.compatibilityLevel)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div>
                <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Breakdown do Score
                </h4>
                <div className="space-y-2">
                  {showMatchDetails.details?.map((detail, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{detail.factor}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(detail.score / detail.max) * 100} className="w-24 h-2" />
                        <span className="text-sm font-medium w-12 text-right">
                          {detail.score}/{detail.max}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales Pitch */}
              {showMatchDetails.salesPitch && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <h4 className="font-medium text-indigo-900 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Pitch de Venda Personalizado
                  </h4>
                  <p className="text-sm text-indigo-800">{showMatchDetails.salesPitch}</p>
                </div>
              )}

              {/* Key Strengths */}
              {showMatchDetails.keyStrengths?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    Pontos Fortes
                  </h4>
                  <ul className="space-y-1">
                    {showMatchDetails.keyStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Potential Concerns */}
              {showMatchDetails.potentialConcerns?.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-amber-600" />
                    Potenciais Objeções
                  </h4>
                  <ul className="space-y-1">
                    {showMatchDetails.potentialConcerns.map((c, i) => (
                      <li key={i} className="text-sm text-slate-700">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Objection Handlers */}
              {showMatchDetails.objectionHandlers?.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">Como Ultrapassar Objeções</h4>
                  <ul className="space-y-1">
                    {showMatchDetails.objectionHandlers.map((h, i) => (
                      <li key={i} className="text-sm text-amber-800">💡 {h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hidden Value */}
              {showMatchDetails.hiddenValue && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-1 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Valor Oculto
                  </h4>
                  <p className="text-sm text-purple-800">{showMatchDetails.hiddenValue}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Link 
                  to={`${createPageUrl("PropertyDetails")}?id=${showMatchDetails.property.id}`}
                  target="_blank"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Imóvel
                  </Button>
                </Link>
                <Button 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    sendMatchToClient(showMatchDetails);
                    setShowMatchDetails(null);
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar ao Cliente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}