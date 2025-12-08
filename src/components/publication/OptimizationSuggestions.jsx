import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Image, FileText, DollarSign, Loader2, CheckCircle2, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function OptimizationSuggestions({ property }) {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const { data: metrics = [] } = useQuery({
    queryKey: ['publicationMetrics', property?.id],
    queryFn: async () => {
      if (!property?.id) return [];
      const all = await base44.entities.PublicationMetrics.list();
      return all.filter(m => m.property_id === property.id);
    },
    enabled: !!property?.id
  });

  const applyOptimizationMutation = useMutation({
    mutationFn: async (optimization) => {
      const updates = {};
      
      if (optimization.type === 'price') {
        updates.price = optimization.suggested_value;
      } else if (optimization.type === 'description') {
        updates.description = optimization.suggested_value;
      } else if (optimization.type === 'tags') {
        updates.tags = optimization.suggested_value;
      } else if (optimization.type === 'title') {
        updates.title = optimization.suggested_value;
      }

      return await base44.entities.Property.update(property.id, updates);
    },
    onSuccess: () => {
      toast.success("Otimização aplicada!");
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    }
  });

  const generateSuggestions = async () => {
    if (!property) return;
    
    setLoading(true);
    try {
      // Calculate performance metrics
      const totalViews = metrics.reduce((sum, m) => sum + (m.views || 0), 0);
      const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const totalInquiries = metrics.reduce((sum, m) => sum + (m.inquiries || 0), 0);
      const avgPerformance = metrics.reduce((sum, m) => sum + (m.performance_score || 0), 0) / (metrics.length || 1);

      const performanceData = {
        views: totalViews,
        clicks: totalClicks,
        inquiries: totalInquiries,
        ctr: totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(2) : 0,
        conversionRate: totalViews > 0 ? (totalInquiries / totalViews * 100).toFixed(2) : 0,
        avgPerformance: avgPerformance.toFixed(1)
      };

      // Call AI to analyze and suggest optimizations
      const { data } = await base44.functions.invoke('analyzePropertyPerformance', {
        property: {
          id: property.id,
          title: property.title,
          description: property.description,
          price: property.price,
          property_type: property.property_type,
          listing_type: property.listing_type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          useful_area: property.useful_area,
          city: property.city,
          images: property.images?.length || 0,
          tags: property.tags || [],
          amenities: property.amenities || []
        },
        performance: performanceData
      });

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error("Erro ao gerar sugestões");
    }
    setLoading(false);
  };

  React.useEffect(() => {
    if (property && metrics.length > 0) {
      generateSuggestions();
    }
  }, [property?.id, metrics.length]);

  const priorityColors = {
    high: "bg-red-100 text-red-800 border-red-300",
    medium: "bg-amber-100 text-amber-800 border-amber-300",
    low: "bg-blue-100 text-blue-800 border-blue-300"
  };

  const priorityIcons = {
    high: AlertTriangle,
    medium: Info,
    low: TrendingUp
  };

  const typeIcons = {
    price: DollarSign,
    description: FileText,
    images: Image,
    tags: Sparkles,
    title: FileText
  };

  if (!property) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-slate-500">
          <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Selecione um imóvel para ver sugestões</p>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-slate-500">
          <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sem dados de performance suficientes</p>
          <p className="text-xs mt-1">Publique o imóvel para obter sugestões de otimização</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-600">A analisar performance...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-900 mb-1">Anúncio Otimizado!</h3>
          <p className="text-sm text-slate-600">Sem sugestões de melhoria no momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Sugestões de Otimização Baseadas em IA
          </CardTitle>
          <p className="text-sm text-slate-600">
            Análise baseada em {metrics.length} publicaç{metrics.length === 1 ? 'ão' : 'ões'}
          </p>
        </CardHeader>
      </Card>

      {suggestions.map((suggestion, idx) => {
        const PriorityIcon = priorityIcons[suggestion.priority];
        const TypeIcon = typeIcons[suggestion.type];
        
        return (
          <Card key={idx} className="border-l-4" style={{ borderLeftColor: suggestion.priority === 'high' ? '#ef4444' : suggestion.priority === 'medium' ? '#f59e0b' : '#3b82f6' }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TypeIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{suggestion.title}</h4>
                      <Badge className={priorityColors[suggestion.priority]}>
                        <PriorityIcon className="w-3 h-3 mr-1" />
                        {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{suggestion.reason}</p>
                    
                    {suggestion.current_value && (
                      <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Atual</p>
                          <p className="text-sm font-medium text-slate-900 line-clamp-2">
                            {typeof suggestion.current_value === 'number' 
                              ? `€${suggestion.current_value.toLocaleString()}`
                              : suggestion.current_value}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Sugerido</p>
                          <p className="text-sm font-medium text-green-700 line-clamp-2">
                            {typeof suggestion.suggested_value === 'number'
                              ? `€${suggestion.suggested_value.toLocaleString()}`
                              : Array.isArray(suggestion.suggested_value)
                              ? suggestion.suggested_value.join(', ')
                              : suggestion.suggested_value}
                          </p>
                        </div>
                      </div>
                    )}

                    {suggestion.expected_impact && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">Impacto Esperado: {suggestion.expected_impact}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => applyOptimizationMutation.mutate(suggestion)}
                  disabled={applyOptimizationMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {applyOptimizationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A aplicar...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aplicar Sugestão
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline">
                  Ver Detalhes
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Button
        variant="outline"
        onClick={generateSuggestions}
        disabled={loading}
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Gerar Novas Sugestões
      </Button>
    </div>
  );
}