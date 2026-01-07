import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Check, RefreshCw, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

/**
 * Componente para melhorar descrições de imóveis usando IA
 * Analisa características, localização e até imagens para gerar descrições ricas
 */
export default function AIDescriptionEnhancer({ property, onApply }) {
  const [loading, setLoading] = React.useState(false);
  const [enhancedDescription, setEnhancedDescription] = React.useState("");
  const [highlights, setHighlights] = React.useState([]);

  const generateEnhancedDescription = async () => {
    setLoading(true);
    try {
      // Preparar contexto do imóvel
      const context = {
        title: property.title,
        current_description: property.description || "",
        type: property.property_type,
        listing_type: property.listing_type,
        location: `${property.city}, ${property.state}`,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.useful_area || property.square_feet,
        amenities: property.amenities || [],
        year_built: property.year_built,
        energy_certificate: property.energy_certificate,
        finishes: property.finishes,
        sun_exposure: property.sun_exposure
      };

      // Chamar IA (com imagens se disponível)
      const prompt = `Você é um especialista em marketing imobiliário. Crie uma descrição persuasiva e detalhada para este imóvel:

Tipo: ${context.type}
Negócio: ${context.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Localização: ${context.location}
Preço: €${context.price?.toLocaleString()}
Quartos: ${context.bedrooms || 'N/A'}
Casas de banho: ${context.bathrooms || 'N/A'}
Área: ${context.area || 'N/A'}m²
${context.year_built ? `Ano: ${context.year_built}` : ''}
${context.energy_certificate ? `Certificado Energético: ${context.energy_certificate}` : ''}
${context.amenities.length > 0 ? `Comodidades: ${context.amenities.join(', ')}` : ''}
${context.finishes ? `Acabamentos: ${context.finishes}` : ''}

Descrição atual: ${context.current_description}

Crie uma descrição:
1. Persuasiva e apelativa, destacando os pontos fortes
2. Detalhada com características únicas
3. Otimizada para SEO (inclua palavras-chave relevantes naturalmente)
4. Entre 150-300 palavras
5. Em português de Portugal
6. Que transmita emoção e ajude o cliente a imaginar-se no imóvel

Também forneça uma lista de 5-7 highlights/destaques do imóvel (frases curtas).`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: property.images?.slice(0, 3) || [], // Enviar primeiras 3 imagens para contexto visual
        response_json_schema: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Descrição completa otimizada"
            },
            highlights: {
              type: "array",
              items: { type: "string" },
              description: "Lista de highlights/destaques"
            },
            seo_keywords: {
              type: "array",
              items: { type: "string" },
              description: "Palavras-chave SEO identificadas"
            }
          }
        }
      });

      setEnhancedDescription(response.description);
      setHighlights(response.highlights || []);
      toast.success("Descrição melhorada gerada com sucesso!");
    } catch (error) {
      console.error('[AIDescriptionEnhancer] Error:', error);
      toast.error("Erro ao gerar descrição: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyDescription = () => {
    if (onApply) {
      onApply({
        description: enhancedDescription,
        ai_features_used: [...(property.ai_features_used || []), 'description_enhancement']
      });
      toast.success("Descrição aplicada!");
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Melhorar Descrição com IA
        </CardTitle>
        <p className="text-sm text-slate-600">
          Gera uma descrição otimizada analisando características e imagens
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enhancedDescription ? (
          <div className="text-center py-6">
            <Button
              onClick={generateEnhancedDescription}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A gerar descrição melhorada...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Descrição Otimizada
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-3">
              A IA analisará as características e imagens do imóvel
            </p>
          </div>
        ) : (
          <>
            {/* Descrição gerada */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">Descrição Otimizada</label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(enhancedDescription);
                    toast.success('Descrição copiada!');
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar
                </Button>
              </div>
              <Textarea
                value={enhancedDescription}
                onChange={(e) => setEnhancedDescription(e.target.value)}
                className="min-h-[200px] bg-white"
              />
              <div className="text-xs text-slate-500 mt-1">
                {enhancedDescription.split(' ').length} palavras
              </div>
            </div>

            {/* Highlights */}
            {highlights.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-600" />
                  Destaques do Imóvel
                </label>
                <div className="space-y-1.5">
                  {highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-white p-2 rounded border">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={applyDescription}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Aplicar Descrição
              </Button>
              <Button
                variant="outline"
                onClick={generateEnhancedDescription}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}