import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, FileText, Tags, Globe, 
  Loader2, Copy, Check, RefreshCw, 
  TrendingUp, ExternalLink, Home, DollarSign, Award, Type
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AITitleGenerator from "../property/AITitleGenerator";
import AutoTranslateButton from "../property/AutoTranslateButton";

export default function AIPropertyEnhancer({ open, onOpenChange, property }) {
  const [activeTab, setActiveTab] = React.useState("title");
  const [generatedDescription, setGeneratedDescription] = React.useState("");
  const [suggestedTags, setSuggestedTags] = React.useState([]);
  const [publicationRecommendations, setPublicationRecommendations] = React.useState(null);
  const [pricingAnalysis, setPricingAnalysis] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const queryClient = useQueryClient();

  // Reset quando abrir/fechar
  React.useEffect(() => {
    if (open && property) {
      setGeneratedDescription("");
      setSuggestedTags([]);
      setPublicationRecommendations(null);
      setPricingAnalysis(property.ai_price_analysis || null);
      setCopied(false);
    }
  }, [open, property]);

  const generateDescriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generatePropertyDescription', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedDescription(data.description);
        toast.success("Descrição gerada com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar descrição");
      }
    },
    onError: (error) => {
      toast.error("Erro ao gerar descrição");
      console.error(error);
    }
  });

  const suggestTagsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('suggestPropertyTags', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSuggestedTags(data.tags);
        toast.success(`${data.tags.length} etiquetas sugeridas!`);
      } else {
        toast.error(data.error || "Erro ao sugerir etiquetas");
      }
    },
    onError: (error) => {
      toast.error("Erro ao sugerir etiquetas");
      console.error(error);
    }
  });

  const recommendChannelsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('recommendPublicationChannels', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setPublicationRecommendations(data.recommendations);
        toast.success("Recomendações geradas!");
      } else {
        toast.error(data.error || "Erro ao gerar recomendações");
      }
    },
    onError: (error) => {
      toast.error("Erro ao gerar recomendações");
      console.error(error);
    }
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.Property.update(property.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success("Imóvel atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar imóvel");
    }
  });

  const analyzePricingMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzePricingStrategy', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setPricingAnalysis(data.analysis);
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['myProperties'] });
        toast.success("Análise de preço concluída!");
      } else {
        toast.error(data.error || "Erro na análise");
      }
    },
    onError: () => {
      toast.error("Erro ao analisar preço");
    }
  });

  const calculateScoreMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('calculatePropertyScore', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['myProperties'] });
        toast.success("Pontuação calculada!");
      }
    }
  });

  const handleApplyDescription = () => {
    if (generatedDescription) {
      const aiFeatures = property.ai_features_used || [];
      updatePropertyMutation.mutate({ 
        description: generatedDescription,
        ai_features_used: [...new Set([...aiFeatures, 'description'])]
      });
    }
  };

  const handleApplyTags = () => {
    if (suggestedTags.length > 0) {
      const existingTags = property.tags || [];
      const newTags = [...new Set([...existingTags, ...suggestedTags])];
      const aiFeatures = property.ai_features_used || [];
      updatePropertyMutation.mutate({ 
        tags: newTags,
        ai_features_used: [...new Set([...aiFeatures, 'tags'])]
      });
    }
  };

  const handleApplyPricing = () => {
    if (pricingAnalysis?.suggested_price) {
      const aiFeatures = property.ai_features_used || [];
      updatePropertyMutation.mutate({
        price: pricingAnalysis.suggested_price,
        ai_suggested_price: pricingAnalysis.suggested_price,
        ai_price_analysis: pricingAnalysis,
        ai_features_used: [...new Set([...aiFeatures, 'pricing'])]
      });
    }
  };

  const handleApplyPublication = () => {
    if (publicationRecommendations) {
      const recommendedPortals = publicationRecommendations.portals
        .filter(p => p.priority === "alta")
        .map(p => p.id);
      const recommendedPages = publicationRecommendations.pages
        .filter(p => p.priority === "alta" || p.priority === "média")
        .map(p => p.id);
      
      updatePropertyMutation.mutate({
        published_portals: recommendedPortals,
        published_pages: recommendedPages
      });
    }
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(generatedDescription);
    setCopied(true);
    toast.success("Descrição copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const priorityColors = {
    alta: "bg-green-100 text-green-800 border-green-300",
    média: "bg-yellow-100 text-yellow-800 border-yellow-300",
    baixa: "bg-slate-100 text-slate-800 border-slate-300"
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Melhorar Imóvel com IA
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-1">
            {property.title}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 gap-1">
            <TabsTrigger value="title" className="gap-1 sm:gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Título</span>
            </TabsTrigger>
            <TabsTrigger value="description" className="gap-1 sm:gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Descrição</span>
            </TabsTrigger>
            <TabsTrigger value="translate" className="gap-1 sm:gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Traduzir</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-1 sm:gap-2">
              <Tags className="w-4 h-4" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-1 sm:gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="score" className="gap-1 sm:gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Pontuação</span>
            </TabsTrigger>
            <TabsTrigger value="publication" className="gap-1 sm:gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Publicação</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB: Título */}
          <TabsContent value="title" className="space-y-4 mt-6">
            <AITitleGenerator 
              property={property} 
              onUpdate={(id, updates) => updatePropertyMutation.mutate(updates)} 
            />
          </TabsContent>

          {/* TAB: Descrição */}
          <TabsContent value="description" className="space-y-4 mt-6">
            <AIDescriptionEnhancer 
              property={property}
              onApply={(updates) => updatePropertyMutation.mutate(updates)}
            />
          </TabsContent>

          {/* TAB: Traduzir */}
          <TabsContent value="translate" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tradução Automática</CardTitle>
                <p className="text-sm text-slate-600">
                  Traduza automaticamente o título, descrição e comodidades para inglês, espanhol, francês e alemão.
                </p>
              </CardHeader>
              <CardContent>
                <AutoTranslateButton 
                  property={property}
                  onTranslated={() => {
                    queryClient.invalidateQueries({ queryKey: ['properties'] });
                    queryClient.invalidateQueries({ queryKey: ['myProperties'] });
                  }}
                  variant="default"
                  size="lg"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Etiquetas */}
          <TabsContent value="tags" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sugerir Etiquetas Relevantes</CardTitle>
                <p className="text-sm text-slate-600">
                  A IA analisa o perfil do imóvel e sugere tags que facilitam a pesquisa e categorização.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => suggestTagsMutation.mutate()}
                  disabled={suggestTagsMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {suggestTagsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar imóvel...
                    </>
                  ) : (
                    <>
                      <Tags className="w-4 h-4 mr-2" />
                      Sugerir Etiquetas
                    </>
                  )}
                </Button>

                {suggestedTags.length > 0 && (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Etiquetas sugeridas ({suggestedTags.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleApplyTags}
                      disabled={updatePropertyMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {updatePropertyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Adicionar Etiquetas ao Imóvel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Pricing */}
          <TabsContent value="pricing" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análise de Preço com IA</CardTitle>
                <p className="text-sm text-slate-600">
                  A IA analisa o mercado local e sugere a melhor estratégia de pricing.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => analyzePricingMutation.mutate()}
                  disabled={analyzePricingMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {analyzePricingMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar mercado...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      {pricingAnalysis ? 'Reanalisar Preço' : 'Analisar Preço'}
                    </>
                  )}
                </Button>

                {pricingAnalysis && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg border">
                        <p className="text-xs text-slate-500 mb-1">Preço Atual</p>
                        <p className="text-xl font-bold">€{property.price?.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 mb-1">IA Sugere</p>
                        <p className="text-xl font-bold text-green-900">€{pricingAnalysis.suggested_price?.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Análise</p>
                      <p className="text-sm text-blue-800 whitespace-pre-line">
                        {pricingAnalysis.justification}
                      </p>
                    </div>

                    {pricingAnalysis.recommendations && pricingAnalysis.recommendations.length > 0 && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm font-medium text-purple-900 mb-2">Recomendações</p>
                        <ul className="text-sm text-purple-800 space-y-1 ml-4 list-disc">
                          {pricingAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      onClick={handleApplyPricing}
                      disabled={updatePropertyMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {updatePropertyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Aplicar Preço Sugerido
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Quality Score */}
          <TabsContent value="score" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pontuação de Qualidade</CardTitle>
                <p className="text-sm text-slate-600">
                  Avalia a qualidade e completude do anúncio baseado em preenchimento e uso de IA.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => calculateScoreMutation.mutate()}
                  disabled={calculateScoreMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {calculateScoreMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A calcular pontuação...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Calcular Pontuação
                    </>
                  )}
                </Button>

                {property.quality_score > 0 && (
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="text-center mb-4">
                      <div className="text-5xl font-bold text-purple-900 mb-2">
                        {property.quality_score}
                      </div>
                      <Badge className="bg-purple-600 text-white">
                        {property.quality_score_details?.grade || 'Calculado'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700">Informação Básica</span>
                        <span className="font-semibold">
                          {property.quality_score_details?.basic_info?.score}/
                          {property.quality_score_details?.basic_info?.max}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700">Media (Fotos/Vídeos)</span>
                        <span className="font-semibold">
                          {property.quality_score_details?.media?.score}/
                          {property.quality_score_details?.media?.max}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-700">Detalhes do Imóvel</span>
                        <span className="font-semibold">
                          {property.quality_score_details?.details?.score}/
                          {property.quality_score_details?.details?.max}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700 font-medium">Utilização de IA</span>
                        <span className="font-semibold text-purple-700">
                          {property.quality_score_details?.ai_usage?.score}/
                          {property.quality_score_details?.ai_usage?.max}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Publicação */}
          <TabsContent value="publication" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recomendar Canais de Publicação</CardTitle>
                <p className="text-sm text-slate-600">
                  A IA analisa o perfil do imóvel e recomenda os melhores portais e páginas para maximizar visibilidade.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => recommendChannelsMutation.mutate()}
                  disabled={recommendChannelsMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {recommendChannelsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Gerar Recomendações
                    </>
                  )}
                </Button>

                {publicationRecommendations && (
                  <div className="space-y-4">
                    {/* Portais */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Portais Recomendados
                      </h4>
                      <div className="space-y-2">
                        {publicationRecommendations.portals.map((portal, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900 capitalize">{portal.id}</span>
                                <Badge className={priorityColors[portal.priority]}>
                                  {portal.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">{portal.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Páginas */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Páginas do Website
                      </h4>
                      <div className="space-y-2">
                        {publicationRecommendations.pages.map((page, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900 capitalize">{page.id}</span>
                                <Badge className={priorityColors[page.priority]}>
                                  {page.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">{page.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleApplyPublication}
                      disabled={updatePropertyMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {updatePropertyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Aplicar Recomendações (Prioridade Alta)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}