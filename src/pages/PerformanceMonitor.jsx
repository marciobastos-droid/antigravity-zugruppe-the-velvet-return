import React from "react";
import PerformanceDashboard from "../components/performance/PerformanceDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, Download, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PerformanceMonitor() {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExportMetrics = () => {
    // Exportar métricas para CSV ou JSON
    const metrics = JSON.parse(localStorage.getItem('webVitalsHistory') || '[]');
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `web-vitals-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Tools")}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Monitor de Performance</h1>
              <p className="text-slate-600 mt-1">Análise detalhada de Core Web Vitals e métricas SEO</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportMetrics}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Performance Dashboard */}
        <PerformanceDashboard />

        {/* Recommendations */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Recomendações de Otimização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Otimizar Imagens</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Use formatos modernos (WebP, AVIF) e lazy loading para melhorar LCP
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Minimizar JavaScript</h4>
                  <p className="text-sm text-green-800 mt-1">
                    Code splitting e lazy loading de componentes reduz FID e INP
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900">Reservar Espaço para Conteúdo</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    Defina width/height nas imagens para reduzir CLS
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-purple-900">Otimizar Cache e CDN</h4>
                  <p className="text-sm text-purple-800 mt-1">
                    Configure cache headers adequados para melhorar TTFB
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}