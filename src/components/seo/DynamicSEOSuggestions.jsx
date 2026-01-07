import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, TrendingUp, Search, Tag } from "lucide-react";
import { toast } from "sonner";

/**
 * Componente que gera sugestões SEO dinâmicas baseadas nos imóveis e filtros ativos
 */
export default function DynamicSEOSuggestions({ properties, activeFilters, onApply }) {
  const [suggestions, setSuggestions] = React.useState(null);

  // Gerar sugestões baseadas nos dados
  React.useEffect(() => {
    if (properties.length === 0) return;

    // Análise de dados
    const cities = [...new Set(properties.map(p => p.city).filter(Boolean))];
    const types = [...new Set(properties.map(p => p.property_type).filter(Boolean))];
    const avgPrice = properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length;
    const priceRange = {
      min: Math.min(...properties.map(p => p.price || Infinity)),
      max: Math.max(...properties.map(p => p.price || 0))
    };

    // Gerar keywords estratégicas
    const keywords = [];
    
    // Localização
    cities.slice(0, 5).forEach(city => {
      keywords.push(`imóveis ${city}`);
      keywords.push(`casas ${city}`);
      keywords.push(`apartamentos ${city}`);
    });

    // Tipos
    types.forEach(type => {
      const typeLabel = {
        apartment: 'apartamentos',
        house: 'moradias',
        land: 'terrenos',
        building: 'prédios'
      }[type] || type;
      keywords.push(typeLabel);
      keywords.push(`${typeLabel} venda`);
      keywords.push(`${typeLabel} arrendamento`);
    });

    // Preços
    if (avgPrice < 200000) {
      keywords.push('imóveis baratos', 'imóveis acessíveis');
    } else if (avgPrice > 500000) {
      keywords.push('imóveis luxo', 'imóveis premium');
    }

    // Gerar meta description
    const metaDescription = `Descubra ${properties.length} imóveis ${
      cities.length > 0 ? `em ${cities.slice(0, 3).join(', ')}` : 'em Portugal'
    }. Preços desde €${priceRange.min.toLocaleString()} até €${priceRange.max.toLocaleString()}. ${
      types.length > 0 ? `Incluindo ${types.slice(0, 2).join(', ')}.` : ''
    } Encontre o seu imóvel ideal hoje!`;

    // Sugestões de títulos otimizados
    const titleSuggestions = [
      `${properties.length} Imóveis em ${cities[0] || 'Portugal'} | Zugruppe`,
      `Comprar Casa em ${cities[0] || 'Portugal'} - ${properties.length} Opções Disponíveis`,
      `Imóveis ${cities[0] || 'Portugal'} desde €${priceRange.min.toLocaleString()} | Zugruppe`
    ];

    setSuggestions({
      keywords: keywords.slice(0, 20),
      metaDescription,
      titleSuggestions,
      stats: {
        totalProperties: properties.length,
        avgPrice: Math.round(avgPrice),
        cities: cities.length,
        types: types.length
      }
    });
  }, [properties, activeFilters]);

  if (!suggestions) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="w-5 h-5 text-blue-600" />
          Sugestões SEO Dinâmicas
        </CardTitle>
        <p className="text-sm text-slate-600">
          Baseado em {suggestions.stats.totalProperties} imóveis ativos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Meta Description */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <label className="text-sm font-semibold text-slate-700">Meta Description Sugerida</label>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 group relative">
            <p className="text-sm text-slate-700 leading-relaxed">{suggestions.metaDescription}</p>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                navigator.clipboard.writeText(suggestions.metaDescription);
                toast.success('Copiado!');
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Title Suggestions */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <label className="text-sm font-semibold text-slate-700">Sugestões de Título</label>
          </div>
          <div className="space-y-2">
            {suggestions.titleSuggestions.map((title, idx) => (
              <div key={idx} className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between group">
                <span className="text-sm text-slate-700">{title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    navigator.clipboard.writeText(title);
                    toast.success('Título copiado!');
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <label className="text-sm font-semibold text-slate-700">
              Palavras-chave Recomendadas ({suggestions.keywords.length})
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.keywords.map((keyword, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => {
                  navigator.clipboard.writeText(keyword);
                  toast.success(`"${keyword}" copiado!`);
                }}
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{suggestions.stats.totalProperties}</div>
            <div className="text-xs text-slate-600">Imóveis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">€{suggestions.stats.avgPrice.toLocaleString()}</div>
            <div className="text-xs text-slate-600">Preço Médio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{suggestions.stats.cities}</div>
            <div className="text-xs text-slate-600">Cidades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{suggestions.stats.types}</div>
            <div className="text-xs text-slate-600">Tipos</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}