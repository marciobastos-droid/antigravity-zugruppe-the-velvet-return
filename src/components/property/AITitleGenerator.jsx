import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function AITitleGenerator({ property, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [copied, setCopied] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setSuggestions([]);

    try {
      const propertyDetails = `
Tipo: ${property.property_type}
Negócio: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
${property.bedrooms ? `Quartos: T${property.bedrooms}` : ''}
${property.useful_area || property.square_feet ? `Área: ${property.useful_area || property.square_feet}m²` : ''}
Localização: ${property.city}, ${property.state}
${property.development_name ? `Empreendimento: ${property.development_name}` : ''}
${property.energy_certificate ? `Cert. Energético: ${property.energy_certificate}` : ''}
${property.amenities?.length > 0 ? `Destaques: ${property.amenities.slice(0, 3).join(', ')}` : ''}
Título Atual: ${property.title}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `És um especialista em marketing imobiliário português.

MISSÃO: Criar 3 TÍTULOS diferentes, todos CURTOS, ATRATIVOS e PROFISSIONAIS para um imóvel.

DETALHES DO IMÓVEL:
${propertyDetails}

INSTRUÇÕES:
1. Máximo 60-80 caracteres por título
2. Incluir tipologia (ex: T2, T3, Moradia)
3. Incluir localização principal
4. Destacar 1-2 características únicas se houver
5. Tom profissional e direto
6. SEM emojis, SEM excesso de adjetivos
7. Formato: "[Tipo] [Tipologia] em [Localização] [+ característica opcional]"
8. Criar 3 variações DIFERENTES (uma mais formal, uma com destaque, uma focada em localização)

EXEMPLOS:
- "Apartamento T2 Renovado no Centro de Lisboa"
- "Moradia T4 com Piscina em Cascais"
- "Terreno Urbano 500m² na Comporta"

Retorna APENAS um JSON array com 3 títulos:
["título 1", "título 2", "título 3"]`,
        response_json_schema: {
          type: "object",
          properties: {
            titles: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3
            }
          },
          required: ["titles"]
        }
      });

      setSuggestions(response.titles || []);
    } catch (error) {
      toast.error("Erro ao gerar títulos");
      console.error(error);
    }

    setGenerating(false);
  };

  const handleApply = async (title) => {
    try {
      await onUpdate(property.id, { title });
      toast.success("Título atualizado!");
      setSuggestions([]);
    } catch (error) {
      toast.error("Erro ao atualizar título");
    }
  };

  const handleCopy = (title, index) => {
    navigator.clipboard.writeText(title);
    setCopied(index);
    toast.success("Título copiado!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Gere títulos otimizados com IA para melhorar a atratividade do anúncio
        </p>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A gerar...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Sugestões
            </>
          )}
        </Button>
      </div>

      {/* Current Title */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-3">
          <p className="text-xs text-slate-500 mb-1">Título Atual:</p>
          <p className="font-medium text-slate-900">{property.title}</p>
          <p className="text-xs text-slate-500 mt-1">{property.title.length} caracteres</p>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((title, idx) => (
            <Card key={idx} className="border-purple-200 hover:border-purple-400 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        Sugestão {idx + 1}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          title.length <= 60 ? 'text-green-600 border-green-300' :
                          title.length <= 80 ? 'text-amber-600 border-amber-300' :
                          'text-red-600 border-red-300'
                        }`}
                      >
                        {title.length} caracteres
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-900">{title}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(title, idx)}
                      className="h-8"
                    >
                      {copied === idx ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApply(title)}
                      className="bg-purple-600 hover:bg-purple-700 h-8"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !generating && (
        <div className="text-center py-6 text-slate-400 text-sm">
          Clique em "Gerar Sugestões" para criar títulos otimizados
        </div>
      )}
    </div>
  );
}