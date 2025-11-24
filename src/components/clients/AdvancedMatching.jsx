import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Send, ExternalLink, MapPin, Bed, Bath, Maximize, TrendingUp, Bell, Star, Search, Eye, Mail, Phone, DollarSign, Home, CheckCircle, AlertCircle, ThumbsUp, ThumbsDown, Settings, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

// Default weights for criteria
const DEFAULT_WEIGHTS = {
  price: 25,
  location: 20,
  bedrooms: 15,
  bathrooms: 10,
  area: 15,
  property_type: 10,
  amenities: 5
};

const calculateMatchScore = (profile, property, customWeights = null) => {
  const weights = customWeights || DEFAULT_WEIGHTS;
  let score = 0;
  const details = [];

  // Price match (weighted)
  if (property.price && (profile.budget_min || profile.budget_max)) {
    const inBudget = (!profile.budget_min || property.price >= profile.budget_min) && 
                     (!profile.budget_max || property.price <= profile.budget_max);
    if (inBudget) {
      score += weights.price;
      const percentOfBudget = profile.budget_max ? (property.price / profile.budget_max * 100).toFixed(0) : 100;
      details.push({ type: 'success', text: `Dentro do orçamento (${percentOfBudget}% do máximo)`, weight: weights.price });
    } else {
      const diff = property.price > (profile.budget_max || Infinity) ? 
        property.price - profile.budget_max : 
        profile.budget_min - property.price;
      const proximity = 1 - Math.min(diff / (profile.budget_max || property.price), 0.5);
      const partialScore = weights.price * proximity * 0.3;
      score += partialScore;
      details.push({ type: 'warning', text: `Fora do orçamento por €${diff.toLocaleString()}`, weight: weights.price });
    }
  } else {
    score += weights.price * 0.6;
  }

  // Location match (weighted)
  if (profile.locations && profile.locations.length > 0) {
    const matchesLocation = profile.locations.some(loc => 
      property.city?.toLowerCase().includes(loc.toLowerCase()) ||
      property.state?.toLowerCase().includes(loc.toLowerCase()) ||
      loc.toLowerCase().includes(property.city?.toLowerCase())
    );
    if (matchesLocation) {
      score += weights.location;
      details.push({ type: 'success', text: `Localização desejada: ${property.city}`, weight: weights.location });
    } else {
      details.push({ type: 'warning', text: `Fora das localizações preferidas`, weight: weights.location });
    }
  } else {
    score += weights.location * 0.75;
  }

  // Bedrooms match (weighted)
  if (profile.bedrooms_min) {
    if (property.bedrooms >= profile.bedrooms_min) {
      score += weights.bedrooms;
      if (property.bedrooms > profile.bedrooms_min) {
        details.push({ type: 'success', text: `${property.bedrooms} quartos (pediu mín. ${profile.bedrooms_min})`, weight: weights.bedrooms });
      }
    } else {
      const shortage = profile.bedrooms_min - property.bedrooms;
      const partialScore = weights.bedrooms * Math.max(0, 1 - shortage * 0.3);
      score += partialScore;
      details.push({ type: 'warning', text: `Apenas ${property.bedrooms} quartos (pedia ${profile.bedrooms_min})`, weight: weights.bedrooms });
    }
  } else {
    score += weights.bedrooms * 0.67;
  }

  // Bathrooms match (weighted)
  if (profile.bathrooms_min) {
    if (property.bathrooms >= profile.bathrooms_min) {
      score += weights.bathrooms;
    } else {
      const shortage = profile.bathrooms_min - property.bathrooms;
      const partialScore = weights.bathrooms * Math.max(0, 1 - shortage * 0.4);
      score += partialScore;
      details.push({ type: 'warning', text: `Menos WCs que o desejado`, weight: weights.bathrooms });
    }
  } else {
    score += weights.bathrooms * 0.8;
  }

  // Square feet match (weighted)
  if (profile.square_feet_min) {
    if (property.square_feet >= profile.square_feet_min) {
      score += weights.area;
      const percentOver = ((property.square_feet / profile.square_feet_min - 1) * 100).toFixed(0);
      if (percentOver > 10) {
        details.push({ type: 'success', text: `${property.square_feet}m² (+${percentOver}% que o mínimo)`, weight: weights.area });
      }
    } else {
      const ratio = property.square_feet / profile.square_feet_min;
      const partialScore = weights.area * Math.max(0, ratio * 0.7);
      score += partialScore;
      details.push({ type: 'warning', text: `Área menor que o desejado (${property.square_feet}m²)`, weight: weights.area });
    }
  } else {
    score += weights.area * 0.67;
  }

  // Property type match (weighted)
  if (profile.property_types && profile.property_types.length > 0) {
    if (profile.property_types.includes(property.property_type)) {
      score += weights.property_type;
    } else {
      details.push({ type: 'warning', text: `Tipo de imóvel diferente do preferido`, weight: weights.property_type });
    }
  } else {
    score += weights.property_type * 0.8;
  }

  // Amenities match (weighted)
  if (profile.desired_amenities && profile.desired_amenities.length > 0 && property.amenities) {
    const matchingAmenities = profile.desired_amenities.filter(da => 
      property.amenities.some(pa => 
        pa.toLowerCase().includes(da.toLowerCase()) || 
        da.toLowerCase().includes(pa.toLowerCase())
      )
    );
    const amenitiesScore = (matchingAmenities.length / profile.desired_amenities.length) * weights.amenities;
    score += amenitiesScore;
    
    if (matchingAmenities.length > 0) {
      details.push({ type: 'success', text: `Tem ${matchingAmenities.length}/${profile.desired_amenities.length} comodidades desejadas`, weight: weights.amenities });
    }
  } else {
    score += weights.amenities * 0.6;
  }

  const maxScore = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedScore = (score / maxScore) * 100;
  
  return { score: Math.round(normalizedScore), details, rawScore: score, maxScore };
};

