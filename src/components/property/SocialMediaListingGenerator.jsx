import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Instagram, Facebook, Linkedin, Mail, Sparkles, Copy, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function SocialMediaListingGenerator({ property }) {
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState({
    instagram: "",
    facebook: "",
    linkedin: "",
    newsletter: ""
  });

  const platformConfig = {
    instagram: {
      icon: Instagram,
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      maxLength: 2200,
      hashtags: true,
      emoji: true
    },
    facebook: {
      icon: Facebook,
      color: "bg-blue-600",
      maxLength: 63206,
      hashtags: false,
      emoji: true
    },
    linkedin: {
      icon: Linkedin,
      color: "bg-blue-700",
      maxLength: 3000,
      hashtags: true,
      emoji: false
    },
    newsletter: {
      icon: Mail,
      color: "bg-slate-700",
      maxLength: 10000,
      hashtags: false,
      emoji: false
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const prompt = buildPrompt(platform, tone);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            content: { type: "string" },
            hashtags: { type: "string" },
            call_to_action: { type: "string" }
          }
        }
      });

      const generatedContent = formatContent(result, platform);
      setContent({ ...content, [platform]: generatedContent });
      toast.success("Conteúdo gerado com sucesso!");

    } catch (error) {
      toast.error("Erro ao gerar conteúdo");
      console.error(error);
    }
    setGenerating(false);
  };

  const buildPrompt = (platform, tone) => {
    const propertyInfo = `
IMÓVEL:
Título: ${property.title}
Tipo: ${property.property_type}
Negócio: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Preço: €${property.price?.toLocaleString()}
Localização: ${property.city}, ${property.state}
Quartos: ${property.bedrooms || 'N/A'}
WCs: ${property.bathrooms || 'N/A'}
Área: ${property.useful_area || property.square_feet || 'N/A'}m²
Descrição: ${property.description || 'Sem descrição'}
`;

    const platformInstructions = {
      instagram: `Cria um post ATRATIVO para Instagram Stories/Feed:
- Máximo 2200 caracteres
- Usa emojis relevantes (🏠, 🌟, 📍, etc.)
- Inclui hashtags populares portuguesas (#imobiliaria #imoveis #casa #apartamento #venda #arrendamento)
- Tom ${tone === 'professional' ? 'profissional mas acessível' : tone === 'casual' ? 'descontraído e amigável' : 'luxuoso e exclusivo'}
- IMPORTANTE: Destaca características únicas e cria curiosidade
- Inclui call-to-action forte (DM, Link na Bio, etc.)`,

      facebook: `Cria um post completo para Facebook:
- Mais detalhado que Instagram
- Tom ${tone === 'professional' ? 'profissional e informativo' : tone === 'casual' ? 'conversacional' : 'premium e sofisticado'}
- Inclui todos os detalhes relevantes
- Call-to-action claro (contacto, agendamento)
- Pode usar emojis moderadamente`,

      linkedin: `Cria um post profissional para LinkedIn:
- Tom corporativo e profissional
- Foca em investimento e valor de mercado
- Inclui dados técnicos e características premium
- Hashtags profissionais (#RealEstate #Investment #Property)
- Sem emojis, linguagem formal`,

      newsletter: `Cria um bloco de conteúdo para newsletter/email:
- Formato HTML-friendly
- Estrutura clara com parágrafos
- Destaca características principais
- Inclui todos os detalhes relevantes
- Call-to-action para visita/contacto
- Tom ${tone === 'professional' ? 'profissional' : tone === 'casual' ? 'acolhedor' : 'exclusivo'}`
    };

    return `${platformInstructions[platform]}

${propertyInfo}

ESTRUTURA:
1. Abertura impactante (1 linha chamativa)
2. Características principais em bullets ou lista
3. Descrição do imóvel
4. Localização e contexto
5. Call-to-action
${platformConfig[platform].hashtags ? '6. Hashtags relevantes (separadas no final)' : ''}

Gera em PORTUGUÊS PT. Sê criativo mas preciso.`;
  };

  const formatContent = (result, platform) => {
    let text = result.content || "";
    
    if (result.hashtags && platformConfig[platform].hashtags) {
      text += `\n\n${result.hashtags}`;
    }
    
    if (result.call_to_action) {
      text += `\n\n${result.call_to_action}`;
    }

    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content[platform]);
    toast.success("Copiado!");
  };

  const handleExport = () => {
    const blob = new Blob([content[platform]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${property.ref_id}_${platform}_post.txt`;
    a.click();
    toast.success("Exportado!");
  };

  const config = platformConfig[platform];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Gerador de Conteúdo para Redes Sociais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Plataforma</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </div>
                </SelectItem>
                <SelectItem value="facebook">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </div>
                </SelectItem>
                <SelectItem value="linkedin">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </div>
                </SelectItem>
                <SelectItem value="newsletter">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Newsletter
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tom</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Profissional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="luxury">Luxo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={generating}
          className={`w-full ${config.color} text-white`}
        >
          {generating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              A gerar...
            </>
          ) : (
            <>
              <Icon className="w-4 h-4 mr-2" />
              Gerar Conteúdo para {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </>
          )}
        </Button>

        {content[platform] && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Conteúdo Gerado</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </div>
            </div>

            <Textarea
              value={content[platform]}
              onChange={(e) => setContent({ ...content, [platform]: e.target.value })}
              rows={12}
              className="font-mono text-sm"
            />

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{content[platform].length} caracteres</span>
              <span>Máximo: {config.maxLength.toLocaleString()}</span>
            </div>

            {property.images && property.images.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <strong>Sugestão:</strong> Use a melhor foto do imóvel ({property.images.length} disponíveis). 
                    {platform === 'instagram' && ' Para Stories, use formato vertical 9:16.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>Dica {platform}:</strong></p>
          {platform === 'instagram' && <p>• Use Stories para maior alcance, Reels para viralização</p>}
          {platform === 'facebook' && <p>• Publique em grupos relevantes e marketplace local</p>}
          {platform === 'linkedin' && <p>• Foque em investidores e profissionais do setor</p>}
          {platform === 'newsletter' && <p>• Inclua botão CTA visível e dados de contacto</p>}
        </div>
      </CardContent>
    </Card>
  );
}