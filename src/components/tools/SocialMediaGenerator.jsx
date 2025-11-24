import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, Loader2, Instagram, Facebook, Linkedin, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function SocialMediaGenerator() {
  const [generating, setGenerating] = React.useState(false);
  const [selectedProperty, setSelectedProperty] = React.useState("");
  const [platform, setPlatform] = React.useState("instagram");
  const [postType, setPostType] = React.useState("single");
  const [generatedPosts, setGeneratedPosts] = React.useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const generatePosts = async () => {
    if (!selectedProperty) {
      toast.error("Selecione um imóvel");
      return;
    }

    setGenerating(true);

    try {
      const property = properties.find(p => p.id === selectedProperty);
      
      const propertyInfo = `
IMÓVEL:
Título: ${property.title}
Tipo: ${property.property_type}
Localização: ${property.city}, ${property.state}
Preço: €${property.price?.toLocaleString()}
${property.bedrooms ? `Quartos: ${property.bedrooms}` : ''}
${property.bathrooms ? `WCs: ${property.bathrooms}` : ''}
${property.square_feet ? `Área: ${property.square_feet}m²` : ''}
${property.description ? `Descrição: ${property.description.substring(0, 300)}` : ''}
${property.amenities?.length ? `Comodidades: ${property.amenities.join(', ')}` : ''}
`;

      const platformSpecs = {
        instagram: {
          name: "Instagram",
          chars: "150-200 caracteres",
          style: "Visual, emojis, hashtags estratégicas (8-12)",
          format: "Quebras de linha para facilitar leitura"
        },
        facebook: {
          name: "Facebook",
          chars: "200-300 caracteres",
          style: "Storytelling, mais texto, CTA forte",
          format: "Parágrafos curtos, 3-5 hashtags"
        },
        linkedin: {
          name: "LinkedIn",
          chars: "250-350 caracteres",
          style: "Profissional, investimento, dados concretos",
          format: "Tom corporativo, 2-3 hashtags profissionais"
        }
      };

      if (postType === "single") {
        const specs = platformSpecs[platform];
        
        const post = await base44.integrations.Core.InvokeLLM({
          prompt: `Cria post VIRAL para ${specs.name} sobre este imóvel:

${propertyInfo}

ESPECIFICAÇÕES ${specs.name.toUpperCase()}:
- Tamanho: ${specs.chars}
- Estilo: ${specs.style}
- Formato: ${specs.format}

ESTRUTURA OBRIGATÓRIA:
1. GANCHO (primeira linha impactante)
2. CORPO (3-4 características principais com emojis)
3. BENEFÍCIOS EMOCIONAIS
4. CALL-TO-ACTION urgente
5. HASHTAGS no final

${platform === 'instagram' ? 'Use 8-12 hashtags estratégicas' : ''}
${platform === 'facebook' ? 'Cria história que conecta emocionalmente' : ''}
${platform === 'linkedin' ? 'Foca em investimento e ROI, tom profissional' : ''}

CRÍTICO: 
- Emojis relevantes (3-6 total)
- Cria URGÊNCIA/FOMO
- Destaca DIFERENCIAL único
- Preço destacado

Retorna APENAS o post completo.`
        });

        setGeneratedPosts({ [platform]: post });
      } else {
        // Gerar para todas as plataformas
        const [instagram, facebook, linkedin] = await Promise.all([
          base44.integrations.Core.InvokeLLM({
            prompt: `Post INSTAGRAM (150-200 chars) sobre:
${propertyInfo}

- Visual e impactante
- 8-12 hashtags
- Emojis estratégicos (5-6)
- Quebras de linha
- CTA urgente

Retorna APENAS o post.`
          }),
          
          base44.integrations.Core.InvokeLLM({
            prompt: `Post FACEBOOK (200-300 chars) sobre:
${propertyInfo}

- Storytelling emocional
- Parágrafos curtos
- 3-5 hashtags
- CTA forte
- Tom caloroso

Retorna APENAS o post.`
          }),
          
          base44.integrations.Core.InvokeLLM({
            prompt: `Post LINKEDIN (250-350 chars) sobre:
${propertyInfo}

- Tom profissional/corporativo
- Foca investimento e valorização
- Dados concretos
- 2-3 hashtags profissionais
- CTA business

Retorna APENAS o post.`
          })
        ]);

        setGeneratedPosts({ instagram, facebook, linkedin });
      }

      toast.success("Posts gerados!");
    } catch (error) {
      toast.error("Erro ao gerar posts");
      console.error(error);
    }

    setGenerating(false);
  };

  const copyToClipboard = (text, platform) => {
    navigator.clipboard.writeText(text);
    toast.success(`Post ${platform} copiado!`);
  };

  const activeProperties = properties.filter(p => p.status === 'active');

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            Gerador de Posts Sociais com IA
          </CardTitle>
          <p className="text-sm text-slate-600">Posts persuasivos otimizados para cada rede</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Selecionar Imóvel *</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher imóvel..." />
              </SelectTrigger>
              <SelectContent>
                {activeProperties.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">Nenhum imóvel ativo disponível</div>
                ) : (
                  activeProperties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.title} - €{prop.price?.toLocaleString()}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedProperty && (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600">
                  {properties.find(p => p.id === selectedProperty)?.description?.substring(0, 150)}...
                </p>
              </div>
            )}
          </div>

          <div>
            <Label>Tipo de Geração</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Uma Plataforma</SelectItem>
                <SelectItem value="all">Todas (Instagram + Facebook + LinkedIn)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {postType === "single" && (
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
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={generatePosts}
            disabled={generating || !selectedProperty}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                IA a criar posts...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Post{postType === 'all' ? 's' : ''} com IA
              </>
            )}
          </Button>

          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-900 mb-2">✨ O que a IA cria:</p>
            <ul className="text-xs text-slate-700 space-y-1">
              <li>✓ Gancho impactante para captar atenção</li>
              <li>✓ Emojis estratégicos para cada plataforma</li>
              <li>✓ Hashtags otimizadas para alcance</li>
              <li>✓ Call-to-action persuasivo</li>
              <li>✓ Tom adaptado ao público de cada rede</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posts Gerados</CardTitle>
          <p className="text-sm text-slate-600">Prontos para publicar</p>
        </CardHeader>
        <CardContent>
          {!generatedPosts ? (
            <div className="text-center py-20">
              <Share2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">Selecione um imóvel e gere posts</p>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Instagram className="w-3 h-3" />
                  Instagram
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Facebook className="w-3 h-3" />
                  Facebook
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Linkedin className="w-3 h-3" />
                  LinkedIn
                </Badge>
              </div>
            </div>
          ) : postType === "single" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {platform === 'instagram' && <Instagram className="w-5 h-5 text-pink-600" />}
                {platform === 'facebook' && <Facebook className="w-5 h-5 text-blue-600" />}
                {platform === 'linkedin' && <Linkedin className="w-5 h-5 text-blue-700" />}
                <h3 className="font-semibold text-lg capitalize">{platform}</h3>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4 min-h-[300px] border border-slate-200">
                <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                  {generatedPosts[platform]}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => copyToClipboard(generatedPosts[platform], platform)} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Post
                </Button>
                <Button 
                  onClick={generatePosts} 
                  variant="outline" 
                  disabled={generating}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerar
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="instagram" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </TabsTrigger>
                <TabsTrigger value="facebook" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </TabsTrigger>
                <TabsTrigger value="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </TabsTrigger>
              </TabsList>

              {['instagram', 'facebook', 'linkedin'].map((plat) => (
                <TabsContent key={plat} value={plat} className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-4 min-h-[250px] border border-slate-200">
                    <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                      {generatedPosts[plat]}
                    </p>
                  </div>
                  <Button 
                    onClick={() => copyToClipboard(generatedPosts[plat], plat)} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Post {plat.charAt(0).toUpperCase() + plat.slice(1)}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}