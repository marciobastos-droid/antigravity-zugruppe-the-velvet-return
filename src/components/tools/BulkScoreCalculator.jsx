import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Loader2, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function BulkScoreCalculator() {
  const queryClient = useQueryClient();
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const handleCalculateAll = async () => {
    setCalculating(true);
    setProgress(0);
    setResults(null);

    try {
      const propertyIds = properties.map(p => p.id);
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < propertyIds.length; i += batchSize) {
        batches.push(propertyIds.slice(i, i + batchSize));
      }

      const allResults = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const response = await base44.functions.invoke('calculatePropertyScore', {
          property_ids: batch
        });

        if (response.data?.results) {
          allResults.push(...response.data.results);
        }

        setProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      setResults({
        total: allResults.length,
        scores: allResults
      });

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(`${allResults.length} imóveis pontuados!`);

    } catch (error) {
      toast.error("Erro ao calcular pontuações");
      console.error(error);
    }

    setCalculating(false);
  };

  const propertiesWithScores = properties.filter(p => p.quality_score > 0);
  const avgScore = propertiesWithScores.length > 0 
    ? Math.round(propertiesWithScores.reduce((sum, p) => sum + p.quality_score, 0) / propertiesWithScores.length)
    : 0;

  const scoreDistribution = {
    excellent: propertiesWithScores.filter(p => p.quality_score >= 80).length,
    good: propertiesWithScores.filter(p => p.quality_score >= 60 && p.quality_score < 80).length,
    medium: propertiesWithScores.filter(p => p.quality_score >= 40 && p.quality_score < 60).length,
    low: propertiesWithScores.filter(p => p.quality_score < 40).length
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          Cálculo de Pontuações em Massa
        </CardTitle>
        <p className="text-sm text-slate-600">
          Calcule a pontuação de qualidade para todos os imóveis
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border text-center">
            <div className="text-2xl font-bold text-slate-900">{properties.length}</div>
            <div className="text-xs text-slate-600">Total Imóveis</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border text-center">
            <div className="text-2xl font-bold text-blue-900">{propertiesWithScores.length}</div>
            <div className="text-xs text-blue-600">Com Pontuação</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border text-center">
            <div className="text-2xl font-bold text-purple-900">{avgScore}</div>
            <div className="text-xs text-purple-600">Média</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border text-center">
            <div className="text-2xl font-bold text-amber-900">{properties.length - propertiesWithScores.length}</div>
            <div className="text-xs text-amber-600">Por Calcular</div>
          </div>
        </div>

        {/* Distribution */}
        {propertiesWithScores.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Distribuição:</p>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-green-50 rounded border border-green-200 text-center">
                <div className="text-lg font-bold text-green-900">{scoreDistribution.excellent}</div>
                <div className="text-xs text-green-600">≥80 Excelente</div>
              </div>
              <div className="p-2 bg-blue-50 rounded border border-blue-200 text-center">
                <div className="text-lg font-bold text-blue-900">{scoreDistribution.good}</div>
                <div className="text-xs text-blue-600">60-79 Bom</div>
              </div>
              <div className="p-2 bg-yellow-50 rounded border border-yellow-200 text-center">
                <div className="text-lg font-bold text-yellow-900">{scoreDistribution.medium}</div>
                <div className="text-xs text-yellow-600">40-59 Médio</div>
              </div>
              <div className="p-2 bg-red-50 rounded border border-red-200 text-center">
                <div className="text-lg font-bold text-red-900">{scoreDistribution.low}</div>
                <div className="text-xs text-red-600">&lt;40 Baixo</div>
              </div>
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <Button
          onClick={handleCalculateAll}
          disabled={calculating || isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {calculating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A calcular... {progress}%
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Calcular Pontuações de Todos os Imóveis
            </>
          )}
        </Button>

        {calculating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-slate-600">
              Processando {Math.round((progress / 100) * properties.length)} de {properties.length} imóveis...
            </p>
          </div>
        )}

        {results && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Concluído!</p>
                <p className="text-sm text-green-800">
                  {results.total} imóveis pontuados
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900 font-medium mb-2">💡 Sistema de Pontuação</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>30pts</strong> - Informação Básica (título, descrição, preço)</li>
            <li>• <strong>25pts</strong> - Detalhes (quartos, WCs, área, certificado)</li>
            <li>• <strong>20pts</strong> - Multimédia (fotos, vídeos, plantas)</li>
            <li>• <strong>10pts</strong> - Localização completa</li>
            <li>• <strong>15pts</strong> - Utilização de IA (pricing, tags, descrição)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}