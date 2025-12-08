import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function BulkScoreCalculator() {
  const queryClient = useQueryClient();
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);

  const handleCalculateAll = async () => {
    setCalculating(true);
    setResults(null);
    
    try {
      const properties = await base44.entities.Property.list();
      setProgress({ current: 0, total: properties.length });

      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < properties.length; i += batchSize) {
        batches.push(properties.slice(i, i + batchSize));
      }

      let processed = 0;
      const allResults = [];

      for (const batch of batches) {
        const batchIds = batch.map(p => p.id);
        
        const response = await base44.functions.invoke('calculatePropertyScore', {
          property_ids: batchIds
        });

        if (response.data?.results) {
          allResults.push(...response.data.results);
        }

        processed += batch.length;
        setProgress({ current: processed, total: properties.length });
      }

      setResults({
        total: allResults.length,
        average_score: allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length,
        high_quality: allResults.filter(r => r.score >= 80).length,
        medium_quality: allResults.filter(r => r.score >= 60 && r.score < 80).length,
        low_quality: allResults.filter(r => r.score < 60).length
      });

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success(`Pontuação calculada para ${allResults.length} imóveis!`);

    } catch (error) {
      toast.error("Erro ao calcular pontuações");
      console.error(error);
    }

    setCalculating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Calcular Pontuação de Todos os Imóveis
        </CardTitle>
        <p className="text-sm text-slate-600">
          Analisa e atribui pontuação de qualidade baseada em completude de dados e uso de IA
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {calculating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">A processar...</span>
              <span className="font-medium">
                {progress.current} / {progress.total}
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{results.total}</div>
                <div className="text-xs text-slate-600">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{results.high_quality}</div>
                <div className="text-xs text-green-600">Excelente (80+)</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{results.medium_quality}</div>
                <div className="text-xs text-yellow-600">Bom (60-79)</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">{results.low_quality}</div>
                <div className="text-xs text-red-600">Baixo (<60)</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Média: {results.average_score.toFixed(1)}/100</p>
                  <p className="text-xs text-blue-700">
                    {results.low_quality > 0 && `${results.low_quality} imóveis precisam de melhorias`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleCalculateAll}
          disabled={calculating}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {calculating ? (
            <>
              <TrendingUp className="w-4 h-4 mr-2 animate-pulse" />
              A calcular... {progress.current}/{progress.total}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Calcular Pontuações
            </>
          )}
        </Button>

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Critérios de Pontuação:</strong></p>
          <p>• Informação Básica (30pts): Título, descrição, preço</p>
          <p>• Detalhes (25pts): Quartos, WCs, área, certificado, comodidades</p>
          <p>• Multimédia (20pts): Fotos, vídeos, plantas</p>
          <p>• Localização (10pts): Morada completa, código postal</p>
          <p>• IA (15pts): Sugestão de preço, tags, análises</p>
        </div>
      </CardContent>
    </Card>
  );
}