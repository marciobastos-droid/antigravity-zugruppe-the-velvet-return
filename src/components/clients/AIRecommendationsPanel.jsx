import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Brain, Target, Eye, Heart, X, Clock, Bed, Bath, Maximize, Euro, MapPin, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AIRecommendationsPanel({ profile }) {
  const [showPredictive, setShowPredictive] = React.useState(true);

  const { data: modelData } = useQuery({
    queryKey: ['aiModel', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const models = await base44.entities.AIMatchingModel.filter({ profile_id: profile.id });
      return models && models.length > 0 ? models[0] : null;
    },
    enabled: !!profile?.id
  });

  const trainModelMutation = useMutation({
    mutationFn: () => base44.functions.invoke('trainAIMatchingModel', { profile_id: profile.id }),
    onSuccess: (response) => {
      const data = response.data;
      toast.success(`Modelo treinado! ${data.interactions_analyzed} interações analisadas. Confiança: ${Math.round(data.confidence)}%`);
    },
    onError: () => {
      toast.error("Erro ao treinar modelo");
    }
  });

  const { data: recommendations, isLoading: loadingRecs, refetch } = useQuery({
    queryKey: ['aiRecommendations', profile?.id, showPredictive],
    queryFn: async () => {
      if (!profile?.id) return null;
      const response = await base44.functions.invoke('getAIRecommendations', { 
        profile_id: profile.id,
        include_predictions: showPredictive
      });
      return response.data;
    },
    enabled: !!profile?.id
  });

  const recordInteractionMutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyInteraction.create(data),
    onSuccess: () => {
      toast.success("Interação registada");
    }
  });

  const handleInteraction = (propertyId, type) => {
    const property = recommendations?.recommendations?.find(r => r.property_id === propertyId)?.property;
    
    recordInteractionMutation.mutate({
      profile_id: profile.id,
      property_id: propertyId,
      interaction_type: type,
      match_score: recommendations?.recommendations?.find(r => r.property_id === propertyId)?.score,
      property_features: property ? {
        type: property.property_type,
        location: property.city,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.useful_area || property.square_feet
      } : {}
    });
  };

  const getMatchTypeIcon = (type) => {
    if (type === 'ai_predicted') return <Brain className="w-4 h-4 text-purple-600" />;
    if (type === 'market_trend') return <TrendingUp className="w-4 h-4 text-blue-600" />;
    return <Target className="w-4 h-4 text-green-600" />;
  };

  const getMatchTypeLabel = (type) => {
    if (type === 'ai_predicted') return 'IA Preditiva';
    if (type === 'market_trend') return 'Tendência Mercado';
    return 'Match Tradicional';
  };

  const getMatchTypeColor = (type) => {
    if (type === 'ai_predicted') return 'bg-purple-100 text-purple-800 border-purple-300';
    if (type === 'market_trend') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card className="border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Sistema de Recomendação IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              {modelData ? (
                <div className="flex items-center gap-4">
                  <div>
                    <Badge className="bg-green-100 text-green-800">
                      <Brain className="w-3 h-3 mr-1" />
                      Modelo Ativo
                    </Badge>
                    <p className="text-sm text-slate-600 mt-1">
                      Confiança: {modelData.confidence_score}% | {modelData.total_interactions} interações
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => trainModelMutation.mutate()}
                    disabled={trainModelMutation.isPending}
                  >
                    {trainModelMutation.isPending ? 'A treinar...' : 'Retreinar'}
                  </Button>
                </div>
              ) : (
                <div>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    Sem dados suficientes
                  </Badge>
                  <p className="text-sm text-slate-600 mt-1">
                    Adicione interações para treinar o modelo
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showPredictive}
                  onChange={(e) => setShowPredictive(e.target.checked)}
                  className="rounded"
                />
                Incluir Previsões IA
              </label>
              <Button 
                size="sm" 
                onClick={() => refetch()}
                disabled={loadingRecs}
              >
                Atualizar
              </Button>
            </div>
          </div>

          {/* Model Insights */}
          {modelData?.predicted_needs?.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Necessidades Previstas pela IA
              </h4>
              <div className="space-y-2">
                {modelData.predicted_needs.map((need, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-50">
                        {Math.round(need.confidence * 100)}% confiança
                      </Badge>
                      <span className="font-medium">{need.need}</span>
                    </div>
                    <p className="text-slate-600 text-xs ml-2 mt-1">{need.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {loadingRecs ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-slate-600">A gerar recomendações...</p>
          </CardContent>
        </Card>
      ) : recommendations?.recommendations?.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {recommendations.recommendations.length} Recomendações
            </h3>
            <div className="text-sm text-slate-600">
              {recommendations.summary.ai_predictions > 0 && (
                <span className="text-purple-600 font-medium">
                  {recommendations.summary.ai_predictions} previsões IA
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {recommendations.recommendations.map((rec) => (
              <Card key={rec.property_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Image */}
                    {rec.property?.images?.[0] && (
                      <img 
                        src={rec.property.images[0]} 
                        alt={rec.property.title}
                        className="w-40 h-40 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-slate-900 truncate">
                            {rec.property?.title}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            {rec.property?.city}, {rec.property?.state}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">
                            €{rec.property?.price?.toLocaleString()}
                          </p>
                          <Badge className="mt-1">
                            {Math.round(rec.score)}% Match
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className={getMatchTypeColor(rec.match_type)}>
                          {getMatchTypeIcon(rec.match_type)}
                          <span className="ml-1">{getMatchTypeLabel(rec.match_type)}</span>
                        </Badge>
                        {rec.property?.bedrooms > 0 && (
                          <Badge variant="outline">
                            <Bed className="w-3 h-3 mr-1" />
                            {rec.property.bedrooms}
                          </Badge>
                        )}
                        {rec.property?.bathrooms > 0 && (
                          <Badge variant="outline">
                            <Bath className="w-3 h-3 mr-1" />
                            {rec.property.bathrooms}
                          </Badge>
                        )}
                        {(rec.property?.useful_area || rec.property?.square_feet) && (
                          <Badge variant="outline">
                            <Maximize className="w-3 h-3 mr-1" />
                            {rec.property.useful_area || rec.property.square_feet}m²
                          </Badge>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          {rec.match_type === 'ai_predicted' ? '🤖 Porquê esta recomendação:' : '📊 Análise:'}
                        </p>
                        <p className="text-sm text-slate-600">{rec.reasoning}</p>
                        {rec.predicted_appeal && (
                          <p className="text-sm text-purple-700 mt-2 italic">
                            💡 {rec.predicted_appeal}
                          </p>
                        )}
                      </div>

                      {rec.key_features?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {rec.key_features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Link to={`${createPageUrl('PropertyDetails')}?id=${rec.property_id}`} target="_blank">
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          onClick={() => handleInteraction(rec.property_id, 'viewed')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Marcar Vista
                        </Button>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleInteraction(rec.property_id, 'shortlisted')}
                        >
                          <Heart className="w-4 h-4 mr-2" />
                          Shortlist
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleInteraction(rec.property_id, 'rejected')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">Nenhuma recomendação disponível</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}