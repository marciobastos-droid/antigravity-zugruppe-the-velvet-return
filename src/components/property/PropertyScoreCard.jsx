import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function PropertyScoreCard({ property, variant = "full" }) {
  const queryClient = useQueryClient();

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('calculatePropertyScore', {
        property_id: property.id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', property.id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success("Pontuação recalculada!");
    },
    onError: () => {
      toast.error("Erro ao calcular pontuação");
    }
  });

  const score = property.quality_score || 0;
  const breakdown = property.quality_score_breakdown || {};

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { label: "Excelente", color: "bg-green-100 text-green-800" };
    if (score >= 60) return { label: "Bom", color: "bg-yellow-100 text-yellow-800" };
    if (score >= 40) return { label: "Médio", color: "bg-orange-100 text-orange-800" };
    return { label: "Baixo", color: "bg-red-100 text-red-800" };
  };

  const scoreBadge = getScoreBadge(score);

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${getScoreColor(score)}`} />
              <span className={`font-semibold ${getScoreColor(score)}`}>{score}/100</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">Qualidade: {scoreBadge.label}</p>
            {property.last_score_calculation && (
              <p className="text-xs text-slate-500">
                Calculado: {new Date(property.last_score_calculation).toLocaleDateString('pt-PT')}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "badge") {
    return (
      <Badge className={scoreBadge.color}>
        <TrendingUp className="w-3 h-3 mr-1" />
        {score}/100
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Pontuação de Qualidade
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}<span className="text-xl text-slate-400">/100</span></div>
            <Badge className={`${scoreBadge.color} mt-1`}>{scoreBadge.label}</Badge>
          </div>
          <div className="text-right text-xs text-slate-500">
            {property.last_score_calculation ? (
              <>
                Calculado<br />
                {new Date(property.last_score_calculation).toLocaleDateString('pt-PT')}
              </>
            ) : (
              'Nunca calculado'
            )}
          </div>
        </div>

        <div className="space-y-3">
          <ScoreBreakdownItem
            label="Informação Básica"
            score={breakdown.basic_info || 0}
            max={30}
            tip="Título, descrição, preço e tipo de imóvel"
          />
          <ScoreBreakdownItem
            label="Detalhes"
            score={breakdown.details || 0}
            max={25}
            tip="Quartos, WCs, área, certificado energético, comodidades"
          />
          <ScoreBreakdownItem
            label="Multimédia"
            score={breakdown.media || 0}
            max={20}
            tip="Fotos (mínimo 5, ideal 10+), vídeos, plantas"
          />
          <ScoreBreakdownItem
            label="Localização"
            score={breakdown.location || 0}
            max={10}
            tip="Morada, cidade, distrito, código postal"
          />
          <ScoreBreakdownItem
            label="Uso de IA"
            score={breakdown.ai_usage || 0}
            max={15}
            tip="Sugestão de preço, descrição gerada, tags automáticas"
            icon={<CheckCircle2 className="w-3 h-3" />}
          />
        </div>

        {score < 60 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800">
              <strong>Dica:</strong> Adicione mais fotos, preencha detalhes em falta e use as ferramentas de IA para melhorar a pontuação.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBreakdownItem({ label, score, max, tip, icon }) {
  const percentage = (score / max) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 text-sm text-slate-700">
          {icon}
          <span>{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{tip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-xs text-slate-500">{score}/{max}</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}