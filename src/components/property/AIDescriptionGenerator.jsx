import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, Loader2, Copy, Check, RefreshCw, 
  Wand2, FileText, Languages, Target
} from "lucide-react";
import { toast } from "sonner";

const TONES = [
  { value: "professional", label: "Profissional", description: "Formal e informativo" },
  { value: "luxury", label: "Luxo", description: "Sofisticado e exclusivo" },
  { value: "friendly", label: "Acolhedor", description: "Caloroso e convidativo" },
  { value: "modern", label: "Moderno", description: "Contemporâneo e dinâmico" },
  { value: "investment", label: "Investimento", description: "Focado em rentabilidade" }
];

const LENGTHS = [
  { value: "short", label: "Curta", chars: "150-250" },
  { value: "medium", label: "Média", chars: "300-450" },
  { value: "long", label: "Longa", chars: "500-700" }
];

export default function AIDescriptionGenerator({ property, onUpdate }) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [tone, setTone] = React.useState("professional");
  const [length, setLength] = React.useState("medium");
  const [generatedDescription, setGeneratedDescription] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [includeEmojis, setIncludeEmojis] = React.useState(false);

  const generateDescription = async () => {
    setIsGenerating(true);
    try {
      const lengthGuide = LENGTHS.find(l => l.value === length);
      const toneGuide = TONES.find(t => t.value === tone);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Gera uma descrição apelativa para este imóvel em Português de Portugal.

DADOS DO IMÓVEL:
- Título: ${property.title}
- Tipo: ${property.property_type}
- Negócio: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
- Preço: €${property.price?.toLocaleString()}
- Localização: ${property.address}, ${property.city}, ${property.state}
- Área útil: ${property.useful_area || property.square_feet || 0} m²
- Área bruta: ${property.gross_area || 0} m²
- Quartos: ${property.bedrooms || 0}
- Casas de banho: ${property.bathrooms || 0}
- Garagem: ${property.garage || 'N/A'}
- Exposição solar: ${property.sun_exposure || 'N/A'}
- Certificado energético: ${property.energy_certificate || 'N/A'}
- Acabamentos: ${property.finishes || 'N/A'}
- Ano de construção: ${property.year_built || 'N/A'}
- Amenidades: ${property.amenities?.join(', ') || 'N/A'}
- Descrição atual: ${property.description || 'Nenhuma'}

INSTRUÇÕES:
- Tom: ${toneGuide.label} - ${toneGuide.description}
- Comprimento: ${lengthGuide.chars} caracteres
- ${includeEmojis ? 'Usa emojis relevantes para destacar características' : 'NÃO uses emojis'}
- Destaca os pontos fortes do imóvel
- Usa linguagem persuasiva mas honesta
- Inclui call-to-action no final
- Estrutura em parágrafos curtos para fácil leitura
- Menciona a localização e vantagens da zona se relevante

Gera APENAS a descrição, sem títulos nem formatação extra.`,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" }
          }
        }
      });

      setGeneratedDescription(result.description);
      toast.success("Descrição gerada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar descrição");
    }
    setIsGenerating(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedDescription);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const applyDescription = async () => {
    try {
      await onUpdate?.(property.id, { description: generatedDescription });
      toast.success("Descrição aplicada ao imóvel!");
    } catch (error) {
      toast.error("Erro ao aplicar descrição");
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Description */}
      {property.description && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs font-medium text-slate-500 mb-2">Descrição Atual</div>
          <p className="text-sm text-slate-700 line-clamp-3">{property.description}</p>
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Tom</label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-slate-500">{t.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Tamanho</label>
          <Select value={length} onValueChange={setLength}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LENGTHS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label} ({l.chars} chars)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="emojis"
          checked={includeEmojis}
          onChange={(e) => setIncludeEmojis(e.target.checked)}
          className="rounded border-slate-300"
        />
        <label htmlFor="emojis" className="text-sm text-slate-600">
          Incluir emojis
        </label>
      </div>

      {/* Generate Button */}
      <Button
        onClick={generateDescription}
        disabled={isGenerating}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A gerar descrição...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Gerar Descrição
          </>
        )}
      </Button>

      {/* Generated Description */}
      {generatedDescription && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm">Descrição Gerada</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {generatedDescription.length} caracteres
            </Badge>
          </div>

          <Textarea
            value={generatedDescription}
            onChange={(e) => setGeneratedDescription(e.target.value)}
            rows={8}
            className="text-sm"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex-1"
            >
              {copied ? (
                <Check className="w-4 h-4 mr-1 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={generateDescription}
              disabled={isGenerating}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerar
            </Button>
            <Button
              size="sm"
              onClick={applyDescription}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}