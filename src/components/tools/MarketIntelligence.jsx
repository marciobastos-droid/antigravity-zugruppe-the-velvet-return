import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, BarChart3, MapPin, Home, DollarSign, Target, Lightbulb, AlertTriangle, CheckCircle2, Minus } from "lucide-react";
import { toast } from "sonner";

export default function MarketIntelligence() {
  const [mode, setMode] = React.useState("existing"); // existing or new
  const [selectedPropertyId, setSelectedPropertyId] = React.useState("");
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysis, setAnalysis] = React.useState(null);

  const [newPropertyData, setNewPropertyData] = React.useState({
    property_type: "apartment",
    listing_type: "sale",
    city: "",
    state: "",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    price: "",
    year_built: ""
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const activeProperties = properties.filter(p => p.status === 'active');

  const analyzeMarket = async () => {
    let propertyToAnalyze;

    if (mode === "existing") {
      if (!selectedPropertyId) {
        toast.error("Selecione um imóvel");
        return;
      }
      propertyToAnalyze = properties.find(p => p.id === selectedPropertyId);
    } else {
      if (!newPropertyData.city || !newPropertyData.property_type) {
        toast.error("Preencha pelo menos cidade e tipo de imóvel");
        return;
      }
      propertyToAnalyze = newPropertyData;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      // Find similar properties
      const similarProperties = properties.filter(p => {
        if (mode === "existing" && p.id === selectedPropertyId) return false;
        
        const sameCity = p.city?.toLowerCase() === propertyToAnalyze.city?.toLowerCase();
        const sameType = p.property_type === propertyToAnalyze.property_type;
        const sameListingType = p.listing_type === propertyToAnalyze.listing_type;
        
        let similarSize = true;
        if (propertyToAnalyze.square_feet) {
          const targetSize = Number(propertyToAnalyze.square_feet);
          const propSize = Number(p.square_feet || p.useful_area || 0);
          similarSize = propSize >= targetSize * 0.7 && propSize <= targetSize * 1.3;
        }
        
        let similarBedrooms = true;
        if (propertyToAnalyze.bedrooms) {
          const targetBeds = Number(propertyToAnalyze.bedrooms);
          similarBedrooms = Math.abs((p.bedrooms || 0) - targetBeds) <= 1;
        }

        return sameCity && sameType && sameListingType && similarSize && similarBedrooms;
      }).slice(0, 10);

      // Calculate market statistics
      const prices = similarProperties.map(p => p.price).filter(Boolean);
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      
      const pricesPerSqm = similarProperties
        .filter(p => p.price && (p.square_feet || p.useful_area))
        .map(p => p.price / (p.square_feet || p.useful_area));
      const avgPricePerSqm = pricesPerSqm.length > 0 ? 
        pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length : 0;

      // Prepare data for AI analysis
      const propertyDetails = `
IMÓVEL A ANALISAR:
- Tipo: ${propertyToAnalyze.property_type}
- Negócio: ${propertyToAnalyze.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
- Localização: ${propertyToAnalyze.city}, ${propertyToAnalyze.state}
- Quartos: ${propertyToAnalyze.bedrooms || 'N/A'}
- WCs: ${propertyToAnalyze.bathrooms || 'N/A'}
- Área: ${propertyToAnalyze.square_feet || propertyToAnalyze.useful_area || 'N/A'}m²
${propertyToAnalyze.price ? `- Preço Atual: €${Number(propertyToAnalyze.price).toLocaleString()}` : ''}
${propertyToAnalyze.year_built ? `- Ano: ${propertyToAnalyze.year_built}` : ''}
${propertyToAnalyze.amenities?.length > 0 ? `- Comodidades: ${propertyToAnalyze.amenities.join(', ')}` : ''}

DADOS DE MERCADO (${similarProperties.length} imóveis similares):
- Preço Médio: €${avgPrice.toLocaleString('pt-PT', {maximumFractionDigits: 0})}
- Preço Mínimo: €${minPrice.toLocaleString('pt-PT', {maximumFractionDigits: 0})}
- Preço Máximo: €${maxPrice.toLocaleString('pt-PT', {maximumFractionDigits: 0})}
- Preço Médio/m²: €${avgPricePerSqm.toLocaleString('pt-PT', {maximumFractionDigits: 0})}

AMOSTRA DE PROPRIEDADES SIMILARES:
${similarProperties.slice(0, 5).map((p, i) => `
${i + 1}. ${p.title}
   - Preço: €${p.price?.toLocaleString()} | Área: ${p.square_feet || p.useful_area}m²
   - Quartos: ${p.bedrooms} | WCs: ${p.bathrooms}
   ${p.year_built ? `- Ano: ${p.year_built}` : ''}
`).join('')}
`;

      const aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `És um analista imobiliário especialista no mercado português.

${propertyDetails}

ANÁLISE SOLICITADA:

Fornece uma análise de mercado COMPLETA e PROFISSIONAL em formato JSON com:

1. **market_positioning**: Avaliação da posição do imóvel no mercado (undervalued/fair/overvalued)
2. **recommended_price_range**: Faixa de preço recomendada {min, max, optimal}
3. **price_per_sqm_analysis**: Análise do preço por m² comparado ao mercado
4. **market_trends**: Tendências de mercado identificadas (lista de strings)
5. **competitive_advantages**: Vantagens competitivas do imóvel (lista)
6. **competitive_disadvantages**: Desvantagens competitivas (lista)
7. **pricing_strategy**: Estratégia de preço recomendada {strategy, reasoning, timeline}
8. **target_buyer_profile**: Perfil do comprador ideal
9. **time_on_market_estimate**: Estimativa de tempo no mercado (em dias)
10. **negotiation_margin**: Margem de negociação sugerida (percentagem)
11. **key_insights**: 3-5 insights principais (lista)
12. **risk_factors**: Fatores de risco identificados (lista)
13. **action_recommendations**: Recomendações de ação imediatas (lista)

IMPORTANTE:
- Sê específico e baseado nos dados fornecidos
- Usa linguagem profissional mas acessível
- Fornece números concretos
- Justifica as recomendações
- Considera o contexto do mercado português`,
        response_json_schema: {
          type: "object",
          properties: {
            market_positioning: { type: "string" },
            recommended_price_range: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
                optimal: { type: "number" }
              }
            },
            price_per_sqm_analysis: { type: "string" },
            market_trends: { type: "array", items: { type: "string" } },
            competitive_advantages: { type: "array", items: { type: "string" } },
            competitive_disadvantages: { type: "array", items: { type: "string" } },
            pricing_strategy: {
              type: "object",
              properties: {
                strategy: { type: "string" },
                reasoning: { type: "string" },
                timeline: { type: "string" }
              }
            },
            target_buyer_profile: { type: "string" },
            time_on_market_estimate: { type: "number" },
            negotiation_margin: { type: "number" },
            key_insights: { type: "array", items: { type: "string" } },
            risk_factors: { type: "array", items: { type: "string" } },
            action_recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis({
        property: propertyToAnalyze,
        similarProperties,
        marketStats: {
          avgPrice,
          minPrice,
          maxPrice,
          avgPricePerSqm,
          sampleSize: similarProperties.length
        },
        aiAnalysis
      });

      toast.success("Análise de mercado concluída!");
    } catch (error) {
      toast.error("Erro ao analisar mercado");
      console.error(error);
    }

    setAnalyzing(false);
  };

  const getPositioningColor = (positioning) => {
    if (positioning?.toLowerCase().includes('undervalued') || positioning?.toLowerCase().includes('abaixo')) {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    if (positioning?.toLowerCase().includes('overvalued') || positioning?.toLowerCase().includes('acima')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getPositioningIcon = (positioning) => {
    if (positioning?.toLowerCase().includes('undervalued') || positioning?.toLowerCase().includes('abaixo')) {
      return TrendingDown;
    }
    if (positioning?.toLowerCase().includes('overvalued') || positioning?.toLowerCase().includes('acima')) {
      return TrendingUp;
    }
    return Minus;
  };

  return (
    <div className="space-y-6">
      <Card className="border-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Inteligência de Mercado
          </CardTitle>
          <p className="text-sm text-slate-600">
            Análise comparativa de mercado com insights inteligentes e estratégias de preço
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Modo de Análise</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Analisar Imóvel Existente</SelectItem>
                <SelectItem value="new">Analisar Novo Imóvel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "existing" ? (
            <div>
              <Label>Selecionar Imóvel</Label>
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
          ) : (
            <div className="space-y-4 border-t pt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Imóvel *</Label>
                  <Select 
                    value={newPropertyData.property_type} 
                    onValueChange={(v) => setNewPropertyData({...newPropertyData, property_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">Moradia</SelectItem>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="condo">Condomínio</SelectItem>
                      <SelectItem value="townhouse">Casa Geminada</SelectItem>
                      <SelectItem value="land">Terreno</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Negócio *</Label>
                  <Select 
                    value={newPropertyData.listing_type} 
                    onValueChange={(v) => setNewPropertyData({...newPropertyData, listing_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rent">Arrendamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cidade *</Label>
                  <Input
                    value={newPropertyData.city}
                    onChange={(e) => setNewPropertyData({...newPropertyData, city: e.target.value})}
                    placeholder="Lisboa"
                  />
                </div>
                <div>
                  <Label>Distrito</Label>
                  <Input
                    value={newPropertyData.state}
                    onChange={(e) => setNewPropertyData({...newPropertyData, state: e.target.value})}
                    placeholder="Lisboa"
                  />
                </div>
                <div>
                  <Label>Quartos</Label>
                  <Input
                    type="number"
                    value={newPropertyData.bedrooms}
                    onChange={(e) => setNewPropertyData({...newPropertyData, bedrooms: e.target.value})}
                    placeholder="3"
                  />
                </div>
                <div>
                  <Label>WCs</Label>
                  <Input
                    type="number"
                    value={newPropertyData.bathrooms}
                    onChange={(e) => setNewPropertyData({...newPropertyData, bathrooms: e.target.value})}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label>Área (m²)</Label>
                  <Input
                    type="number"
                    value={newPropertyData.square_feet}
                    onChange={(e) => setNewPropertyData({...newPropertyData, square_feet: e.target.value})}
                    placeholder="120"
                  />
                </div>
                <div>
                  <Label>Preço Atual (opcional)</Label>
                  <Input
                    type="number"
                    value={newPropertyData.price}
                    onChange={(e) => setNewPropertyData({...newPropertyData, price: e.target.value})}
                    placeholder="300000"
                  />
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={analyzeMarket} 
            disabled={analyzing}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A analisar mercado...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Analisar Mercado
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-6">
          {/* Market Statistics */}
          <Card className="border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Estatísticas de Mercado - {analysis.property.city}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {analysis.marketStats.sampleSize}
                    </div>
                    <div className="text-xs text-blue-700">Imóveis Similares</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-900">
                      €{analysis.marketStats.avgPrice.toLocaleString('pt-PT', {maximumFractionDigits: 0})}
                    </div>
                    <div className="text-xs text-green-700">Preço Médio</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-sm font-bold text-slate-900">
                      €{analysis.marketStats.minPrice.toLocaleString('pt-PT', {maximumFractionDigits: 0})} - €{analysis.marketStats.maxPrice.toLocaleString('pt-PT', {maximumFractionDigits: 0})}
                    </div>
                    <div className="text-xs text-slate-700">Faixa de Preços</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-900">
                      €{analysis.marketStats.avgPricePerSqm.toLocaleString('pt-PT', {maximumFractionDigits: 0})}
                    </div>
                    <div className="text-xs text-purple-700">Preço/m²</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Market Positioning */}
          <Card className={`border-2 ${getPositioningColor(analysis.aiAnalysis.market_positioning)}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(getPositioningIcon(analysis.aiAnalysis.market_positioning), { className: "w-5 h-5" })}
                Posicionamento de Mercado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-4">{analysis.aiAnalysis.market_positioning}</p>
              
              {analysis.aiAnalysis.recommended_price_range && (
                <div className="bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Faixa de Preço Recomendada
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-slate-600 mb-1">Mínimo</div>
                      <div className="text-xl font-bold text-slate-900">
                        €{analysis.aiAnalysis.recommended_price_range.min?.toLocaleString('pt-PT')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-green-600 mb-1">Ótimo</div>
                      <div className="text-2xl font-bold text-green-900">
                        €{analysis.aiAnalysis.recommended_price_range.optimal?.toLocaleString('pt-PT')}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-slate-600 mb-1">Máximo</div>
                      <div className="text-xl font-bold text-slate-900">
                        €{analysis.aiAnalysis.recommended_price_range.max?.toLocaleString('pt-PT')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analysis.aiAnalysis.price_per_sqm_analysis && (
                <div className="mt-4 bg-white rounded-lg p-4 border">
                  <h4 className="font-semibold text-slate-900 mb-2">Análise Preço/m²</h4>
                  <p className="text-sm text-slate-700">{analysis.aiAnalysis.price_per_sqm_analysis}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Strategy */}
          {analysis.aiAnalysis.pricing_strategy && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Estratégia de Preço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Estratégia Recomendada</h4>
                  <Badge className="bg-green-100 text-green-800 text-sm">
                    {analysis.aiAnalysis.pricing_strategy.strategy}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Justificação</h4>
                  <p className="text-sm text-slate-700">{analysis.aiAnalysis.pricing_strategy.reasoning}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Timeline</h4>
                  <p className="text-sm text-slate-700">{analysis.aiAnalysis.pricing_strategy.timeline}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Tempo Estimado no Mercado</h4>
                    <p className="text-2xl font-bold text-blue-900">{analysis.aiAnalysis.time_on_market_estimate} dias</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Margem de Negociação</h4>
                    <p className="text-2xl font-bold text-purple-900">{analysis.aiAnalysis.negotiation_margin}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Competitive Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <CheckCircle2 className="w-5 h-5" />
                  Vantagens Competitivas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.aiAnalysis.competitive_advantages?.map((adv, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {adv}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <AlertTriangle className="w-5 h-5" />
                  Desvantagens Competitivas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.aiAnalysis.competitive_disadvantages?.map((dis, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {dis}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Market Trends */}
          <Card className="border-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Tendências de Mercado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.aiAnalysis.market_trends?.map((trend, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <TrendingUp className="w-4 h-4 mt-0.5 text-purple-600 flex-shrink-0" />
                    {trend}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card className="border-blue-500 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Lightbulb className="w-5 h-5" />
                Insights Principais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysis.aiAnalysis.key_insights?.map((insight, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-blue-900">
                    <span className="font-bold text-blue-600 flex-shrink-0">{i + 1}.</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Risk Factors & Action Recommendations */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="w-5 h-5" />
                  Fatores de Risco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.aiAnalysis.risk_factors?.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-indigo-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <Target className="w-5 h-5" />
                  Recomendações de Ação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.aiAnalysis.action_recommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Target Buyer Profile */}
          {analysis.aiAnalysis.target_buyer_profile && (
            <Card className="border-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-amber-600" />
                  Perfil do Comprador Ideal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700">{analysis.aiAnalysis.target_buyer_profile}</p>
              </CardContent>
            </Card>
          )}

          {/* Similar Properties Sample */}
          {analysis.similarProperties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Amostra de Imóveis Comparáveis ({analysis.similarProperties.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.similarProperties.slice(0, 5).map((prop) => (
                    <div key={prop.id} className="border rounded-lg p-3 bg-slate-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-900">{prop.title}</h4>
                        <Badge className="bg-blue-100 text-blue-800">
                          €{prop.price?.toLocaleString()}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>📍 {prop.city}, {prop.state}</div>
                        <div>
                          🛏️ {prop.bedrooms} quartos • 🚿 {prop.bathrooms} WCs • 📐 {prop.square_feet || prop.useful_area}m²
                          {prop.year_built && ` • 📅 ${prop.year_built}`}
                        </div>
                        {(prop.square_feet || prop.useful_area) && prop.price && (
                          <div className="text-xs text-slate-500">
                            €{(prop.price / (prop.square_feet || prop.useful_area)).toLocaleString('pt-PT', {maximumFractionDigits: 0})}/m²
                          </div>
                        )}
                      </div>
                    </div>
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