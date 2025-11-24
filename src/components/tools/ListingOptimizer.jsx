import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, TrendingUp, Target, Copy, CheckCircle2, ArrowRight, Eye, Hash } from "lucide-react";
import { toast } from "sonner";

export default function ListingOptimizer() {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [optimization, setOptimization] = React.useState(null);
  const [applyingChanges, setApplyingChanges] = React.useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const activeProperties = properties.filter(p => p.status === 'active' || p.status === 'pending');

  const updatePropertyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Property.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success("Imóvel atualizado com as otimizações!");
      setOptimization(null);
      setSelectedPropertyId("");
    },
  });

  const analyzeAndOptimize = async () => {
    if (!selectedPropertyId) {
      toast.error("Selecione um imóvel");
      return;
    }

    const property = properties.find(p => p.id === selectedPropertyId);
    if (!property) return;

    setAnalyzing(true);
    setOptimization(null);

    try {
      // Get similar properties for performance analysis
      const similarProperties = properties.filter(p => {
        if (p.id === selectedPropertyId) return false;
        return p.property_type === property.property_type && 
               p.city?.toLowerCase() === property.city?.toLowerCase() &&
               p.status === 'active';
      }).slice(0, 10);

      const propertyData = `
IMÓVEL ATUAL:
- Título: ${property.title}
- Descrição: ${property.description || 'Sem descrição'}
- Tipo: ${property.property_type}
- Negócio: ${property.listing_type}
- Preço: €${property.price?.toLocaleString()}
- Localização: ${property.city}, ${property.state}
- Quartos: ${property.bedrooms || 'N/A'}
- Área: ${property.square_feet || property.useful_area || 'N/A'}m²
- Comodidades: ${property.amenities?.join(', ') || 'Nenhuma'}
- Certificado Energético: ${property.energy_certificate || 'N/A'}

ANÁLISE COMPARATIVA:
${similarProperties.length} imóveis similares na mesma localização encontrados para benchmark.
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `És um especialista em marketing imobiliário digital português com foco em otimização de anúncios para máxima conversão.

${propertyData}

MISSÃO: Otimizar completamente este anúncio para aumentar alcance e conversão.

ANÁLISE NECESSÁRIA:

1. **TÍTULO OTIMIZADO** 
   - Cria 3 opções de título (60-80 caracteres)
   - Inclui localização + tipo + diferencial
   - SEO-friendly e chamativo
   - Usa números e dados concretos

2. **DESCRIÇÃO OTIMIZADA**
   - Reescreve a descrição (250-400 palavras)
   - Estrutura: Hook → Características → Localização → Call-to-action
   - Linguagem persuasiva e emocional
   - Destaca diferenciais únicos
   - Otimizada para SEO

3. **PALAVRAS-CHAVE**
   - 10-15 keywords relevantes
   - Mix de genéricas e long-tail
   - Baseadas em tendências de pesquisa PT
   - Incluir variações locais

4. **OTIMIZAÇÕES ESPECÍFICAS**
   - Que dados faltam e devem ser adicionados?
   - Que comodidades destacar?
   - Sugestões de fotos/ângulos a adicionar
   - Melhorias no preço/posicionamento

5. **ESTRATÉGIA DE CONVERSÃO**
   - Call-to-actions recomendados
   - Urgência/escassez a criar
   - Público-alvo específico
   - Canais de promoção ideais

6. **SCORE DE QUALIDADE**
   - Score atual do anúncio (0-100)
   - Score projetado pós-otimização
   - Principais melhorias esperadas

IMPORTANTE:
- Baseado no mercado imobiliário português
- Foca em conversão, não só visualizações
- Sê específico e acionável
- Usa dados e números sempre que possível

Retorna JSON estruturado.`,
        response_json_schema: {
          type: "object",
          properties: {
            title_options: {
              type: "array",
              items: { type: "string" }
            },
            optimized_description: { type: "string" },
            keywords: {
              type: "array",
              items: { type: "string" }
            },
            missing_data: {
              type: "array",
              items: { type: "string" }
            },
            amenities_to_highlight: {
              type: "array",
              items: { type: "string" }
            },
            photo_suggestions: {
              type: "array",
              items: { type: "string" }
            },
            pricing_recommendations: { type: "string" },
            call_to_actions: {
              type: "array",
              items: { type: "string" }
            },
            urgency_tactics: {
              type: "array",
              items: { type: "string" }
            },
            target_audience: { type: "string" },
            promotion_channels: {
              type: "array",
              items: { type: "string" }
            },
            current_score: { type: "number" },
            projected_score: { type: "number" },
            key_improvements: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setOptimization({
        property,
        analysis: result
      });

      toast.success("Análise de otimização concluída!");
    } catch (error) {
      toast.error("Erro ao analisar anúncio");
      console.error(error);
    }

    setAnalyzing(false);
  };

  const applyOptimizations = async (selectedTitle) => {
    if (!optimization) return;

    setApplyingChanges(true);

    try {
      await updatePropertyMutation.mutateAsync({
        id: optimization.property.id,
        data: {
          title: selectedTitle,
          description: optimization.analysis.optimized_description
        }
      });
    } catch (error) {
      toast.error("Erro ao aplicar otimizações");
    }

    setApplyingChanges(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Otimizador de Anúncios com IA
          </CardTitle>
          <p className="text-sm text-slate-600">
            Otimize títulos, descrições e estratégias para maximizar alcance e conversões
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Selecionar Imóvel para Otimizar</Label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um imóvel..." />
              </SelectTrigger>
              <SelectContent>
                {activeProperties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} - {p.city} - €{p.price?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={analyzeAndOptimize} 
            disabled={analyzing || !selectedPropertyId}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A analisar e otimizar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analisar e Otimizar Anúncio
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {optimization && (
        <div className="space-y-6">
          {/* Quality Scores */}
          <Card className="border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Score de Qualidade do Anúncio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center p-6 bg-white rounded-lg border-2 border-slate-300">
                  <div className="text-sm text-slate-600 mb-2">Score Atual</div>
                  <div className="text-5xl font-bold text-slate-900 mb-2">
                    {optimization.analysis.current_score}
                  </div>
                  <Badge variant="secondary" className="bg-slate-100">Antes</Badge>
                </div>
                <div className="text-center p-6 bg-white rounded-lg border-2 border-green-500">
                  <div className="text-sm text-green-600 mb-2">Score Projetado</div>
                  <div className="text-5xl font-bold text-green-900 mb-2">
                    {optimization.analysis.projected_score}
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    +{optimization.analysis.projected_score - optimization.analysis.current_score} pontos
                  </Badge>
                </div>
              </div>

              {optimization.analysis.key_improvements?.length > 0 && (
                <div className="mt-4 bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-slate-900 mb-3">🎯 Principais Melhorias:</h4>
                  <ul className="space-y-2">
                    {optimization.analysis.key_improvements.map((improvement, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimized Titles */}
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Títulos Otimizados
                </span>
                <Badge variant="outline">SEO + Conversão</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 border">
                <p className="text-xs text-slate-600 mb-1">Título Atual:</p>
                <p className="text-sm font-medium text-slate-900">{optimization.property.title}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-blue-900">Opções Otimizadas:</p>
                {optimization.analysis.title_options?.map((title, i) => (
                  <div key={i} className="bg-blue-50 rounded-lg p-3 border border-blue-200 group hover:bg-blue-100 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-blue-600 text-white">Opção {i + 1}</Badge>
                          <span className="text-xs text-slate-600">
                            {title.length} caracteres
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900">{title}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(title)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => applyOptimizations(title)}
                          disabled={applyingChanges}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Optimized Description */}
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-green-600" />
                  Descrição Otimizada
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(optimization.analysis.optimized_description)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 border max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-600 mb-1">Descrição Atual:</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {optimization.property.description || 'Sem descrição'}
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-xs text-green-900 font-semibold mb-2">Nova Descrição Otimizada:</p>
                <p className="text-sm text-slate-900 whitespace-pre-line">
                  {optimization.analysis.optimized_description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card className="border-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-amber-600" />
                Palavras-Chave para SEO e Promoção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {optimization.analysis.keywords?.map((keyword, i) => (
                  <Badge 
                    key={i} 
                    className="bg-amber-100 text-amber-800 cursor-pointer hover:bg-amber-200"
                    onClick={() => copyToClipboard(keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => copyToClipboard(optimization.analysis.keywords.join(', '))}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Todas
              </Button>
            </CardContent>
          </Card>

          {/* Conversion Strategy */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-blue-500">
              <CardHeader>
                <CardTitle className="text-blue-900">Call-to-Actions Recomendados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {optimization.analysis.call_to_actions?.map((cta, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                      <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {cta}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="text-red-900">Táticas de Urgência</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {optimization.analysis.urgency_tactics?.map((tactic, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                      <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {tactic}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Dados em Falta</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {optimization.analysis.missing_data?.map((data, i) => (
                    <li key={i} className="text-sm text-slate-700">• {data}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Sugestões de Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {optimization.analysis.photo_suggestions?.map((suggestion, i) => (
                    <li key={i} className="text-sm text-slate-700">📸 {suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Target Audience & Channels */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-indigo-500">
              <CardHeader>
                <CardTitle className="text-indigo-900">Público-Alvo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{optimization.analysis.target_audience}</p>
              </CardContent>
            </Card>

            <Card className="border-purple-500">
              <CardHeader>
                <CardTitle className="text-purple-900">Canais de Promoção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {optimization.analysis.promotion_channels?.map((channel, i) => (
                    <Badge key={i} variant="outline" className="border-purple-300 text-purple-700">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Recommendations */}
          {optimization.analysis.pricing_recommendations && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="text-green-900">Recomendações de Preço</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{optimization.analysis.pricing_recommendations}</p>
              </CardContent>
            </Card>
          )}

          {/* Amenities to Highlight */}
          {optimization.analysis.amenities_to_highlight?.length > 0 && (
            <Card className="border-teal-500">
              <CardHeader>
                <CardTitle className="text-teal-900">Comodidades a Destacar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {optimization.analysis.amenities_to_highlight.map((amenity, i) => (
                    <Badge key={i} className="bg-teal-100 text-teal-800">
                      ✓ {amenity}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}