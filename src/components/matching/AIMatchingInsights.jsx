import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Sparkles, TrendingUp, Target, Lightbulb, 
  ChevronRight, MapPin, Euro, Bed, Building2, 
  RefreshCw, CheckCircle2, AlertTriangle, Zap,
  ThumbsUp, ThumbsDown, BarChart3, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";

export default function AIMatchingInsights({ contact, onSelectProperty }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: matchFeedback = [] } = useQuery({
    queryKey: ['matchFeedback'],
    queryFn: () => base44.entities.MatchFeedback.list()
  });

  const { data: propertyInterests = [] } = useQuery({
    queryKey: ['propertyInterests', contact?.id],
    queryFn: () => base44.entities.ClientPropertyInterest.filter({ contact_id: contact?.id }),
    enabled: !!contact?.id
  });

  const activeProperties = properties.filter(p => p.status === 'active');
  const req = contact?.property_requirements || {};

  // Generate AI insights
  const generateInsights = async () => {
    if (!contact) return;
    setAnalyzing(true);

    try {
      // Build context for AI
      const clientContext = {
        name: contact.full_name,
        requirements: req,
        previousInterests: propertyInterests.map(p => ({
          status: p.status,
          rating: p.client_rating,
          property_price: p.property_price
        })),
        feedbackHistory: matchFeedback.filter(f => f.profile_id === contact.id)
      };

      // Calculate basic matching scores first
      const propertyScores = activeProperties.map(property => {
        let score = 50; // Base score
        let factors = [];

        // Price matching
        if (req.budget_max && req.budget_min) {
          if (property.price >= req.budget_min && property.price <= req.budget_max) {
            score += 20;
            factors.push({ name: 'Preço no orçamento', impact: 'positive' });
          } else if (property.price <= req.budget_max * 1.1) {
            score += 10;
            factors.push({ name: 'Preço próximo do limite', impact: 'neutral' });
          } else {
            score -= 15;
            factors.push({ name: 'Acima do orçamento', impact: 'negative' });
          }
        } else if (req.budget_max) {
          if (property.price <= req.budget_max) {
            score += 15;
            factors.push({ name: 'Dentro do orçamento', impact: 'positive' });
          }
        }

        // Location matching
        if (req.locations?.length > 0) {
          const locationMatch = req.locations.some(loc => 
            property.city?.toLowerCase().includes(loc.toLowerCase()) ||
            property.state?.toLowerCase().includes(loc.toLowerCase())
          );
          if (locationMatch) {
            score += 25;
            factors.push({ name: 'Localização preferida', impact: 'positive' });
          } else {
            score -= 10;
            factors.push({ name: 'Localização diferente', impact: 'negative' });
          }
        }

        // Bedrooms matching
        if (req.bedrooms_min && property.bedrooms) {
          if (property.bedrooms >= req.bedrooms_min) {
            score += 15;
            factors.push({ name: 'Tipologia adequada', impact: 'positive' });
          } else if (property.bedrooms === req.bedrooms_min - 1) {
            score += 5;
            factors.push({ name: 'Um quarto a menos', impact: 'neutral' });
          }
        }

        // Property type matching
        if (req.property_types?.length > 0) {
          if (req.property_types.includes(property.property_type)) {
            score += 15;
            factors.push({ name: 'Tipo de imóvel pretendido', impact: 'positive' });
          }
        }

        // Listing type matching
        if (req.listing_type && property.listing_type === req.listing_type) {
          score += 10;
          factors.push({ name: 'Tipo de negócio correto', impact: 'positive' });
        }

        // Historical feedback bonus
        const positiveFeedback = matchFeedback.filter(
          f => f.property_id === property.id && (f.feedback_type === 'good' || f.feedback_type === 'excellent')
        ).length;
        if (positiveFeedback > 0) {
          score += 5 * positiveFeedback;
          factors.push({ name: 'Histórico positivo', impact: 'positive' });
        }

        return {
          property,
          score: Math.min(100, Math.max(0, score)),
          factors,
          prediction: score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low'
        };
      });

      // Sort by score
      const topMatches = propertyScores.sort((a, b) => b.score - a.score).slice(0, 10);

      // Use AI to analyze and provide recommendations
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa o perfil deste cliente imobiliário e fornece insights estratégicos.

CLIENTE: ${contact.full_name}
REQUISITOS ATUAIS:
- Orçamento: ${req.budget_min ? `€${req.budget_min.toLocaleString()}` : 'Não definido'} - ${req.budget_max ? `€${req.budget_max.toLocaleString()}` : 'Não definido'}
- Localizações: ${req.locations?.join(', ') || 'Não definidas'}
- Tipologia: ${req.bedrooms_min ? `T${req.bedrooms_min}+` : 'Não definida'}
- Tipos de imóvel: ${req.property_types?.join(', ') || 'Não definidos'}
- Tipo de negócio: ${req.listing_type || 'Não definido'}

HISTÓRICO DE INTERESSES: ${propertyInterests.length} imóveis visualizados
- Interessados: ${propertyInterests.filter(p => p.status === 'interested').length}
- Visitados: ${propertyInterests.filter(p => p.status === 'visited').length}
- Rejeitados: ${propertyInterests.filter(p => p.status === 'not_interested').length}

MELHORES MATCHES ENCONTRADOS: ${topMatches.slice(0, 5).map(m => `${m.property.title} (${m.score}%)`).join(', ')}

Responde em JSON com:
1. requirement_suggestions: array de sugestões para ajustar requisitos (max 3)
2. market_insight: observação sobre o mercado para este perfil
3. negotiation_tip: dica de negociação
4. urgency_level: "high", "medium" ou "low" baseado na disponibilidade de matches
5. expansion_areas: localizações alternativas a considerar (max 3)`,
        response_json_schema: {
          type: "object",
          properties: {
            requirement_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  current: { type: "string" },
                  suggested: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            market_insight: { type: "string" },
            negotiation_tip: { type: "string" },
            urgency_level: { type: "string" },
            expansion_areas: { type: "array", items: { type: "string" } }
          }
        }
      });

      setInsights({
        topMatches,
        aiRecommendations: aiResponse,
        generatedAt: new Date().toISOString()
      });

      toast.success("Análise IA concluída!");
    } catch (error) {
      console.error("AI Analysis error:", error);
      toast.error("Erro na análise IA");
    }

    setAnalyzing(false);
  };

  const getPredictionColor = (prediction) => {
    switch (prediction) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-amber-600 bg-amber-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getPredictionLabel = (prediction) => {
    switch (prediction) {
      case 'high': return 'Alta probabilidade';
      case 'medium': return 'Probabilidade média';
      default: return 'Baixa probabilidade';
    }
  };

  if (!contact) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Brain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Selecione um cliente para análise IA</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Análise IA para {contact.full_name}</h3>
                <p className="text-indigo-100 text-sm">Sugestões inteligentes e previsões de compatibilidade</p>
              </div>
            </div>
            <Button 
              onClick={generateInsights}
              disabled={analyzing}
              className="bg-white text-indigo-600 hover:bg-indigo-50"
            >
              {analyzing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {analyzing ? 'Analisando...' : 'Analisar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {insights ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Matches with Predictions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                Sugestões Automáticas
                <Badge className="ml-2 bg-green-100 text-green-700">{insights.topMatches.length} matches</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-3 pr-2">
                  {insights.topMatches.map((match, idx) => (
                    <div 
                      key={match.property.id}
                      className="p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => onSelectProperty?.(match.property)}
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {match.property.images?.[0] ? (
                            <img src={match.property.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-sm text-slate-900 truncate">{match.property.title}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {match.property.city}
                              </p>
                            </div>
                            <Badge className={`text-xs ${getPredictionColor(match.prediction)}`}>
                              {match.score}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="font-semibold text-slate-900">
                              €{match.property.price?.toLocaleString()}
                            </span>
                            {match.property.bedrooms && (
                              <span className="text-slate-500">T{match.property.bedrooms}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {match.factors.slice(0, 3).map((factor, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className={`text-xs ${
                                  factor.impact === 'positive' ? 'border-green-300 text-green-700 bg-green-50' :
                                  factor.impact === 'negative' ? 'border-red-300 text-red-700 bg-red-50' :
                                  'border-amber-300 text-amber-700 bg-amber-50'
                                }`}
                              >
                                {factor.impact === 'positive' ? <ThumbsUp className="w-3 h-3 mr-1" /> :
                                 factor.impact === 'negative' ? <ThumbsDown className="w-3 h-3 mr-1" /> :
                                 <AlertTriangle className="w-3 h-3 mr-1" />}
                                {factor.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${getPredictionColor(match.prediction)} px-2 py-0.5 rounded`}>
                            {getPredictionLabel(match.prediction)}
                          </span>
                          <span className="text-slate-400">#{idx + 1} match</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <div className="space-y-4">
            {/* Requirement Suggestions */}
            {insights.aiRecommendations?.requirement_suggestions?.length > 0 && (
              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                    Sugestões de Ajuste
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.aiRecommendations.requirement_suggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                        <div className="flex items-start gap-2">
                          <ArrowUpRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{suggestion.field}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {suggestion.current} → <span className="font-medium text-amber-700">{suggestion.suggested}</span>
                            </p>
                            <p className="text-xs text-slate-600 mt-1">{suggestion.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market Insight */}
            {insights.aiRecommendations?.market_insight && (
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Insight de Mercado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{insights.aiRecommendations.market_insight}</p>
                </CardContent>
              </Card>
            )}

            {/* Negotiation Tip */}
            {insights.aiRecommendations?.negotiation_tip && (
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-600" />
                    Dica de Negociação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{insights.aiRecommendations.negotiation_tip}</p>
                </CardContent>
              </Card>
            )}

            {/* Expansion Areas */}
            {insights.aiRecommendations?.expansion_areas?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    Zonas Alternativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {insights.aiRecommendations.expansion_areas.map((area, idx) => (
                      <Badge key={idx} className="bg-purple-100 text-purple-700">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Urgency Level */}
            <Card className={`${
              insights.aiRecommendations?.urgency_level === 'high' 
                ? 'border-red-300 bg-red-50' 
                : insights.aiRecommendations?.urgency_level === 'medium'
                ? 'border-amber-300 bg-amber-50'
                : 'border-green-300 bg-green-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    insights.aiRecommendations?.urgency_level === 'high' 
                      ? 'bg-red-200' 
                      : insights.aiRecommendations?.urgency_level === 'medium'
                      ? 'bg-amber-200'
                      : 'bg-green-200'
                  }`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Nível de Urgência</p>
                    <p className="text-xs text-slate-600">
                      {insights.aiRecommendations?.urgency_level === 'high' 
                        ? 'Alto - Poucos imóveis disponíveis, agir rapidamente!'
                        : insights.aiRecommendations?.urgency_level === 'medium'
                        ? 'Médio - Boas opções disponíveis'
                        : 'Baixo - Muitas opções no mercado'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Análise IA Disponível</h3>
            <p className="text-slate-500 text-sm mb-4">
              Clique em "Analisar" para obter sugestões automáticas de imóveis,<br />
              recomendações de ajuste de requisitos e previsões de compatibilidade.
            </p>
            <Button onClick={generateInsights} disabled={analyzing}>
              {analyzing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Iniciar Análise
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}