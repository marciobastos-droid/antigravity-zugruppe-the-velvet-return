import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, FileText, Image, Zap, AlertTriangle } from "lucide-react";

/**
 * Componente para analisar tamanho e performance dos bundles
 */
export default function BundleAnalyzer() {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    // Analisar recursos carregados
    const resources = performance.getEntriesByType('resource');
    
    const analysis = {
      scripts: { count: 0, size: 0, items: [] },
      styles: { count: 0, size: 0, items: [] },
      images: { count: 0, size: 0, items: [] },
      fonts: { count: 0, size: 0, items: [] },
      other: { count: 0, size: 0, items: [] }
    };

    resources.forEach(resource => {
      const size = resource.transferSize || resource.decodedBodySize || 0;
      const item = {
        name: resource.name.split('/').pop() || resource.name,
        size,
        duration: resource.duration
      };

      if (resource.initiatorType === 'script' || resource.name.endsWith('.js')) {
        analysis.scripts.count++;
        analysis.scripts.size += size;
        analysis.scripts.items.push(item);
      } else if (resource.initiatorType === 'css' || resource.name.endsWith('.css')) {
        analysis.styles.count++;
        analysis.styles.size += size;
        analysis.styles.items.push(item);
      } else if (resource.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(resource.name)) {
        analysis.images.count++;
        analysis.images.size += size;
        analysis.images.items.push(item);
      } else if (/\.(woff|woff2|ttf|eot)$/i.test(resource.name)) {
        analysis.fonts.count++;
        analysis.fonts.size += size;
        analysis.fonts.items.push(item);
      } else {
        analysis.other.count++;
        analysis.other.size += size;
        analysis.other.items.push(item);
      }
    });

    // Ordenar por tamanho
    Object.values(analysis).forEach(category => {
      category.items.sort((a, b) => b.size - a.size);
    });

    setStats(analysis);
  }, []);

  if (!stats) return null;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = Object.values(stats).reduce((sum, cat) => sum + cat.size, 0);

  const categories = [
    { key: 'scripts', label: 'JavaScript', icon: FileText, color: 'text-yellow-600', limit: 500000 },
    { key: 'styles', label: 'CSS', icon: Zap, color: 'text-blue-600', limit: 100000 },
    { key: 'images', label: 'Imagens', icon: Image, color: 'text-green-600', limit: 2000000 },
    { key: 'fonts', label: 'Fontes', icon: Package, color: 'text-purple-600', limit: 300000 }
  ];

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          Análise de Bundles ({formatBytes(totalSize)})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map(({ key, label, icon: Icon, color, limit }) => {
            const data = stats[key];
            const percentage = (data.size / totalSize) * 100;
            const isOverLimit = data.size > limit;
            
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-sm font-medium">{label}</span>
                    <Badge variant="outline" className="text-xs">
                      {data.count} {data.count === 1 ? 'arquivo' : 'arquivos'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatBytes(data.size)}</span>
                    {isOverLimit && (
                      <AlertTriangle className="w-4 h-4 text-orange-500" title="Acima do limite recomendado" />
                    )}
                  </div>
                </div>
                
                <Progress value={percentage} className="h-2 mb-2" />
                
                {data.items.length > 0 && (
                  <div className="ml-6 space-y-1 text-xs text-slate-600">
                    {data.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="truncate max-w-[200px]">{item.name}</span>
                        <span className="font-mono">{formatBytes(item.size)}</span>
                      </div>
                    ))}
                    {data.items.length > 3 && (
                      <div className="text-slate-400">+{data.items.length - 3} mais...</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-orange-600 mt-0.5" />
            <div className="text-xs text-orange-900">
              <strong>Recomendações:</strong>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                {stats.scripts.size > 500000 && (
                  <li>JavaScript muito grande - considere code splitting</li>
                )}
                {stats.images.size > 2000000 && (
                  <li>Imagens muito pesadas - otimize com WebP e lazy loading</li>
                )}
                {stats.fonts.size > 300000 && (
                  <li>Muitas fontes - use font-display: swap e subsets</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}