import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gauge, Zap, Eye, MousePointer, Clock, TrendingUp } from "lucide-react";
import { useWebVitals } from "./WebVitalsMonitor";

const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 }
};

const METRIC_INFO = {
  LCP: { name: "Largest Contentful Paint", icon: Eye, unit: "ms", description: "Tempo até o maior elemento visível" },
  FID: { name: "First Input Delay", icon: MousePointer, unit: "ms", description: "Tempo de resposta à primeira interação" },
  CLS: { name: "Cumulative Layout Shift", icon: TrendingUp, unit: "", description: "Estabilidade visual da página" },
  FCP: { name: "First Contentful Paint", icon: Zap, unit: "ms", description: "Tempo até o primeiro conteúdo" },
  TTFB: { name: "Time to First Byte", icon: Clock, unit: "ms", description: "Tempo de resposta do servidor" },
  INP: { name: "Interaction to Next Paint", icon: Gauge, unit: "ms", description: "Responsividade das interações" }
};

export default function PerformanceAnalytics() {
  const [metrics, setMetrics] = React.useState({});
  
  useWebVitals((metric) => {
    setMetrics(prev => ({
      ...prev,
      [metric.name]: metric
    }));
  });

  const getRating = (name, value) => {
    const threshold = THRESHOLDS[name];
    if (!threshold) return 'good';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'good': return 'bg-green-500';
      case 'needs-improvement': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 'good': return 'Excelente';
      case 'needs-improvement': return 'Precisa Melhorar';
      case 'poor': return 'Fraco';
      default: return 'N/A';
    }
  };

  const getProgressValue = (name, value) => {
    const threshold = THRESHOLDS[name];
    if (!threshold) return 100;
    return Math.min((value / threshold.poor) * 100, 100);
  };

  if (Object.keys(metrics).length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-purple-600" />
          Core Web Vitals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(metrics).map(([name, metric]) => {
            const info = METRIC_INFO[name];
            if (!info) return null;

            const Icon = info.icon;
            const rating = getRating(name, metric.value);
            const progressValue = getProgressValue(name, metric.value);
            
            return (
              <Card key={name} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-900">{name}</span>
                    </div>
                    <Badge className={`${getRatingColor(rating)} text-white text-xs`}>
                      {getRatingLabel(rating)}
                    </Badge>
                  </div>
                  
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    {metric.value.toFixed(name === 'CLS' ? 3 : 0)}
                    <span className="text-sm text-slate-500 ml-1">{info.unit}</span>
                  </div>
                  
                  <Progress 
                    value={100 - progressValue} 
                    className={`h-2 mb-2 ${getRatingColor(rating)}`}
                  />
                  
                  <p className="text-xs text-slate-500">{info.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>Dica:</strong> Valores "Excelente" indicam experiência de usuário otimizada. 
            Métricas são atualizadas em tempo real conforme você navega.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}