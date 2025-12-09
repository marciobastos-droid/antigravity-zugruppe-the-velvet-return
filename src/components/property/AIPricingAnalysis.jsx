import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, DollarSign, Loader2, 
  Target, AlertCircle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Wand2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AIPricingAnalysis({ property }) {
  const queryClient = useQueryClient();
  const [analysis, setAnalysis] = React.useState(property.ai_price_analysis || null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzePricingStrategy', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setAnalysis(data.analysis);
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['property', property.id] });
        toast.success("Análise de preço concluída!");
      } else {
        toast.error(data.error || "Erro na análise");
      }
    },
    onError: () => {
      toast.error("Erro ao analisar preço");
    }
  });

  const strategyColors = {
    aggressive: "bg-red-100 text-red-800 border-red-300",
    moderate: "bg-blue-100 text-blue-800 border-blue-300",
    premium: "bg-purple-100 text-purple-800 border-purple-300",
    conservative: "bg-green-100 text-green-800 border-green-300"
  };

  const strategyLabels = {
    aggressive: "Agressivo",
    moderate: "Moderado",
    premium: "Premium",
    conservative: "Conservador"
  };

  const marketPositionColors = {
    below_market: "bg-green-100 text-green-800",
    market_average: "bg-blue-100 text-blue-800",
    above_market: "bg-amber-100 text-amber-800",
    premium: "bg-purple-100 text-purple-800"
  };

  const marketPositionLabels = {
    below_market: "Abaixo do Mercado",
    market_average: "Preço Médio",
    above_market: "Acima do Mercado",
    premium: "Segmento Premium"
  };

  const priceDiff = analysis ? property.price - analysis.suggested_price : 0;
  const priceDiffPercent = analysis ? ((priceDiff / property.price) * 100).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Análise de Pricing com IA
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A analisar...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                {analysis ? 'Reanalisar' : 'Analisar Preço'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!analysis ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">
              Usa a IA para analisar o mercado e obter uma estratégia de pricing otimizada
            </p>
          </div>
        ) : (
          <>
            {/* Price Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">Preço Atual</p>
                <p className="text-2xl font-bold text-slate-900">
                  €{property.price?.toLocaleString()}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${priceDiff > 0 ? 'bg-red-50 border-red-200' : priceDiff < 0 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className="text-xs text-slate-600 mb-1">Preço Sugerido IA</p>
                <p className="text-2xl font-bold">
                  €{analysis.suggested_price?.toLocaleString()}
                </p>
                {priceDiff !== 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {priceDiff > 0 ? (
                      <ArrowDownRight className="w-3 h-3 text-red-600" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 text-green-600" />
                    )}
                    <span className={`text-xs font-semibold ${priceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.abs(priceDiffPercent)}% {priceDiff > 0 ? 'acima' : 'abaixo'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Range */}
            {analysis.price_range_min && analysis.price_range_max && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Faixa de Preço Recomendada</p>
                <div className="flex items-center justify-between text-sm text-blue-700">
                  <span>€{analysis.price_range_min.toLocaleString()}</span>
                  <span className="text-blue-500">—</span>
                  <span>€{analysis.price_range_max.toLocaleString()}</span>
                </div>
                {analysis.price_per_sqm && (
                  <p className="text-xs text-blue-600 mt-2">
                    Preço/m²: €{analysis.price_per_sqm.toLocaleString()}/m²
                  </p>
                )}
              </div>
            )}

            {/* Strategy & Position */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs text-slate-500 mb-2">Estratégia</p>
                <Badge className={strategyColors[analysis.strategy]}>
                  {strategyLabels[analysis.strategy] || analysis.strategy}
                </Badge>
              </div>
              {analysis.market_position && (
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-xs text-slate-500 mb-2">Posição no Mercado</p>
                  <Badge className={marketPositionColors[analysis.market_position]}>
                    {marketPositionLabels[analysis.market_position] || analysis.market_position}
                  </Badge>
                </div>
              )}
            </div>

            {/* Confidence & Time */}
            <div className="grid grid-cols-2 gap-3">
              {analysis.confidence && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">Confiança</p>
                  <div className="flex items-center gap-2">
                    <Progress value={analysis.confidence} className="flex-1 h-2" />
                    <span className="text-sm font-semibold">{analysis.confidence}%</span>
                  </div>
                </div>
              )}
              {analysis.estimated_sale_time_days && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Tempo Estimado
                  </p>
                  <p className="text-sm font-semibold">
                    {analysis.estimated_sale_time_days} dias
                  </p>
                </div>
              )}
            </div>

            {/* Justification */}
            {analysis.justification && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900 mb-2">📊 Justificação</p>
                <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">
                  {analysis.justification}
                </p>
              </div>
            )}

            {/* Value Factors */}
            {analysis.value_factors && analysis.value_factors.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Fatores Positivos
                </p>
                <ul className="text-sm text-green-800 space-y-1 ml-4 list-disc">
                  {analysis.value_factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {analysis.risks && analysis.risks.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Riscos e Atenções
                </p>
                <ul className="text-sm text-red-800 space-y-1 ml-4 list-disc">
                  {analysis.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-1">
                  <Wand2 className="w-4 h-4" />
                  Recomendações
                </p>
                <ul className="text-sm text-purple-800 space-y-1 ml-4 list-disc">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Negotiation Margin */}
            {analysis.negotiation_margin && (
              <div className="p-3 bg-slate-50 rounded-lg border text-center">
                <p className="text-xs text-slate-500 mb-1">Margem de Negociação Sugerida</p>
                <p className="text-xl font-bold text-slate-900">
                  {analysis.negotiation_margin}%
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  ≈ €{(property.price * analysis.negotiation_margin / 100).toLocaleString()}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}