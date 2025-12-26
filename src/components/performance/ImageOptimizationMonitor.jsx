import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Zap, CheckCircle, AlertCircle } from "lucide-react";

/**
 * Componente de monitoramento de otimização de imagens
 * Útil para debug e verificação de performance
 */
export default function ImageOptimizationMonitor() {
  const [stats, setStats] = React.useState({
    totalImages: 0,
    lazyLoaded: 0,
    webpSupported: false,
    avgLoadTime: 0
  });

  React.useEffect(() => {
    // Check WebP support
    const webpSupported = document.createElement('canvas')
      .toDataURL('image/webp')
      .indexOf('data:image/webp') === 0;

    // Monitor images
    const images = document.querySelectorAll('img');
    const lazyLoadedImages = Array.from(images).filter(
      img => img.loading === 'lazy' || img.dataset.src
    );

    setStats({
      totalImages: images.length,
      lazyLoaded: lazyLoadedImages.length,
      webpSupported,
      avgLoadTime: 0 // Can be calculated with performance API
    });

    // Performance monitoring
    if (window.PerformanceObserver) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const imageEntries = entries.filter(entry => 
          entry.initiatorType === 'img' || entry.initiatorType === 'image'
        );
        
        if (imageEntries.length > 0) {
          const avgTime = imageEntries.reduce((acc, entry) => 
            acc + entry.duration, 0
          ) / imageEntries.length;
          
          setStats(prev => ({ ...prev, avgLoadTime: avgTime }));
        }
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);

  const lazyLoadPercentage = stats.totalImages > 0 
    ? Math.round((stats.lazyLoaded / stats.totalImages) * 100)
    : 0;

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Otimização de Imagens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Total de Imagens:</span>
          <Badge variant="outline">{stats.totalImages}</Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Lazy Loading:</span>
          <div className="flex items-center gap-1">
            {lazyLoadPercentage >= 80 ? (
              <CheckCircle className="w-3 h-3 text-green-600" />
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-600" />
            )}
            <Badge variant="outline">{lazyLoadPercentage}%</Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">WebP Support:</span>
          <Badge variant={stats.webpSupported ? "default" : "secondary"}>
            {stats.webpSupported ? (
              <><Zap className="w-3 h-3 mr-1" /> Ativo</>
            ) : (
              'Não Suportado'
            )}
          </Badge>
        </div>
        
        {stats.avgLoadTime > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Tempo Médio:</span>
            <Badge variant="outline">{stats.avgLoadTime.toFixed(0)}ms</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}