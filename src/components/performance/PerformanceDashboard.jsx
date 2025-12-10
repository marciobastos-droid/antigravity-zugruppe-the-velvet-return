import React from "react";
import { usePerformanceMetrics } from "./WebVitalsMonitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Eye, Timer, TrendingUp, Gauge } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * Dashboard visual de Core Web Vitals
 */
export default function PerformanceDashboard() {
  const metrics = usePerformanceMetrics();

  const getMetricColor = (rating) => {
    switch (rating) {
      case 'good': return 'bg-green-500';
      case 'needs-improvement': return 'bg-amber-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 'good': return 'Bom';
      case 'needs-improvement': return 'Melhorar';
      case 'poor': return 'Crítico';
      default: return 'N/A';
    }
  };

  const formatValue = (metric, value) => {
    if (!value) return 'N/A';
    
    switch (metric) {
      case 'cls':
        return value.toFixed(3);
      case 'lcp':
      case 'fcp':
      case 'fid':
      case 'inp':
      case 'ttfb':
        return `${Math.round(value)}ms`;
      default:
        return value.toFixed(2);
    }
  };

  const metricsConfig = [
    { 
      key: 'lcp', 
      name: 'Largest Contentful Paint', 
      description: 'Tempo até o maior elemento visível',
      icon: Eye,
      threshold: { good: 2500, poor: 4000 }
    },
    { 
      key: 'fid', 
      name: 'First Input Delay', 
      description: 'Tempo de resposta à primeira interação',
      icon: Zap,
      threshold: { good: 100, poor: 300 }
    },
    { 
      key: 'cls', 
      name: 'Cumulative Layout Shift', 
      description: 'Estabilidade visual da página',
      icon: Activity,
      threshold: { good: 0.1, poor: 0.25 }
    },
    { 
      key: 'fcp', 
      name: 'First Contentful Paint', 
      description: 'Tempo até o primeiro conteúdo visível',
      icon: Timer,
      threshold: { good: 1800, poor: 3000 }
    },
    { 
      key: 'ttfb', 
      name: 'Time to First Byte', 
      description: 'Tempo de resposta do servidor',
      icon: TrendingUp,
      threshold: { good: 800, poor: 1800 }
    },
    { 
      key: 'inp', 
      name: 'Interaction to Next Paint', 
      description: 'Responsividade das interações',
      icon: Gauge,
      threshold: { good: 200, poor: 500 }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Core Web Vitals</h2>
          <p className="text-sm text-slate-600 mt-1">Métricas de performance em tempo real</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricsConfig.map((config) => {
          const metric = metrics[config.key];
          const Icon = config.icon;
          
          return (
            <Card key={config.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${metric?.rating ? getMetricColor(metric.rating) : 'bg-slate-200'} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{config.key.toUpperCase()}</CardTitle>
                      <p className="text-xs text-slate-500">{config.name}</p>
                    </div>
                  </div>
                  {metric?.rating && (
                    <Badge className={`${getMetricColor(metric.rating)} text-white border-0 text-xs`}>
                      {getRatingLabel(metric.rating)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="mb-3">
                  <div className="text-2xl font-bold text-slate-900">
                    {metric ? formatValue(config.key, metric.value) : 'Aguardando...'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{config.description}</p>
                </div>
                
                {metric && (
                  <div className="space-y-2">
                    <Progress 
                      value={
                        metric.rating === 'good' ? 100 :
                        metric.rating === 'needs-improvement' ? 60 :
                        metric.rating === 'poor' ? 30 : 0
                      }
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Bom: &lt;{formatValue(config.key, config.threshold.good)}</span>
                      <span>Crítico: &gt;{formatValue(config.key, config.threshold.poor)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-1">Sobre os Core Web Vitals</h4>
              <p className="text-sm text-blue-800">
                Estas métricas são essenciais para SEO e experiência do usuário. 
                Valores "Bom" em todas as métricas melhoram significativamente o ranking nos motores de busca.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}