export default function AdvancedMatching({ profiles }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = React.useState("auto");
  const [selectedProfileId, setSelectedProfileId] = React.useState(null);
  const [minScore, setMinScore] = React.useState(60);
  const [searchProperty, setSearchProperty] = React.useState("");
  const [viewingMatch, setViewingMatch] = React.useState(null);
  const [customWeights, setCustomWeights] = React.useState(DEFAULT_WEIGHTS);
  const [showWeightsPanel, setShowWeightsPanel] = React.useState(false);
  const [useAI, setUseAI] = React.useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['matchFeedbacks'],
    queryFn: () => base44.entities.MatchFeedback.list('-created_date'),
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BuyerProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerProfiles'] });
    },
  });

  const saveFeedbackMutation = useMutation({
    mutationFn: (feedbackData) => base44.entities.MatchFeedback.create(feedbackData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchFeedbacks'] });
      toast.success("Feedback registado! A IA irá aprender com este input.");
    },
  });

  const activeProfiles = profiles.filter(p => p.status === 'active');
  const activeProperties = properties.filter(p => p.status === 'active');

  // Learn from feedback to adjust weights
  const learnedWeights = React.useMemo(() => {
    if (!useAI || feedbacks.length < 5) return customWeights;

    const goodMatches = feedbacks.filter(f => f.feedback_type === 'good' || f.feedback_type === 'excellent');
    const badMatches = feedbacks.filter(f => f.feedback_type === 'bad');

    if (goodMatches.length === 0) return customWeights;

    const adjustedWeights = { ...customWeights };
    const learningRate = 0.1;

    goodMatches.forEach(feedback => {
      if (feedback.criteria_weights) {
        Object.keys(adjustedWeights).forEach(criterion => {
          if (feedback.criteria_weights[criterion]) {
            adjustedWeights[criterion] += learningRate;
          }
        });
      }
    });

    badMatches.forEach(feedback => {
      if (feedback.criteria_weights) {
        Object.keys(adjustedWeights).forEach(criterion => {
          if (feedback.criteria_weights[criterion]) {
            adjustedWeights[criterion] = Math.max(5, adjustedWeights[criterion] - learningRate * 0.5);
          }
        });
      }
    });

    const total = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
    Object.keys(adjustedWeights).forEach(key => {
      adjustedWeights[key] = (adjustedWeights[key] / total) * 100;
    });

    return adjustedWeights;
  }, [feedbacks, useAI, customWeights]);

  // Calculate all matches
  const allMatches = React.useMemo(() => {
    const results = [];
    const weightsToUse = useAI ? learnedWeights : customWeights;
    
    activeProfiles.forEach(profile => {
      let relevantProperties = activeProperties.filter(prop => {
        if (profile.listing_type !== 'both' && prop.listing_type !== profile.listing_type) return false;
        return true;
      });

      relevantProperties.forEach(property => {
        const { score, details, rawScore, maxScore } = calculateMatchScore(profile, property, weightsToUse);
        
        if (score >= minScore) {
          results.push({
            profile,
            property,
            score,
            details,
            rawScore,
            maxScore,
            weightsUsed: weightsToUse
          });
        }
      });
    });

    return results.sort((a, b) => b.score - a.score);
  }, [activeProfiles, activeProperties, minScore, customWeights, useAI, learnedWeights]);

  const selectedProfile = activeProfiles.find(p => p.id === selectedProfileId);
  
  const profileMatches = selectedProfile ? allMatches.filter(m => m.profile.id === selectedProfile.id) : [];

  const filteredProperties = activeProperties.filter(p =>
    searchProperty === "" ||
    p.title?.toLowerCase().includes(searchProperty.toLowerCase()) ||
    p.city?.toLowerCase().includes(searchProperty.toLowerCase())
  );

  const sendMatchEmail = async (match) => {
    try {
      const emailBody = `Olá ${match.profile.buyer_name},

Encontrámos um imóvel que pode ser perfeito para si!

📍 ${match.property.title}
💰 €${match.property.price?.toLocaleString()}
🏠 ${match.property.city}, ${match.property.state}
🛏️ ${match.property.bedrooms || 0} quartos • 🚿 ${match.property.bathrooms || 0} WC • 📐 ${match.property.square_feet || 0}m²

⭐ Compatibilidade: ${match.score}%

✅ Porquê este imóvel para si:
${match.details.filter(d => d.type === 'success').map(d => `• ${d.text}`).join('\n')}

${match.property.description ? `\nDescrição:\n${match.property.description.substring(0, 300)}...` : ''}

Ver todos os detalhes: ${window.location.origin}${createPageUrl("PropertyDetails")}?id=${match.property.id}

Cumprimentos,
Equipa Zugruppe`;

      await base44.integrations.Core.SendEmail({
        to: match.profile.buyer_email,
        subject: `🏠 Imóvel Perfeito Para Si: ${match.property.title}`,
        body: emailBody
      });

      await updateProfileMutation.mutateAsync({
        id: match.profile.id,
        data: { last_match_date: new Date().toISOString() }
      });

      toast.success(`Email enviado para ${match.profile.buyer_name}`);
    } catch (error) {
      toast.error("Erro ao enviar email");
    }
  };

  const sendBulkEmails = async () => {
    const topMatches = allMatches.slice(0, 10);
    let sent = 0;
    
    for (const match of topMatches) {
      try {
        await sendMatchEmail(match);
        sent++;
      } catch (error) {
        console.error(error);
      }
    }
    
    toast.success(`${sent} emails enviados`);
  };

  const handleFeedback = async (match, feedbackType) => {
    const feedbackData = {
      profile_id: match.profile.id,
      property_id: match.property.id,
      match_score: match.score,
      feedback_type: feedbackType,
      criteria_weights: match.weightsUsed,
      match_details: {
        details: match.details,
        rawScore: match.rawScore,
        maxScore: match.maxScore
      }
    };

    saveFeedbackMutation.mutate(feedbackData);
  };

  const resetWeights = () => {
    setCustomWeights(DEFAULT_WEIGHTS);
    toast.success("Pesos resetados para padrão");
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
    if (score >= 40) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  const propertyTypeLabels = {
    house: "Moradia",
    apartment: "Apartamento",
    condo: "Condomínio",
    townhouse: "Casa geminada",
    building: "Prédio",
    land: "Terreno",
    commercial: "Comercial"
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Sistema de Matching Avançado com IA
          </CardTitle>
          <p className="text-sm text-slate-600">
            Algoritmo inteligente com aprendizagem automática baseada no seu feedback
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Modo de Visualização</label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Todos os Matches Automáticos</SelectItem>
                  <SelectItem value="manual">Selecionar Cliente Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "manual" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Cliente</label>
                <Select value={selectedProfileId || ""} onValueChange={setSelectedProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um cliente..." />
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
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Score Mínimo (%)</label>
              <Select value={minScore.toString()} onValueChange={(v) => setMinScore(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="40">40% - Baixo</SelectItem>
                  <SelectItem value="60">60% - Médio</SelectItem>
                  <SelectItem value="70">70% - Alto</SelectItem>
                  <SelectItem value="80">80% - Muito Alto</SelectItem>
                  <SelectItem value="90">90% - Excelente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${useAI ? 'text-purple-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-medium text-slate-900">Aprendizagem Automática</p>
                <p className="text-xs text-slate-600">
                  {useAI ? `IA ativa com ${feedbacks.length} feedbacks` : 'Pesos personalizados'}
                </p>
              </div>
            </div>
            <Button
              variant={useAI ? "default" : "outline"}
              size="sm"
              onClick={() => setUseAI(!useAI)}
              disabled={feedbacks.length < 5 && !useAI}
            >
              {useAI ? 'IA Ativa' : feedbacks.length < 5 ? `${feedbacks.length}/5 feedbacks` : 'Ativar IA'}
            </Button>
          </div>

          <div className="mb-4">
            <button
              onClick={() => setShowWeightsPanel(!showWeightsPanel)}
              className="flex items-center justify-between w-full p-3 bg-white rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-900">Configurar Pesos dos Critérios</span>
              </div>
              {showWeightsPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showWeightsPanel && (
              <div className="mt-3 p-4 bg-white rounded-lg border space-y-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-slate-600">Ajuste a importância de cada critério</p>
                  <Button variant="outline" size="sm" onClick={resetWeights}>
                    Resetar Padrão
                  </Button>
                </div>

                {Object.entries(customWeights).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <Label className="text-sm capitalize">
                        {key === 'price' ? '💰 Preço' :
                         key === 'location' ? '📍 Localização' :
                         key === 'bedrooms' ? '🛏️ Quartos' :
                         key === 'bathrooms' ? '🚿 Casas de Banho' :
                         key === 'area' ? '📐 Área' :
                         key === 'property_type' ? '🏠 Tipo de Imóvel' :
                         key === 'amenities' ? '✨ Comodidades' : key}
                      </Label>
                      <span className="text-sm font-semibold text-purple-900">{Math.round(value)}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(v) => setCustomWeights({...customWeights, [key]: v[0]})}
                      min={5}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}

                <div className="pt-3 border-t">
                  <p className="text-xs text-slate-500">
                    Total: {Math.round(Object.values(customWeights).reduce((sum, v) => sum + v, 0))} pontos
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{allMatches.length}</div>
              <div className="text-sm text-slate-600">Matches Totais</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {allMatches.filter(m => m.score >= 80).length}
              </div>
              <div className="text-sm text-slate-600">Excelentes (≥80%)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {activeProfiles.length}
              </div>
              <div className="text-sm text-slate-600">Clientes Ativos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {mode === "auto" && allMatches.length > 0 && (
        <Card className="border-green-500">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Top Matches Automáticos</CardTitle>
                <p className="text-sm text-slate-600">Melhores combinações cliente-imóvel</p>
              </div>
              <Button onClick={sendBulkEmails} variant="outline">
                <Send className="w-4 h-4 mr-2" />
                Enviar Top 10
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4">
        {(mode === "auto" ? allMatches : profileMatches).slice(0, 20).map((match, idx) => (
          <Card key={idx} className="hover:shadow-lg transition-shadow overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Property Image */}
              <div className="lg:w-80 h-64 relative">
                <img
                  src={match.property.images?.[0] || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400"}
                  alt={match.property.title}
                  className="w-full h-full object-cover"
                />
                <Badge className={`absolute top-3 right-3 ${getScoreColor(match.score)} border text-base px-3 py-1.5`}>
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  {match.score}%
                </Badge>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Property Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Imóvel</h4>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{match.property.title}</h3>
                    
                    <div className="space-y-1 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        {match.property.city}, {match.property.state}
                      </div>
                      <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        €{match.property.price?.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">
                        <Bed className="w-3 h-3 mr-1" />
                        {match.property.bedrooms || 0} quartos
                      </Badge>
                      <Badge variant="outline">
                        <Bath className="w-3 h-3 mr-1" />
                        {match.property.bathrooms || 0} WC
                      </Badge>
                      <Badge variant="outline">
                        <Maximize className="w-3 h-3 mr-1" />
                        {match.property.square_feet || 0}m²
                      </Badge>
                      <Badge variant="secondary">
                        {propertyTypeLabels[match.property.property_type]}
                      </Badge>
                    </div>

                    <Link to={`${createPageUrl("PropertyDetails")}?id=${match.property.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Imóvel
                      </Button>
                    </Link>
                  </div>

                  {/* Client Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Cliente</h4>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{match.profile.buyer_name}</h3>
                    
                    <div className="space-y-1 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {match.profile.buyer_email}
                      </div>
                      {match.profile.buyer_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {match.profile.buyer_phone}
                        </div>
                      )}
                      {(match.profile.budget_min || match.profile.budget_max) && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-slate-500" />
                          €{match.profile.budget_min?.toLocaleString() || '0'} - €{match.profile.budget_max?.toLocaleString() || '∞'}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={() => sendMatchEmail(match)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Notificar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Match Details */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    {match.details.filter(d => d.type === 'success').length > 0 && (
                      <div>
                        <h5 className="font-semibold text-green-700 text-sm mb-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Pontos Fortes
                        </h5>
                        <ul className="space-y-1">
                          {match.details.filter(d => d.type === 'success').map((detail, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">•</span>
                              {detail.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.details.filter(d => d.type === 'warning').length > 0 && (
                      <div>
                        <h5 className="font-semibold text-amber-700 text-sm mb-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Considerações
                        </h5>
                        <ul className="space-y-1">
                          {match.details.filter(d => d.type === 'warning').map((detail, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-amber-600 mt-0.5">•</span>
                              {detail.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <p className="text-sm text-slate-600">Este match foi útil?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback(match, 'bad')}
                      disabled={saveFeedbackMutation.isPending}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Mau Match
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback(match, 'good')}
                      disabled={saveFeedbackMutation.isPending}
                      className="text-green-600 hover:bg-green-50"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Bom Match
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback(match, 'excellent')}
                      disabled={saveFeedbackMutation.isPending}
                      className="text-purple-600 hover:bg-purple-50"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Excelente
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {(mode === "auto" ? allMatches : profileMatches).length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Nenhum match encontrado
            </h3>
            <p className="text-slate-600">
              {mode === "manual" && !selectedProfileId ? 
                "Selecione um cliente para ver matches" :
                `Tente reduzir o score mínimo de ${minScore}%`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}