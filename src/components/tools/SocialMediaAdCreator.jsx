import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Facebook, Instagram, Linkedin, Twitter, Share2, Copy, Check, 
  Wand2, Home, MapPin, Bed, Bath, Euro, Square, Download,
  Eye, RefreshCw, Sparkles, ChevronRight, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = {
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2', maxChars: 63206 },
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F', maxChars: 2200 },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', maxChars: 3000 },
  twitter: { name: 'X (Twitter)', icon: Twitter, color: '#000000', maxChars: 280 }
};

const AD_TEMPLATES = {
  listing: {
    name: 'Anuncio de Imovel',
    description: 'Post standard para promover um imovel'
  },
  openhouse: {
    name: 'Open House',
    description: 'Convite para visita aberta'
  },
  priceReduction: {
    name: 'Reducao de Preco',
    description: 'Destacar reducao de preco'
  },
  newListing: {
    name: 'Novo no Mercado',
    description: 'Apresentar novo imovel'
  },
  soldTeaser: {
    name: 'Vendido (Teaser)',
    description: 'Celebrar venda e gerar interesse'
  }
};

export default function SocialMediaAdCreator() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('facebook');
  const [selectedTemplate, setSelectedTemplate] = useState('listing');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [customContent, setCustomContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [additionalDetails, setAdditionalDetails] = useState('');

  // Fetch properties
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['propertiesForAds'],
    queryFn: () => base44.entities.Property.list('-created_date', 200)
  });

  // Generate content using AI
  const generateContent = async () => {
    if (!selectedProperty) {
      toast.error('Selecione um imovel primeiro');
      return;
    }

    setGenerating(true);

    try {
      const platform = PLATFORMS[selectedPlatform];
      const template = AD_TEMPLATES[selectedTemplate];

      const prompt = `Cria um post para ${platform.name} sobre este imovel:

DADOS DO IMOVEL:
- Titulo: ${selectedProperty.title}
- Tipo: ${selectedProperty.property_type === 'apartment' ? 'Apartamento' : selectedProperty.property_type === 'house' ? 'Moradia' : selectedProperty.property_type}
- Preco: ${selectedProperty.price ? `€${selectedProperty.price.toLocaleString()}` : 'Sob consulta'}
- Quartos: ${selectedProperty.bedrooms || 'N/A'}
- Casas de banho: ${selectedProperty.bathrooms || 'N/A'}
- Area: ${selectedProperty.square_feet ? `${selectedProperty.square_feet}m²` : 'N/A'}
- Localizacao: ${selectedProperty.address || ''}, ${selectedProperty.city || ''}, ${selectedProperty.state || ''}
- Descricao: ${selectedProperty.description?.substring(0, 500) || 'Sem descricao'}
- Comodidades: ${(selectedProperty.amenities || []).join(', ') || 'N/A'}
${additionalDetails ? `- Detalhes adicionais: ${additionalDetails}` : ''}

TIPO DE POST: ${template.name} - ${template.description}

REQUISITOS:
- Maximo ${platform.maxChars} caracteres
- Tom profissional mas apelativo
- Incluir emojis relevantes (🏠 🛏️ 🚿 📍 💰)
- Incluir call-to-action claro
- Para Instagram: incluir hashtags relevantes (max 30)
- Para LinkedIn: tom mais profissional
- Para Twitter/X: ser conciso, max 280 caracteres
${selectedTemplate === 'priceReduction' ? '- Destacar a reducao de preco e urgencia' : ''}
${selectedTemplate === 'newListing' ? '- Criar excitement sobre novo imovel' : ''}
${selectedTemplate === 'openhouse' ? '- Incluir convite para visita e criar urgencia' : ''}

Responde APENAS com o texto do post, sem explicacoes.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            post_text: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            suggested_cta: { type: 'string' }
          }
        }
      });

      setGeneratedContent({
        text: response?.post_text || '',
        hashtags: response?.hashtags || [],
        cta: response?.suggested_cta || ''
      });
      setCustomContent(response?.post_text || '');
      
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Erro ao gerar conteudo');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado para a area de transferencia');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const shareToFacebook = () => {
    if (!selectedProperty) return;
    const url = `${window.location.origin}/PropertyDetails?id=${selectedProperty.id}`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(customContent)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareToLinkedIn = () => {
    if (!selectedProperty) return;
    const url = `${window.location.origin}/PropertyDetails?id=${selectedProperty.id}`;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    if (!selectedProperty) return;
    const url = `${window.location.origin}/PropertyDetails?id=${selectedProperty.id}`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(customContent)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const PlatformIcon = PLATFORMS[selectedPlatform].icon;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Criador de Anuncios</h2>
          <p className="text-slate-600">Gere posts para redes sociais automaticamente</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-6">
          {/* Property Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                1. Selecionar Imovel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedProperty?.id || ''} 
                onValueChange={(id) => setSelectedProperty(properties.find(p => p.id === id))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um imovel..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[250px]">{property.title}</span>
                        {property.price && (
                          <Badge variant="outline" className="ml-auto">
                            €{property.price.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProperty && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex gap-4">
                    {selectedProperty.images?.[0] ? (
                      <img 
                        src={selectedProperty.images[0]} 
                        alt="" 
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{selectedProperty.title}</h4>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedProperty.city}, {selectedProperty.state}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        {selectedProperty.bedrooms && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-4 h-4 text-slate-400" />
                            T{selectedProperty.bedrooms}
                          </span>
                        )}
                        {selectedProperty.square_feet && (
                          <span className="flex items-center gap-1">
                            <Square className="w-4 h-4 text-slate-400" />
                            {selectedProperty.square_feet}m²
                          </span>
                        )}
                        {selectedProperty.price && (
                          <span className="flex items-center gap-1 font-semibold text-green-600">
                            <Euro className="w-4 h-4" />
                            {selectedProperty.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-600" />
                2. Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(PLATFORMS).map(([key, platform]) => {
                  const Icon = platform.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedPlatform(key)}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedPlatform === key 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-6 h-6" style={{ color: platform.color }} />
                      <span className="text-xs font-medium">{platform.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                3. Tipo de Anuncio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(AD_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTemplate(key)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === key 
                        ? 'border-amber-500 bg-amber-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-slate-500">{template.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Detalhes Adicionais (Opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Ex: Open house sabado as 15h, preco negociavel, urgente..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button 
            onClick={generateContent}
            disabled={!selectedProperty || generating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            size="lg"
          >
            {generating ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                A gerar...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Gerar Conteudo com IA
              </>
            )}
          </Button>
        </div>

        {/* Right Panel - Preview */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                Pre-visualizacao
                <Badge 
                  className="ml-auto"
                  style={{ backgroundColor: PLATFORMS[selectedPlatform].color }}
                >
                  {PLATFORMS[selectedPlatform].name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mock Social Post Preview */}
              <div className="border rounded-lg overflow-hidden bg-white">
                {/* Post Header */}
                <div className="p-3 border-b flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                  <div>
                    <p className="font-semibold text-sm">Sua Imobiliaria</p>
                    <p className="text-xs text-slate-500">Agora mesmo</p>
                  </div>
                </div>

                {/* Image */}
                {selectedProperty?.images?.length > 0 && (
                  <div className="relative aspect-square bg-slate-100">
                    <img 
                      src={selectedProperty.images[selectedImage]} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {selectedProperty.images.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {selectedProperty.images.slice(0, 5).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImage(idx)}
                            className={`w-2 h-2 rounded-full ${
                              selectedImage === idx ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {customContent || generatedContent?.text ? (
                    <div className="space-y-3">
                      <Textarea
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                        rows={8}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {customContent.length} / {PLATFORMS[selectedPlatform].maxChars} caracteres
                        </span>
                        {customContent.length > PLATFORMS[selectedPlatform].maxChars && (
                          <Badge variant="destructive">Excede limite!</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Wand2 className="w-8 h-8 mx-auto mb-2" />
                      <p>Gere conteudo para ver a pre-visualizacao</p>
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                {generatedContent?.hashtags?.length > 0 && selectedPlatform === 'instagram' && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-slate-500 mb-2">Hashtags sugeridas:</p>
                    <div className="flex flex-wrap gap-1">
                      {generatedContent.hashtags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {(customContent || generatedContent) && (
                <div className="mt-4 space-y-3">
                  <Button 
                    onClick={() => copyToClipboard(customContent)}
                    className="w-full"
                    variant="outline"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Texto
                      </>
                    )}
                  </Button>

                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      onClick={shareToFacebook}
                      className="bg-[#1877F2] hover:bg-[#166FE5]"
                      size="sm"
                    >
                      <Facebook className="w-4 h-4 mr-1" />
                      Facebook
                    </Button>
                    <Button 
                      onClick={shareToLinkedIn}
                      className="bg-[#0A66C2] hover:bg-[#0958A8]"
                      size="sm"
                    >
                      <Linkedin className="w-4 h-4 mr-1" />
                      LinkedIn
                    </Button>
                    <Button 
                      onClick={shareToTwitter}
                      className="bg-black hover:bg-slate-800"
                      size="sm"
                    >
                      <Twitter className="w-4 h-4 mr-1" />
                      X
                    </Button>
                  </div>

                  <Button 
                    onClick={generateContent}
                    variant="ghost"
                    className="w-full"
                    disabled={generating}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                    Regenerar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}