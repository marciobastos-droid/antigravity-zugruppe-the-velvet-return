import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, Sparkles, RefreshCw, Loader2, 
  CheckCircle2, AlertCircle, Info, Star,
  FileText, Image, Home, Zap
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function PropertyQualityScore({ property, compact = false }) {
  const queryClient = useQueryClient();
  const [showDetails, setShowDetails] = React.useState(false);

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
        queryClient.invalidateQueries({ queryKey: ['property', property.id] });
        toast.success("Pontuação atualizada!");
      } else {
        toast.error(data.error || "Erro ao calcular pontuação");
      }
    },
    onError: () => {
      toast.error("Erro ao calcular pontuação");
    }
  });

  const score = property.quality_score || 0;
  const details = property.quality_score_details;

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return "bg-green-100 border-green-300";
    if (score >= 60) return "bg-blue-100 border-blue-300";
    if (score >= 40) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  const getGrade = (score) => {
    if (score >= 80) return { label: "Excelente", icon: Star, color: "text-green-600" };
    if (score >= 60) return { label: "Bom", icon: CheckCircle2, color: "text-blue-600" };
    if (score >= 40) return { label: "Médio", icon: Info, color: "text-yellow-600" };
    return { label: "Precisa Melhorias", icon: AlertCircle, color: "text-red-600" };
  };

  const grade = getGrade(score);
  const GradeIcon = grade.icon;

  // Compact view for cards
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${getScoreBgColor(score)}`}>
          <Sparkles className={`w-3 h-3 ${getScoreColor(score)}`} />
          <span className={`font-semibold text-sm ${getScoreColor(score)}`}>
            {score}/100
          </span>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Pontuação de Qualidade
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calculateScoreMutation.mutate()}
            disabled={calculateScoreMutation.isPending}
          >
            {calculateScoreMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <GradeIcon className={`w-5 h-5 ${grade.color}`} />
            <span className={`text-lg font-semibold ${grade.color}`}>
              {grade.label}
            </span>
          </div>
          <Progress value={score} className="h-3" />
        </div>

        {/* Category Breakdown */}
        {details && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full justify-between"
            >
              <span className="text-sm font-medium">Ver Detalhes da Pontuação</span>
              <Info className="w-4 h-4" />
            </Button>

            {showDetails && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                {/* Basic Info */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Informação Básica</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {details.basic_info.score}/{details.basic_info.max}
                    </span>
                  </div>
                  <Progress value={(details.basic_info.score / details.basic_info.max) * 100} className="h-2" />
                </div>

                {/* Media */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Media (Fotos/Vídeos)</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {details.media.score}/{details.media.max}
                    </span>
                  </div>
                  <Progress value={(details.media.score / details.media.max) * 100} className="h-2" />
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Detalhes do Imóvel</span>
                    </div>
                    <span className="text-sm font-semibold">
                      {details.details.score}/{details.details.max}
                    </span>
                  </div>
                  <Progress value={(details.details.score / details.details.max) * 100} className="h-2" />
                </div>

                {/* AI Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Utilização de IA</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-600">
                      {details.ai_usage.score}/{details.ai_usage.max}
                    </span>
                  </div>
                  <Progress value={(details.ai_usage.score / details.ai_usage.max) * 100} className="h-2 bg-purple-100" />
                </div>

                {/* Breakdown Summary */}
                <div className="pt-3 border-t space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">Resumo:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      {details.breakdown.description ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> : 
                        <AlertCircle className="w-3 h-3 text-slate-400" />
                      }
                      <span>Descrição completa</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {details.breakdown.images >= 5 ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> : 
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      }
                      <span>{details.breakdown.images} fotos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {details.breakdown.has_area ? 
                        <CheckCircle2 className="w-3 h-3 text-green-600" /> : 
                        <AlertCircle className="w-3 h-3 text-slate-400" />
                      }
                      <span>Áreas definidas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {details.breakdown.ai_features_count > 0 ? 
                        <CheckCircle2 className="w-3 h-3 text-purple-600" /> : 
                        <AlertCircle className="w-3 h-3 text-slate-400" />
                      }
                      <span>{details.breakdown.ai_features_count} IA features</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {score < 80 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">💡 Sugestões para Melhorar:</p>
            <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
              {!details?.breakdown.description && <li>Adicionar descrição detalhada (100+ caracteres)</li>}
              {details?.breakdown.images < 5 && <li>Adicionar mais fotos (mínimo 5 recomendado)</li>}
              {!details?.breakdown.has_area && <li>Preencher área útil do imóvel</li>}
              {!details?.breakdown.has_energy_cert && <li>Adicionar certificado energético</li>}
              {details?.breakdown.amenities_count < 3 && <li>Listar comodidades do imóvel</li>}
              {details?.breakdown.ai_features_count === 0 && <li>Usar ferramentas de IA para otimizar o anúncio</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}