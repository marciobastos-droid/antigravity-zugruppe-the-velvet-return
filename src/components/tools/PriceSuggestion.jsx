import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, DollarSign, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

export default function PriceSuggestion() {
  const [analyzing, setAnalyzing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    property_type: "",
    listing_type: "sale",
    location: "",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    year_built: "",
    condition: "good",
    amenities: ""
  });
  const [analysis, setAnalysis] = React.useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const analyzePricing = async () => {
    if (!formData.property_type || !formData.location || !formData.square_feet) {
      toast.error("Preencha pelo menos o tipo, localização e área");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      // Get similar properties
      const similarProperties = properties
        .filter(p => {
          if (p.listing_type !== formData.listing_type) return false;
          if (p.property_type !== formData.property_type) return false;
          if (!p.city?.toLowerCase().includes(formData.location.toLowerCase()) &&
              !p.state?.toLowerCase().includes(formData.location.toLowerCase())) return false;
          return true;
        })
        .map(p => ({
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          square_feet: p.square_feet,
          city: p.city
        }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `És um especialista em avaliação imobiliária. Analisa o seguinte imóvel e sugere um preço competitivo:

IMÓVEL A AVALIAR:
- Tipo: ${formData.property_type}
- Tipo de anúncio: ${formData.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
- Localização: ${formData.location}
- Quartos: ${formData.bedrooms || 'N/A'}
- Casas de banho: ${formData.bathrooms || 'N/A'}
- Área: ${formData.square_feet}m²
- Ano de construção: ${formData.year_built || 'N/A'}
- Estado: ${formData.condition === 'excellent' ? 'Excelente' : formData.condition === 'good' ? 'Bom' : 'A necessitar de obras'}
- Comodidades: ${formData.amenities || 'N/A'}

IMÓVEIS SIMILARES NO MERCADO (${similarProperties.length}):
${similarProperties.length > 0 ? JSON.stringify(similarProperties.slice(0, 10), null, 2) : 'Nenhum imóvel similar encontrado na base de dados'}

Com base nos dados acima e no teu conhecimento do mercado imobiliário português, fornece:

1. suggested_price: Preço sugerido em euros (número)
2. price_min: Preço mínimo recomendado (número)
3. price_max: Preço máximo recomendado (número)
4. confidence: Nível de confiança da avaliação (low, medium, high)
5. reasoning: Lista de 3-4 razões principais para a sugestão de preço
6. market_insights: 2-3 insights sobre o mercado local
7. pricing_strategy: Estratégia de precificação recomendada (competitive, premium, value)
8. warnings: Lista de avisos ou fatores que podem afetar o preço (pode ser vazia)`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_price: { type: "number" },
            price_min: { type: "number" },
            price_max: { type: "number" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
            reasoning: { type: "array", items: { type: "string" } },
            market_insights: { type: "array", items: { type: "string" } },
            pricing_strategy: { type: "string", enum: ["competitive", "premium", "value"] },
            warnings: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis({
        ...result,
        comparable_count: similarProperties.length
      });
      toast.success("Análise concluída!");
    } catch (error) {
      toast.error("Erro ao analisar preço");
      console.error(error);
    }

    setAnalyzing(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return 'bg-green-100 text-green-800 border-green-200';
    if (confidence === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  const getStrategyLabel = (strategy) => {
    if (strategy === 'competitive') return 'Competitivo';
    if (strategy === 'premium') return 'Premium';
    return 'Valor';
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do Imóvel</CardTitle>
          <p className="text-sm text-slate-600">Preencha para obter sugestão de preço</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Imóvel *</Label>
              <Select value={formData.property_type} onValueChange={(v) => setFormData({...formData, property_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">Moradia</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Anúncio</Label>
              <Select value={formData.listing_type} onValueChange={(v) => setFormData({...formData, listing_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="rent">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Localização *</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="Ex: Lisboa, Cascais, Porto..."
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Área (m²) *</Label>
              <Input
                type="number"
                value={formData.square_feet}
                onChange={(e) => setFormData({...formData, square_feet: e.target.value})}
                placeholder="120"
              />
            </div>
            <div>
              <Label>Quartos</Label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                placeholder="3"
              />
            </div>
            <div>
              <Label>Casas de Banho</Label>
              <Input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                placeholder="2"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Ano de Construção</Label>
              <Input
                type="number"
                value={formData.year_built}
                onChange={(e) => setFormData({...formData, year_built: e.target.value})}
                placeholder="2010"
              />
            </div>
            <div>
              <Label>Estado do Imóvel</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({...formData, condition: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excelente</SelectItem>
                  <SelectItem value="good">Bom</SelectItem>
                  <SelectItem value="needswork">A necessitar de obras</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Comodidades</Label>
            <Input
              value={formData.amenities}
              onChange={(e) => setFormData({...formData, amenities: e.target.value})}
              placeholder="Piscina, Garagem, Varanda..."
            />
          </div>

          <Button
            onClick={analyzePricing}
            disabled={analyzing}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A analisar...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Analisar Preço
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sugestão de Preço</CardTitle>
          <p className="text-sm text-slate-600">Baseado em IA e dados de mercado</p>
        </CardHeader>
        <CardContent>
          {!analysis ? (
            <div className="text-center py-20">
              <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Preencha os dados e clique em "Analisar Preço"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main Price */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Preço Sugerido</span>
                </div>
                <div className="text-4xl font-bold text-green-900 mb-2">
                  €{analysis.suggested_price.toLocaleString()}
                </div>
                <div className="text-sm text-green-700">
                  Intervalo: €{analysis.price_min.toLocaleString()} - €{analysis.price_max.toLocaleString()}
                </div>
              </div>

              {/* Confidence & Strategy */}
              <div className="flex gap-3">
                <Badge className={`${getConfidenceColor(analysis.confidence)} border flex-1 justify-center py-2`}>
                  Confiança: {analysis.confidence === 'high' ? 'Alta' : analysis.confidence === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                <Badge variant="outline" className="flex-1 justify-center py-2">
                  Estratégia: {getStrategyLabel(analysis.pricing_strategy)}
                </Badge>
              </div>

              {/* Data Source */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Análise baseada em {analysis.comparable_count} imóveis similares na base de dados
                </p>
              </div>

              {/* Reasoning */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Fundamentação
                </h4>
                <ul className="space-y-2">
                  {analysis.reasoning.map((reason, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Market Insights */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Insights de Mercado
                </h4>
                <ul className="space-y-2">
                  {analysis.market_insights.map((insight, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              {analysis.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Avisos
                  </h4>
                  <ul className="space-y-1">
                    {analysis.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                        <span>⚠️</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}