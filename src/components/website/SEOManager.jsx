import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, AlertCircle, CheckCircle2, FileText, Globe, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SEOManager() {
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = React.useState(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [seoAnalysis, setSeoAnalysis] = React.useState(null);
  const [optimizing, setOptimizing] = React.useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Property.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success("SEO atualizado!");
    },
  });

  const analyzeSEO = async (property) => {
    setAnalyzing(true);
    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa o SEO deste imóvel e dá recomendações:

Título: ${property.title}
Descrição: ${property.description || 'Não definida'}
Cidade: ${property.city}
Tipo: ${property.property_type}
Preço: €${property.price}
Quartos: ${property.bedrooms || 'N/A'}

Analisa:
1. Título (otimização para Google)
2. Descrição (densidade de keywords, legibilidade)
3. Keywords ausentes importantes
4. Score SEO geral (0-100)
5. 3 melhorias prioritárias

Retorna análise detalhada com score e recomendações práticas.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            title_analysis: {
              type: "object",
              properties: {
                score: { type: "number" },
                issues: { type: "array", items: { type: "string" } },
                suggestions: { type: "string" }
              }
            },
            description_analysis: {
              type: "object",
              properties: {
                score: { type: "number" },
                word_count: { type: "number" },
                keyword_density: { type: "string" },
                readability: { type: "string" },
                issues: { type: "array", items: { type: "string" } }
              }
            },
            missing_keywords: { type: "array", items: { type: "string" } },
            top_improvements: { type: "array", items: { type: "string" } },
            optimized_title: { type: "string" },
            optimized_meta_description: { type: "string" }
          }
        }
      });

      setSeoAnalysis(analysis);
      toast.success("Análise SEO concluída!");
    } catch (error) {
      toast.error("Erro ao analisar SEO");
    }
    setAnalyzing(false);
  };

  const applyOptimizations = async () => {
    if (!seoAnalysis || !selectedProperty) return;

    setOptimizing(true);
    try {
      await updateMutation.mutateAsync({
        id: selectedProperty.id,
        data: {
          title: seoAnalysis.optimized_title,
          seo_meta_description: seoAnalysis.optimized_meta_description,
          ai_features_used: [...(selectedProperty.ai_features_used || []), 'seo_optimization']
        }
      });

      toast.success("Otimizações aplicadas!");
    } catch (error) {
      toast.error("Erro ao aplicar otimizações");
    }
    setOptimizing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Gestor de SEO
          </CardTitle>
          <p className="text-sm text-slate-600">Otimize o conteúdo dos imóveis para motores de busca</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Selecionar Imóvel</Label>
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  const prop = properties.find(p => p.id === e.target.value);
                  setSelectedProperty(prop);
                  setSeoAnalysis(null);
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="">Escolher imóvel...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.ref_id || p.title} - {p.city}
                  </option>
                ))}
              </select>
            </div>

            {selectedProperty && (
              <Button 
                onClick={() => analyzeSEO(selectedProperty)}
                disabled={analyzing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A analisar SEO...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analisar SEO com IA
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {seoAnalysis && (
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Análise SEO
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">{selectedProperty.ref_id || selectedProperty.title}</p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(seoAnalysis.overall_score)}`}>
                  {seoAnalysis.overall_score}
                </div>
                <Badge className={getScoreBadgeColor(seoAnalysis.overall_score)}>
                  {seoAnalysis.overall_score >= 80 ? 'Excelente' : 
                   seoAnalysis.overall_score >= 60 ? 'Bom' : 'Precisa Melhorar'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis">Análise</TabsTrigger>
                <TabsTrigger value="optimizations">Otimizações</TabsTrigger>
                <TabsTrigger value="keywords">Keywords</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                {/* Title Analysis */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-slate-900">Análise do Título</h4>
                    <Badge className={getScoreBadgeColor(seoAnalysis.title_analysis.score)}>
                      {seoAnalysis.title_analysis.score}/100
                    </Badge>
                  </div>
                  {seoAnalysis.title_analysis.issues?.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {seoAnalysis.title_analysis.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-700">{seoAnalysis.title_analysis.suggestions}</p>
                </div>

                {/* Description Analysis */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-slate-900">Análise da Descrição</h4>
                    <Badge className={getScoreBadgeColor(seoAnalysis.description_analysis.score)}>
                      {seoAnalysis.description_analysis.score}/100
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-slate-500">Palavras</p>
                      <p className="font-semibold">{seoAnalysis.description_analysis.word_count}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Keywords</p>
                      <p className="font-semibold">{seoAnalysis.description_analysis.keyword_density}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Legibilidade</p>
                      <p className="font-semibold">{seoAnalysis.description_analysis.readability}</p>
                    </div>
                  </div>
                  {seoAnalysis.description_analysis.issues?.length > 0 && (
                    <div className="space-y-1">
                      {seoAnalysis.description_analysis.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-amber-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Improvements */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Melhorias Prioritárias
                  </h4>
                  <ol className="space-y-2 list-decimal list-inside text-sm text-blue-800">
                    {seoAnalysis.top_improvements?.map((improvement, i) => (
                      <li key={i}>{improvement}</li>
                    ))}
                  </ol>
                </div>
              </TabsContent>

              <TabsContent value="optimizations" className="space-y-4 mt-4">
                <div>
                  <Label>Título Otimizado</Label>
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-slate-900">{seoAnalysis.optimized_title}</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(seoAnalysis.optimized_title);
                        toast.success("Copiado!");
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Meta Description Otimizada</Label>
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-slate-900">{seoAnalysis.optimized_meta_description}</p>
                    <p className="text-xs text-green-700 mt-2">
                      {seoAnalysis.optimized_meta_description.length} caracteres
                    </p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(seoAnalysis.optimized_meta_description);
                        toast.success("Copiado!");
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={applyOptimizations}
                    disabled={optimizing}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {optimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        A aplicar...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Aplicar Otimizações ao Imóvel
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="keywords" className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-600" />
                    Keywords em Falta
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {seoAnalysis.missing_keywords?.map((keyword, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-blue-50"
                        onClick={() => {
                          navigator.clipboard.writeText(keyword);
                          toast.success(`"${keyword}" copiado!`);
                        }}
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Clique numa keyword para copiar
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                  <h5 className="font-medium text-amber-900 mb-2">💡 Dica</h5>
                  <p className="text-sm text-amber-800">
                    Integre estas keywords naturalmente no título e descrição para melhorar o ranking nos motores de busca.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Quick SEO Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600" />
            Dicas Rápidas de SEO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-slate-900 mb-1">Títulos Otimizados</h5>
                <p className="text-sm text-slate-600">
                  Inclua localização, tipologia (T2, T3) e tipo de negócio nos primeiros 60 caracteres
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-slate-900 mb-1">Descrições Completas</h5>
                <p className="text-sm text-slate-600">
                  Mínimo 200 palavras, máximo 500. Densidade de keywords 2-3%
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-slate-900 mb-1">Imagens Otimizadas</h5>
                <p className="text-sm text-slate-600">
                  Use nomes descritivos e alt text com keywords relevantes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-slate-900 mb-1">URLs Amigáveis</h5>
                <p className="text-sm text-slate-600">
                  Use slugs descritivos: /moradia-t3-cascais em vez de /property/123
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}