import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, Copy, Check, RefreshCw, 
  Wand2, FileText
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

export default function AIDevelopmentDescriptionGenerator({ development, onUpdate }) {
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
        prompt: `Gera uma descrição comercial apelativa para este empreendimento imobiliário em Português de Portugal.

DADOS DO EMPREENDIMENTO:
- Nome: ${development.name}
- Localização: ${development.address ? `${development.address}, ` : ''}${development.city}${development.postal_code ? ` ${development.postal_code}` : ''}
- Promotor: ${development.developer || 'N/A'}
- Estado: ${development.status === 'planning' ? 'Em Planeamento' : development.status === 'under_construction' ? 'Em Construção' : development.status === 'completed' ? 'Concluído' : 'Em Comercialização'}
- Total de unidades: ${development.total_units || 'N/A'}
- Unidades disponíveis: ${development.available_units || 'N/A'}
- Preços: ${development.price_from ? `Desde €${development.price_from.toLocaleString()}` : ''}${development.price_to ? ` até €${development.price_to.toLocaleString()}` : ''}
- Data de conclusão: ${development.completion_date || 'N/A'}
- Comodidades: ${development.amenities?.join(', ') || 'N/A'}
- Características: ${development.features?.join(', ') || 'N/A'}
- Descrição atual: ${development.description || 'Nenhuma'}

INSTRUÇÕES:
- Tom: ${toneGuide.label} - ${toneGuide.description}
- Comprimento: ${lengthGuide.chars} caracteres
- ${includeEmojis ? 'Usa emojis relevantes para destacar características' : 'NÃO uses emojis'}
- Destaca o conceito do empreendimento e sua localização privilegiada
- Menciona as comodidades e diferenciais do projeto
- Descreve o estilo de vida que o empreendimento proporciona
- Inclui informação sobre tipologias disponíveis e preços
- Usa linguagem persuasiva que apele a investidores e compradores
- Inclui call-to-action no final incentivando contacto
- Estrutura em parágrafos curtos para fácil leitura

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
      await onUpdate?.(development.id, { description: generatedDescription });
      toast.success("Descrição aplicada ao empreendimento!");
    } catch (error) {
      toast.error("Erro ao aplicar descrição");
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Description */}
      {development.description && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs font-medium text-slate-500 mb-2">Descrição Atual</div>
          <p className="text-sm text-slate-700 line-clamp-3">{development.description}</p>
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
          id="emojis-dev"
          checked={includeEmojis}
          onChange={(e) => setIncludeEmojis(e.target.checked)}
          className="rounded border-slate-300"
        />
        <label htmlFor="emojis-dev" className="text-sm text-slate-600">
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