import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Tag, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function PropertyTagger({ property, onTagsUpdate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [currentTags, setCurrentTags] = useState(property.tags || []);

  const analyzeProperty = async () => {
    setAnalyzing(true);
    setSuggestedTags([]);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa este imóvel e sugere TAGS e CATEGORIAS relevantes para melhor organização e pesquisa.

IMÓVEL:
Título: ${property.title}
Tipo: ${property.property_type}
Localização: ${property.city}, ${property.state}
Preço: €${property.price}
${property.bedrooms ? `Quartos: ${property.bedrooms}` : ''}
${property.square_feet ? `Área: ${property.square_feet}m²` : ''}
${property.year_built ? `Ano: ${property.year_built}` : ''}

Descrição:
${property.description || 'Sem descrição'}

Comodidades: ${property.amenities?.join(', ') || 'Nenhuma'}

INSTRUÇÕES:
1. Sugere 5-10 tags específicas e úteis
2. Inclui tags de:
   - Localização específica (bairro, zona)
   - Estilo/características (moderno, renovado, luxo)
   - Target (família, investimento, primeira habitação)
   - Diferenciadores únicos
3. PORTUGUÊS, minúsculas, sem acentos
4. Prioriza tags que ajudem nas pesquisas

Retorna array de strings.`,
        response_json_schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" }
            },
            reasoning: {
              type: "string",
              description: "Breve explicação das tags sugeridas"
            }
          }
        }
      });

      setSuggestedTags(result.tags || []);
      toast.success(`${result.tags?.length || 0} tags sugeridas`);
    } catch (error) {
      toast.error("Erro ao analisar imóvel");
      console.error(error);
    }

    setAnalyzing(false);
  };

  const addTag = (tag) => {
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      setCurrentTags(newTags);
      onTagsUpdate(newTags);
    }
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  const removeTag = (tag) => {
    const newTags = currentTags.filter(t => t !== tag);
    setCurrentTags(newTags);
    onTagsUpdate(newTags);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags & Categorias
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={analyzeProperty}
          disabled={analyzing}
          className="border-purple-500 text-purple-600 hover:bg-purple-50"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1" />
              Sugerir com IA
            </>
          )}
        </Button>
      </div>

      {/* Current Tags */}
      {currentTags.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Tags Atuais:</p>
          <div className="flex flex-wrap gap-2">
            {currentTags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="pr-1">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Tags */}
      {suggestedTags.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            Sugeridas pela IA:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="border-purple-300 text-purple-700 cursor-pointer hover:bg-purple-50"
                onClick={() => addTag(tag)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}