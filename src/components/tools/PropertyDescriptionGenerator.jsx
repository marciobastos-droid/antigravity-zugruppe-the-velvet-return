import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, Loader2, RefreshCw, Tag, Target, Globe, Instagram, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function PropertyDescriptionGenerator() {
  const [generating, setGenerating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    property_type: "",
    listing_type: "sale",
    location: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    amenities: "",
    unique_features: "",
    tone: "professional",
    keywords: "",
    target_audience: "families",
    description_length: "medium"
  });
  const [generatedDescriptions, setGeneratedDescriptions] = React.useState({
    website: "",
    portal: "",
    social: ""
  });
  const [seoAnalysis, setSeoAnalysis] = React.useState(null);

  const generateAllDescriptions = async () => {
    if (!formData.property_type || !formData.location) {
      toast.error("Preencha pelo menos o tipo de imóvel e localização");
      return;
    }

    setGenerating(true);

    try {
      const baseInfo = `
Tipo: ${formData.property_type}
Tipo de anúncio: ${formData.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Localização: ${formData.location}
${formData.price ? `Preço: €${formData.price}` : ''}
${formData.bedrooms ? `Quartos: ${formData.bedrooms}` : ''}
${formData.bathrooms ? `WCs: ${formData.bathrooms}` : ''}
${formData.square_feet ? `Área: ${formData.square_feet}m²` : ''}
${formData.amenities ? `Comodidades: ${formData.amenities}` : ''}
${formData.unique_features ? `Características: ${formData.unique_features}` : ''}
${formData.keywords ? `Palavras-chave: ${formData.keywords}` : ''}
`;

      // Gerar todas as versões em paralelo
      const [websiteDesc, portalDesc, socialDesc] = await Promise.all([
        // Website
        base44.integrations.Core.InvokeLLM({
          prompt: `Cria descrição COMPLETA e DETALHADA para WEBSITE (400-600 palavras):

${baseInfo}

Público: ${formData.target_audience}
Tom: ${formData.tone}

INSTRUÇÕES WEBSITE:
- LONGA e COMPLETA (400-600 palavras)
- Storytelling emocional profundo
- Múltiplos parágrafos bem estruturados
- Detalhes de cada espaço e acabamento
- Benefícios do estilo de vida
- Integra keywords naturalmente: ${formData.keywords}
- SEO otimizado com título interno
- Call-to-action forte no final

Retorna APENAS a descrição completa.`
        }),

        // Portal (Idealista, Imovirtual)
        base44.integrations.Core.InvokeLLM({
          prompt: `Cria descrição OTIMIZADA para PORTAIS IMOBILIÁRIOS (200-300 palavras):

${baseInfo}

INSTRUÇÕES PORTAIS (Idealista/Imovirtual):
- FORMATO: 200-300 palavras
- Primeira frase com localização + tipo + preço
- Bullet points mentais (características principais)
- Linguagem direta e objetiva
- Destaca: quartos, área, comodidades principais
- Keywords no primeiro parágrafo: ${formData.keywords}
- Call-to-action: "Agende visita" ou "Contacte já"

Retorna APENAS a descrição.`
        }),

        // Social Media
        base44.integrations.Core.InvokeLLM({
          prompt: `Cria post VIRAL para REDES SOCIAIS (100-150 palavras):

${baseInfo}

INSTRUÇÕES SOCIAL MEDIA:
- CURTO: 100-150 palavras máximo
- Primeira linha IMPACTANTE (gancho)
- Emojis estratégicos (3-5 total)
- Tom entusiasmado mas autêntico
- Destaca 3 características TOP
- Cria FOMO (fear of missing out)
- Hashtags no final (5-7): #${formData.location.replace(/\s/g, '')} #Imovel #${formData.property_type === 'Apartamento' ? 'Apartamento' : 'Moradia'} etc
- Call-to-action urgente

Retorna APENAS o post completo com hashtags.`
        })
      ]);

      setGeneratedDescriptions({
        website: websiteDesc,
        portal: portalDesc,
        social: socialDesc
      });

      // Análise SEO
      const wordCount = websiteDesc.split(' ').length;
      const hasLocation = websiteDesc.toLowerCase().includes(formData.location.toLowerCase());
      const hasPropertyType = websiteDesc.toLowerCase().includes(formData.property_type.toLowerCase());
      const keywordsList = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
      const keywordsFound = keywordsList.filter(keyword => 
        websiteDesc.toLowerCase().includes(keyword.toLowerCase())
      );

      setSeoAnalysis({
        wordCount,
        hasLocation,
        hasPropertyType,
        keywordsFound: keywordsFound.length,
        totalKeywords: keywordsList.length,
        readabilityScore: wordCount >= 400 ? 'Excelente' : wordCount >= 200 ? 'Bom' : 'Pode melhorar'
      });

      toast.success("3 versões geradas com IA!");
    } catch (error) {
      toast.error("Erro ao gerar descrições");
      console.error(error);
    }

    setGenerating(false);
  };

  const copyToClipboard = (text, platform) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copiado (${platform})!`);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Configuração IA Multi-Plataforma
          </CardTitle>
          <p className="text-sm text-slate-600">Gera 3 versões otimizadas automaticamente</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Imóvel *</Label>
              <Select value={formData.property_type} onValueChange={(v) => setFormData({...formData, property_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Moradia">Moradia</SelectItem>
                  <SelectItem value="Apartamento">Apartamento</SelectItem>
                  <SelectItem value="Terreno">Terreno</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Escritório">Escritório</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Anúncio</Label>
              <Select value={formData.listing_type} onValueChange={(v) => setFormData({...formData, listing_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="rent">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Localização * <Badge variant="outline" className="ml-2 text-xs">SEO</Badge></Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="Ex: Cascais, Lisboa, Porto..."
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Preço (€)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="350000"
              />
            </div>
            <div>
              <Label>Quartos</Label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                placeholder="3"
              />
            </div>
            <div>
              <Label>WCs</Label>
              <Input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                placeholder="2"
              />
            </div>
          </div>

          <div>
            <Label>Área (m²)</Label>
            <Input
              type="number"
              value={formData.square_feet}
              onChange={(e) => setFormData({...formData, square_feet: e.target.value})}
              placeholder="120"
            />
          </div>

          <div>
            <Label>Comodidades</Label>
            <Input
              value={formData.amenities}
              onChange={(e) => setFormData({...formData, amenities: e.target.value})}
              placeholder="Piscina, Garagem, Varanda..."
            />
          </div>

          <div>
            <Label>Características Únicas</Label>
            <Textarea
              value={formData.unique_features}
              onChange={(e) => setFormData({...formData, unique_features: e.target.value})}
              placeholder="Vista mar, renovado, zona premium..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <Label className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-blue-600" />
              Palavras-chave SEO
            </Label>
            <Input
              value={formData.keywords}
              onChange={(e) => setFormData({...formData, keywords: e.target.value})}
              placeholder="apartamento cascais, vista mar, luxo, T3..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Público-alvo
              </Label>
              <Select value={formData.target_audience} onValueChange={(v) => setFormData({...formData, target_audience: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="families">👨‍👩‍👧‍👦 Famílias</SelectItem>
                  <SelectItem value="professionals">💼 Profissionais</SelectItem>
                  <SelectItem value="investors">💰 Investidores</SelectItem>
                  <SelectItem value="retirees">🌴 Reformados</SelectItem>
                  <SelectItem value="luxury">💎 Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tom</Label>
              <Select value={formData.tone} onValueChange={(v) => setFormData({...formData, tone: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">🎯 Profissional</SelectItem>
                  <SelectItem value="luxurious">💎 Luxuoso</SelectItem>
                  <SelectItem value="warm">❤️ Acolhedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generateAllDescriptions}
            disabled={generating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                IA a gerar 3 versões...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar 3 Versões (Website + Portal + Social)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrições Multi-Plataforma</CardTitle>
          <p className="text-sm text-slate-600">3 versões otimizadas para cada canal</p>
        </CardHeader>
        <CardContent>
          {!generatedDescriptions.website ? (
            <div className="text-center py-20">
              <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Configure e gere 3 versões otimizadas</p>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Website
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  Portais
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Instagram className="w-3 h-3" />
                  Social
                </Badge>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="website" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="website" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </TabsTrigger>
                <TabsTrigger value="portal" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Portais
                </TabsTrigger>
                <TabsTrigger value="social" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Social
                </TabsTrigger>
              </TabsList>

              <TabsContent value="website" className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                    {generatedDescriptions.website}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => copyToClipboard(generatedDescriptions.website, "Website")} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button onClick={generateAllDescriptions} variant="outline" disabled={generating} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerar
                  </Button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-1">📊 Website (400-600 palavras)</p>
                  <p className="text-xs text-blue-700">
                    Descrição completa e detalhada para o seu site. Otimizada para SEO e conversão.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="portal" className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                    {generatedDescriptions.portal}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => copyToClipboard(generatedDescriptions.portal, "Portal")} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button onClick={generateAllDescriptions} variant="outline" disabled={generating} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerar
                  </Button>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-900 mb-1">🏢 Portais (200-300 palavras)</p>
                  <p className="text-xs text-green-700">
                    Otimizada para Idealista, Imovirtual, Casa Sapo. Formato direto e objetivo.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                    {generatedDescriptions.social}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => copyToClipboard(generatedDescriptions.social, "Social Media")} variant="outline" className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </Button>
                  <Button onClick={generateAllDescriptions} variant="outline" disabled={generating} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerar
                  </Button>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-purple-900 mb-1">📱 Social Media (100-150 palavras)</p>
                  <p className="text-xs text-purple-700">
                    Post viral com emojis e hashtags. Pronto para Facebook, Instagram e LinkedIn.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {seoAnalysis && (
            <div className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Análise SEO (Website)
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-600 mb-1">Palavras:</p>
                  <Badge className={seoAnalysis.wordCount >= 400 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {seoAnalysis.wordCount} palavras
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Legibilidade:</p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {seoAnalysis.readabilityScore}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Localização:</p>
                  <Badge className={seoAnalysis.hasLocation ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {seoAnalysis.hasLocation ? '✓ Incluída' : '✗ Falta'}
                  </Badge>
                </div>
                {seoAnalysis.totalKeywords > 0 && (
                  <div>
                    <p className="text-slate-600 mb-1">Keywords:</p>
                    <Badge className={seoAnalysis.keywordsFound === seoAnalysis.totalKeywords ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {seoAnalysis.keywordsFound}/{seoAnalysis.totalKeywords}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}