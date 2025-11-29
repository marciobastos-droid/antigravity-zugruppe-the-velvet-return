import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Euro, TrendingUp, TrendingDown, Minus, Loader2, Sparkles,
  MapPin, Home, Bed, Square, Calendar, BarChart3, Target
} from "lucide-react";
import { toast } from "sonner";

export default function AIPriceSuggestion({ property, onUpdate }) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState(null);

  const { data: comparables = [] } = useQuery({
    queryKey: ['comparableProperties', property?.city, property?.property_type],
    queryFn: async () => {
      if (!property?.city) return [];
      const allProps = await base44.entities.Property.list();
      return allProps.filter(p => 
        p.id !== property.id &&
        p.city?.toLowerCase() === property.city?.toLowerCase() &&
        p.property_type === property.property_type &&
        p.listing_type === property.listing_type &&
        p.price > 0
      ).slice(0, 20);
    },
    enabled: !!property?.city
  });

  const analyzePricing = async () => {
    setIsAnalyzing(true);
    try {
      const comparableData = comparables.map(p => ({
        price: p.price,
        sqm: p.square_feet || p.useful_area,
        bedrooms: p.bedrooms,
        city: p.city,
        state: p.state,
        year_built: p.year_built,
        status: p.status
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa este imóvel e sugere um preço ótimo baseado em dados de mercado.

IMÓVEL A AVALIAR:
- Tipo: ${property.property_type}
- Localização: ${property.city}, ${property.state}
- Área: ${property.square_feet || property.useful_area || 0} m²
- Quartos: ${property.bedrooms || 0}
- Casas de banho: ${property.bathrooms || 0}
- Ano de construção: ${property.year_built || 'N/A'}
- Certificado energético: ${property.energy_certificate || 'N/A'}
- Garagem: ${property.garage || 'N/A'}
- Amenidades: ${property.amenities?.join(', ') || 'N/A'}
- Preço atual: €${property.price?.toLocaleString() || 0}
- Tipo de negócio: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}

IMÓVEIS COMPARÁVEIS NA ZONA (${comparables.length} imóveis):
${JSON.stringify(comparableData, null, 2)}

INSTRUÇÕES:
1. Calcula o preço médio por m² na zona
2. Ajusta para as características específicas do imóvel
3. Considera a qualidade (certificado energético, amenidades)
4. Fornece um intervalo de preço recomendado
5. Indica se o preço atual está acima, abaixo ou dentro do mercado

Responde em JSON com:
- suggested_price: preço sugerido (número)
- min_price: preço mínimo recomendado
- max_price: preço máximo recomendado
- price_per_sqm: preço por m² sugerido
- market_average_sqm: média de mercado por m²
- price_position: "above" | "below" | "market" (posição do preço atual)
- confidence: 0-100 (confiança na sugestão)
- factors: array de {factor: string, impact: "positive" | "negative" | "neutral", description: string}
- recommendation: texto com recomendação (máximo 200 caracteres)`,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_price: { type: "number" },
            min_price: { type: "number" },
            max_price: { type: "number" },
            price_per_sqm: { type: "number" },
            market_average_sqm: { type: "number" },
            price_position: { type: "string" },
            confidence: { type: "number" },
            factors: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  factor: { type: "string" },
                  impact: { type: "string" },
                  description: { type: "string" }
                }
              } 
            },
            recommendation: { type: "string" }
          }
        },
        add_context_from_internet: true
      });

      setSuggestion(result);
      toast.success("Análise de preço concluída!");
    } catch (error) {
      console.error(error);
      toast.error("Erro na análise de preço");
    }
    setIsAnalyzing(false);
  };

  const applyPrice = async (price) => {
    try {
      await onUpdate?.(property.id, { price });
      toast.success(`Preço atualizado para €${price.toLocaleString()}`);
    } catch (error) {
      toast.error("Erro ao atualizar preço");
    }
  };

  const formatPrice = (val) => {
    if (!val) return '-';
    return `€${val.toLocaleString('pt-PT')}`;
  };

  const priceDiff = suggestion ? ((property.price - suggestion.suggested_price) / suggestion.suggested_price * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Current Price & Comparables Info */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-slate-50">
          <CardContent className="p-3">
            <div className="text-xs text-slate-500 mb-1">Preço Atual</div>
            <div className="text-xl font-bold text-slate-900">
              {formatPrice(property.price)}
            </div>
            {property.square_feet > 0 && (
              <div className="text-xs text-slate-500">
                €{Math.round(property.price / property.square_feet)}/m²
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-3">
            <div className="text-xs text-blue-600 mb-1">Comparáveis</div>
            <div className="text-xl font-bold text-blue-900">
              {comparables.length}
            </div>
            <div className="text-xs text-blue-600">imóveis na zona</div>
          </CardContent>
        </Card>
      </div>

      {/* Analyze Button */}
      <Button
        onClick={analyzePricing}
        disabled={isAnalyzing}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A analisar mercado...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Analisar Preço com IA
          </>
        )}
      </Button>

      {/* Results */}
      {suggestion && (
        <div className="space-y-4 pt-4 border-t">
          {/* Suggested Price */}
          <Card className={`border-2 ${
            suggestion.price_position === 'above' ? 'border-red-300 bg-red-50' :
            suggestion.price_position === 'below' ? 'border-green-300 bg-green-50' :
            'border-blue-300 bg-blue-50'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Preço Sugerido</span>
                </div>
                <Badge className={`${
                  suggestion.price_position === 'above' ? 'bg-red-100 text-red-700' :
                  suggestion.price_position === 'below' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {suggestion.price_position === 'above' && <TrendingUp className="w-3 h-3 mr-1" />}
                  {suggestion.price_position === 'below' && <TrendingDown className="w-3 h-3 mr-1" />}
                  {suggestion.price_position === 'market' && <Minus className="w-3 h-3 mr-1" />}
                  {suggestion.price_position === 'above' ? 'Acima do mercado' :
                   suggestion.price_position === 'below' ? 'Abaixo do mercado' : 'No mercado'}
                </Badge>
              </div>

              <div className="text-3xl font-bold text-slate-900 mb-2">
                {formatPrice(suggestion.suggested_price)}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                <span>Min: {formatPrice(suggestion.min_price)}</span>
                <span>Max: {formatPrice(suggestion.max_price)}</span>
              </div>

              {priceDiff !== 0 && (
                <div className={`text-sm font-medium ${priceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% vs preço atual
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyPrice(suggestion.min_price)}
                >
                  Aplicar Min
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyPrice(suggestion.suggested_price)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Aplicar Sugerido
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyPrice(suggestion.max_price)}
                >
                  Aplicar Max
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Price per sqm comparison */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-slate-500 mb-1">Sugerido/m²</div>
                <div className="text-lg font-bold text-purple-600">
                  €{suggestion.price_per_sqm?.toLocaleString() || '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-slate-500 mb-1">Média Mercado/m²</div>
                <div className="text-lg font-bold text-slate-700">
                  €{suggestion.market_average_sqm?.toLocaleString() || '-'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Confiança da análise</span>
              <span className="font-medium">{suggestion.confidence}%</span>
            </div>
            <Progress value={suggestion.confidence} className="h-2" />
          </div>

          {/* Factors */}
          {suggestion.factors?.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">Fatores Considerados:</div>
              <div className="flex flex-wrap gap-2">
                {suggestion.factors.map((f, idx) => (
                  <Badge 
                    key={idx}
                    variant="outline"
                    className={`text-xs ${
                      f.impact === 'positive' ? 'border-green-300 text-green-700 bg-green-50' :
                      f.impact === 'negative' ? 'border-red-300 text-red-700 bg-red-50' :
                      'border-slate-300 text-slate-600'
                    }`}
                  >
                    {f.impact === 'positive' ? '↑' : f.impact === 'negative' ? '↓' : '→'} {f.factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {suggestion.recommendation && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
                <p className="text-sm text-purple-800">{suggestion.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}