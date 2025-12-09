import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Share2, FileText, Mail, Copy, Download, 
  Facebook, Instagram, Twitter, Linkedin, Send, Loader2,
  Eye, TrendingUp, Target
} from "lucide-react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Social Media Post Generator
function SocialMediaGenerator() {
  const [selectedProperty, setSelectedProperty] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [tone, setTone] = useState("professional");
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");

  const { data: properties = [] } = useQuery({
    queryKey: ['activeProperties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' })
  });

  const generatePost = async () => {
    if (!selectedProperty) {
      toast.error("Selecione um imóvel");
      return;
    }

    setGenerating(true);
    const property = properties.find(p => p.id === selectedProperty);

    try {
      const platformGuidelines = {
        facebook: "Post mais longo e detalhado (até 300 palavras), pode usar emojis moderadamente",
        instagram: "Post visual e curto (até 150 palavras), usar hashtags relevantes, muitos emojis",
        twitter: "Post muito curto (até 280 caracteres), direto ao ponto",
        linkedin: "Post profissional e informativo (até 200 palavras), sem emojis"
      };

      const toneGuidelines = {
        professional: "Tom profissional e elegante",
        casual: "Tom casual e amigável",
        luxury: "Tom sofisticado e exclusivo",
        urgent: "Tom urgente com call-to-action forte"
      };

      const post = await base44.integrations.Core.InvokeLLM({
        prompt: `Cria um post para ${platform} promovendo este imóvel:

IMÓVEL:
- Título: ${property.title}
- Tipo: ${property.property_type}
- Preço: €${property.price?.toLocaleString()}
- Localização: ${property.city}, ${property.state}
- Quartos: ${property.bedrooms || 'N/A'}
- Área: ${property.useful_area || property.square_feet || 'N/A'}m²
${property.description ? `- Descrição: ${property.description.substring(0, 200)}...` : ''}

INSTRUÇÕES:
- ${platformGuidelines[platform]}
- ${toneGuidelines[tone]}
- Incluir call-to-action apropriado
- Destacar pontos fortes do imóvel
- Criar urgência e interesse
${platform === 'instagram' ? '- Incluir 10-15 hashtags relevantes no final' : ''}
${platform === 'twitter' ? '- MÁXIMO 280 caracteres incluindo hashtags' : ''}

Retorna APENAS o texto do post, pronto para copiar e colar.`
      });

      setGeneratedPost(post);
      toast.success("Post gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar post");
      console.error(error);
    }
    setGenerating(false);
  };

  const copyPost = () => {
    navigator.clipboard.writeText(generatedPost);
    toast.success("Post copiado!");
  };

  const platformIcons = {
    facebook: <Facebook className="w-4 h-4" />,
    instagram: <Instagram className="w-4 h-4" />,
    twitter: <Twitter className="w-4 h-4" />,
    linkedin: <Linkedin className="w-4 h-4" />
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Selecionar Imóvel</Label>
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um imóvel..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title} - {p.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Plataforma</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="facebook">
                <div className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </div>
              </SelectItem>
              <SelectItem value="instagram">
                <div className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </div>
              </SelectItem>
              <SelectItem value="twitter">
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4" />
                  Twitter/X
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

        <div>
          <Label>Tom da Mensagem</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Profissional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="luxury">Luxo/Exclusivo</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button 
            onClick={generatePost} 
            disabled={generating || !selectedProperty}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A gerar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Post
              </>
            )}
          </Button>
        </div>
      </div>

      {generatedPost && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {platformIcons[platform]}
                Post Gerado
              </CardTitle>
              <Button variant="outline" size="sm" onClick={copyPost}>
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">
              {generatedPost}
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Caracteres: {generatedPost.length}
              {platform === 'twitter' && generatedPost.length > 280 && (
                <span className="text-red-600 ml-2">⚠️ Excede o limite do Twitter</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Landing Page Generator
function LandingPageGenerator() {
  const [selectedProperty, setSelectedProperty] = useState("");
  const [generating, setGenerating] = useState(false);
  const [landingPageData, setLandingPageData] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const { data: properties = [] } = useQuery({
    queryKey: ['activeProperties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' })
  });

  const generateLandingPage = async () => {
    if (!selectedProperty) {
      toast.error("Selecione um imóvel");
      return;
    }

    setGenerating(true);
    const property = properties.find(p => p.id === selectedProperty);

    try {
      const content = await base44.integrations.Core.InvokeLLM({
        prompt: `Cria conteúdo para uma landing page de imóvel profissional:

IMÓVEL:
${JSON.stringify(property, null, 2)}

Gera um objeto JSON com a seguinte estrutura:
{
  "headline": "Título impactante (curto)",
  "subheadline": "Subtítulo complementar",
  "hero_text": "Texto hero section (50 palavras)",
  "features": ["Lista de 5-6 features principais curtas"],
  "about_section": "Texto descritivo completo (150 palavras)",
  "why_choose": ["3 razões para escolher este imóvel"],
  "cta_primary": "Texto do botão principal",
  "cta_secondary": "Texto do botão secundário",
  "meta_title": "Meta título SEO (máx 60 caracteres)",
  "meta_description": "Meta descrição SEO (máx 160 caracteres)"
}

IMPORTANTE: Retorna APENAS o JSON válido, sem markdown ou comentários.`,
        response_json_schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            subheadline: { type: "string" },
            hero_text: { type: "string" },
            features: { type: "array", items: { type: "string" } },
            about_section: { type: "string" },
            why_choose: { type: "array", items: { type: "string" } },
            cta_primary: { type: "string" },
            cta_secondary: { type: "string" },
            meta_title: { type: "string" },
            meta_description: { type: "string" }
          }
        }
      });

      setLandingPageData({ ...content, property });
      setMetaTitle(content.meta_title || "");
      setMetaDescription(content.meta_description || "");
      toast.success("Landing page gerada!");
    } catch (error) {
      toast.error("Erro ao gerar landing page");
      console.error(error);
    }
    setGenerating(false);
  };

  const exportHTML = () => {
    const images = landingPageData.property.images || [];
    const property = landingPageData.property;
    
    // Generate optimized SEO meta tags
    const propertyTypeLabel = {
      apartment: 'Apartamento',
      house: 'Moradia',
      land: 'Terreno',
      building: 'Prédio',
      farm: 'Quinta',
      store: 'Loja',
      warehouse: 'Armazém',
      office: 'Escritório'
    }[property.property_type] || property.property_type;

    const bedroomsLabel = property.bedrooms ? `T${property.bedrooms}` : '';
    const listingAction = property.listing_type === 'sale' ? 'Venda' : 'Arrendamento';
    
    // Optimized meta title with location and type
    const pageTitle = metaTitle || 
      `${propertyTypeLabel} ${bedroomsLabel} em ${property.city} - ${listingAction} | ZuGruppe`.substring(0, 60);
    
    // Optimized meta description with key details
    const pageDescription = metaDescription || 
      `${propertyTypeLabel} ${bedroomsLabel} para ${listingAction.toLowerCase()} em ${property.city}. ${property.useful_area || property.square_feet || ''}m². €${property.price?.toLocaleString()}. ${landingPageData.hero_text}`.substring(0, 160);

    // Generate comprehensive SEO-friendly URL slug
    const propertyTypeSlug = property.property_type.toLowerCase();
    const citySlug = property.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const bedroomsSlug = property.bedrooms ? `-t${property.bedrooms}` : '';
    const refSlug = property.ref_id ? `-${property.ref_id.toLowerCase()}` : '';
    
    const urlSlug = `${propertyTypeSlug}-${citySlug}${bedroomsSlug}-${listingAction.toLowerCase()}${refSlug}`;

    // Generate rich keywords for SEO
    const keywords = [
      propertyTypeLabel,
      bedroomsLabel,
      property.city,
      property.state,
      listingAction,
      'imóvel',
      'Portugal',
      property.country !== 'Portugal' ? property.country : '',
      ...(property.amenities || []).slice(0, 3)
    ].filter(Boolean).join(', ');

    // Rich Schema.org structured data with all details
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "@id": `https://zugruppe.com/${urlSlug}`,
      "name": property.title,
      "description": property.description || landingPageData.about_section,
      "url": `https://zugruppe.com/${urlSlug}`,
      "image": images,
      "datePosted": property.created_date,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": property.address || "",
        "addressLocality": property.city,
        "addressRegion": property.state,
        "postalCode": property.zip_code || "",
        "addressCountry": property.country || "PT"
      },
      "geo": property.latitude && property.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": property.latitude,
        "longitude": property.longitude
      } : undefined,
      "numberOfRooms": property.bedrooms || 0,
      "numberOfBedrooms": property.bedrooms || 0,
      "numberOfBathroomsTotal": property.bathrooms || 0,
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": property.useful_area || property.square_feet || 0,
        "unitCode": "MTK",
        "unitText": "m²"
      },
      "accommodationCategory": propertyTypeLabel,
      "yearBuilt": property.year_built,
      "amenityFeature": (property.amenities || []).slice(0, 10).map(amenity => ({
        "@type": "LocationFeatureSpecification",
        "name": amenity
      })),
      "offers": {
        "@type": "Offer",
        "price": property.price || 0,
        "priceCurrency": property.currency || "EUR",
        "availability": property.availability_status === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "priceValidUntil": new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
        "itemCondition": "https://schema.org/UsedCondition",
        "seller": {
          "@type": "RealEstateAgent",
          "name": "ZuGruppe",
          "url": "https://zugruppe.com"
        }
      }
    };

    // Add breadcrumb structured data
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://zugruppe.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": propertyTypeLabel,
          "item": `https://zugruppe.com/imoveis/${propertyTypeSlug}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": property.city,
          "item": `https://zugruppe.com/imoveis/${citySlug}`
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": property.title,
          "item": `https://zugruppe.com/${urlSlug}`
        }
      ]
    };

    // Add organization structured data
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      "name": "ZuGruppe",
      "url": "https://zugruppe.com",
      "logo": "https://zugruppe.com/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+351-XXX-XXX-XXX",
        "contactType": "customer service",
        "areaServed": "PT",
        "availableLanguage": ["pt", "en"]
      }
    };

    const imageGalleryHTML = images.length > 0 ? `
  <!-- Image Gallery -->
  <div class="py-20 bg-gray-50">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-4xl font-bold text-center mb-12">Galeria de Imagens</h2>
      <div class="grid md:grid-cols-3 gap-4">
        ${images.map(img => `
          <div class="aspect-video overflow-hidden rounded-lg shadow-lg">
            <img src="${img}" alt="${property.title}" class="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
          </div>
        `).join('')}
      </div>
    </div>
  </div>` : '';

    const html = `<!DOCTYPE html>
  <html lang="pt" prefix="og: http://ogp.me/ns#">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">

  <!-- Primary Meta Tags -->
  <title>${pageTitle}</title>
  <meta name="title" content="${pageTitle}">
  <meta name="description" content="${pageDescription}">
  <meta name="keywords" content="${keywords}">
  <meta name="author" content="ZuGruppe">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="https://zugruppe.com/${urlSlug}">
  
  <!-- Alternate languages -->
  <link rel="alternate" hreflang="pt" href="https://zugruppe.com/${urlSlug}">
  <link rel="alternate" hreflang="en" href="https://zugruppe.com/en/${urlSlug}">
  <link rel="alternate" hreflang="x-default" href="https://zugruppe.com/${urlSlug}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_PT">
  <meta property="og:site_name" content="ZuGruppe">
  <meta property="og:url" content="https://zugruppe.com/${urlSlug}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDescription}">
  <meta property="og:image" content="${images[0] || 'https://zugruppe.com/og-image.jpg'}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${property.title}">
  ${images.slice(0, 5).map(img => `<meta property="og:image" content="${img}">`).join('\n  ')}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ZuGruppe">
  <meta name="twitter:creator" content="@ZuGruppe">
  <meta name="twitter:url" content="https://zugruppe.com/${urlSlug}">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDescription}">
  <meta name="twitter:image" content="${images[0] || 'https://zugruppe.com/og-image.jpg'}">
  <meta name="twitter:image:alt" content="${property.title}">

  <!-- Rich Structured Data - RealEstateListing -->
  <script type="application/ld+json">
  ${JSON.stringify(structuredData, null, 2)}
  </script>

  <!-- Breadcrumb Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(breadcrumbData, null, 2)}
  </script>

  <!-- Organization Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(organizationData, null, 2)}
  </script>

  <!-- Preconnect to external domains for performance -->
  <link rel="preconnect" href="https://cdn.tailwindcss.com">
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">

  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="https://zugruppe.com/favicon.ico">
  <link rel="apple-touch-icon" href="https://zugruppe.com/apple-touch-icon.png">

  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Google Analytics placeholder -->
  <!-- Add your GA4 tracking code here -->

  </head>
<body class="bg-gray-50">
  <!-- Hero Section -->
  <div class="relative h-screen">
    <img src="${images[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600'}" alt="${landingPageData.property.title}" 
         class="absolute inset-0 w-full h-full object-cover" />
    <div class="absolute inset-0 bg-black bg-opacity-50"></div>
    <div class="relative h-full flex items-center justify-center text-center text-white px-4">
      <div class="max-w-4xl">
        <h1 class="text-5xl md:text-7xl font-bold mb-4">${landingPageData.headline}</h1>
        <p class="text-xl md:text-2xl mb-8">${landingPageData.subheadline}</p>
        <p class="text-lg mb-8">${landingPageData.hero_text}</p>
        <div class="flex gap-4 justify-center">
          <a href="#contact" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold">
            ${landingPageData.cta_primary}
          </a>
          <a href="#details" class="bg-white text-gray-900 px-8 py-3 rounded-lg text-lg font-semibold">
            ${landingPageData.cta_secondary}
          </a>
        </div>
      </div>
    </div>
  </div>

${imageGalleryHTML}

  <!-- Features -->
  <div class="py-20 bg-white">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-4xl font-bold text-center mb-12">Características Principais</h2>
      <div class="grid md:grid-cols-3 gap-8">
        ${landingPageData.features.map(f => `
          <div class="text-center">
            <div class="text-6xl mb-4">✓</div>
            <p class="text-lg">${f}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- About -->
  <div class="py-20 bg-gray-50">
    <div class="max-w-4xl mx-auto px-4">
      <h2 class="text-4xl font-bold mb-8">Sobre o Imóvel</h2>
      <p class="text-lg leading-relaxed mb-8">${landingPageData.about_section}</p>
      <div class="grid md:grid-cols-3 gap-4">
        ${landingPageData.why_choose.map(reason => `
          <div class="bg-white p-6 rounded-lg shadow-sm">
            <p class="font-semibold">${reason}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Contact Form -->
  <div id="contact" class="py-20 bg-white">
    <div class="max-w-2xl mx-auto px-4">
      <h2 class="text-4xl font-bold text-center mb-12">Agende uma Visita</h2>
      <form class="space-y-4">
        <input type="text" placeholder="Nome" class="w-full px-4 py-3 border rounded-lg" required />
        <input type="email" placeholder="Email" class="w-full px-4 py-3 border rounded-lg" required />
        <input type="tel" placeholder="Telefone" class="w-full px-4 py-3 border rounded-lg" required />
        <textarea placeholder="Mensagem" rows="4" class="w-full px-4 py-3 border rounded-lg"></textarea>
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold">
          Enviar Pedido
        </button>
      </form>
    </div>
  </div>

  <!-- Footer -->
  <footer class="bg-gray-900 text-white py-12 text-center">
    <p>&copy; 2024 ZuGruppe. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${urlSlug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show success with URL details
    toast.success(`Landing page exportada com SEO otimizado!`, {
      description: `URL sugerido: /${urlSlug}`,
      duration: 5000
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Selecionar Imóvel</Label>
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um imóvel..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title} - {p.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button 
            onClick={generateLandingPage} 
            disabled={generating || !selectedProperty}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A gerar...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Gerar Landing Page
              </>
            )}
          </Button>
        </div>
      </div>

      {landingPageData && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <TrendingUp className="w-4 h-4" />
              Configurações SEO
            </div>
            <div>
              <Label className="text-xs">Meta Título (máx 60 caracteres)</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Ex: Apartamento T3 em Lisboa | ZuGruppe"
                maxLength={60}
              />
              <p className="text-xs text-slate-500 mt-1">
                {metaTitle.length}/60 caracteres
              </p>
            </div>
            <div>
              <Label className="text-xs">Meta Descrição (máx 160 caracteres)</Label>
              <Textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Ex: Descubra este incrível apartamento T3 em Lisboa com vista para o Tejo..."
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-1">
                {metaDescription.length}/160 caracteres
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {landingPageData && (
        <Card>
          <CardHeader>
            <CardTitle>Landing Page Gerada</CardTitle>
            <CardDescription>Conteúdo otimizado para SEO e pronto para publicação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <Label className="text-xs text-green-700 font-semibold">✓ Meta Tags Otimizadas</Label>
                <p className="text-xs text-slate-600 mt-1">Título, descrição e keywords otimizados para SEO</p>
              </div>
              <div>
                <Label className="text-xs text-green-700 font-semibold">✓ Schema.org Rico</Label>
                <p className="text-xs text-slate-600 mt-1">RealEstateListing + Breadcrumb + Organization</p>
              </div>
              <div>
                <Label className="text-xs text-green-700 font-semibold">✓ Open Graph + Twitter Card</Label>
                <p className="text-xs text-slate-600 mt-1">Múltiplas imagens e dados completos</p>
              </div>
              <div>
                <Label className="text-xs text-green-700 font-semibold">✓ URL SEO-Friendly</Label>
                <p className="text-xs text-slate-600 mt-1 font-mono break-all">
                  /{(() => {
                    const propertyTypeSlug = landingPageData.property.property_type.toLowerCase();
                    const citySlug = landingPageData.property.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                    const bedroomsSlug = landingPageData.property.bedrooms ? `-t${landingPageData.property.bedrooms}` : '';
                    const listingAction = landingPageData.property.listing_type === 'sale' ? 'venda' : 'arrendamento';
                    const refSlug = landingPageData.property.ref_id ? `-${landingPageData.property.ref_id.toLowerCase()}` : '';
                    return `${propertyTypeSlug}-${citySlug}${bedroomsSlug}-${listingAction}${refSlug}`;
                  })()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-500">Título Principal</Label>
              <p className="text-2xl font-bold">{landingPageData.headline}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-500">Subtítulo</Label>
              <p className="text-lg">{landingPageData.subheadline}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-500">Características ({landingPageData.features.length})</Label>
              <div className="flex flex-wrap gap-2">
                {landingPageData.features.map((f, i) => (
                  <Badge key={i} variant="secondary">{f}</Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setPreviewOpen(true)} className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Pré-visualizar
              </Button>
              <Button onClick={exportHTML} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Exportar HTML
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Landing Page</DialogTitle>
          </DialogHeader>
          {landingPageData && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg">
                <h1 className="text-4xl font-bold mb-2">{landingPageData.headline}</h1>
                <p className="text-xl mb-4">{landingPageData.subheadline}</p>
                <p>{landingPageData.hero_text}</p>
              </div>

              {landingPageData.property.images?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Galeria de Imagens ({landingPageData.property.images.length})</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {landingPageData.property.images.map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt={`${landingPageData.property.title} - ${i+1}`}
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold mb-2">Características</h3>
                <div className="grid grid-cols-2 gap-2">
                  {landingPageData.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✓</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Sobre</h3>
                <p className="text-sm">{landingPageData.about_section}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Email Campaign Creator
function EmailCampaignCreator() {
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [filters, setFilters] = useState({
    listing_type: "all",
    property_type: "all",
    price_min: "",
    price_max: "",
    cities: []
  });
  const [message, setMessage] = useState("");
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [sending, setSending] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['activeProperties'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' })
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['buyerProfiles'],
    queryFn: () => base44.entities.BuyerProfile.list()
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const matchingProfiles = profiles.filter(profile => {
    if (filters.listing_type !== "all" && profile.listing_type !== filters.listing_type) return false;
    if (filters.property_type !== "all" && !profile.property_types?.includes(filters.property_type)) return false;
    if (filters.cities.length > 0 && !filters.cities.some(c => profile.locations?.includes(c))) return false;
    if (filters.price_min && profile.budget_max < Number(filters.price_min)) return false;
    if (filters.price_max && profile.budget_min > Number(filters.price_max)) return false;
    return true;
  });

  const matchingLeads = opportunities.filter(opp => {
    if (filters.listing_type === "sale" && opp.lead_type !== "comprador") return false;
    if (filters.listing_type === "rent" && opp.lead_type !== "comprador") return false;
    return opp.buyer_email && opp.status !== "lost";
  });

  const totalRecipients = matchingProfiles.length + matchingLeads.length;

  const generateEmailContent = async () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos um imóvel");
      return;
    }

    setSending(true);
    try {
      const propertyDetails = selectedProperties.map(id => {
        const p = properties.find(prop => prop.id === id);
        return `- ${p.title} | ${p.city} | €${p.price?.toLocaleString()} | ${p.bedrooms}T${p.bathrooms} | ${p.useful_area}m²`;
      }).join('\n');

      const emailContent = await base44.integrations.Core.InvokeLLM({
        prompt: `Cria um email de newsletter/campanha de imóveis profissional:

IMÓVEIS A PROMOVER:
${propertyDetails}

CONTEXTO:
- Nome da campanha: ${campaignName || 'Newsletter'}
- Filtros aplicados: ${JSON.stringify(filters)}
- Total de destinatários: ${totalRecipients}

INSTRUÇÕES:
1. Criar assunto do email cativante (se não fornecido: "${subject}")
2. Saudação personalizada
3. Introdução breve e profissional
4. Apresentar cada imóvel de forma atrativa com detalhes chave
5. Call-to-action para agendar visitas
6. Assinatura profissional

Retorna um objeto JSON:
{
  "subject": "Assunto do email",
  "body": "Corpo do email em HTML simples"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        }
      });

      setSubject(emailContent.subject);
      setMessage(emailContent.body);
      toast.success("Conteúdo de email gerado!");
    } catch (error) {
      toast.error("Erro ao gerar email");
      console.error(error);
    }
    setSending(false);
  };

  const sendCampaign = async () => {
    if (!subject || !message || totalRecipients === 0) {
      toast.error("Preencha todos os campos e tenha destinatários");
      return;
    }

    setSending(true);
    try {
      const recipients = [
        ...matchingProfiles.map(p => p.buyer_email),
        ...matchingLeads.map(l => l.buyer_email)
      ].filter((email, index, self) => self.indexOf(email) === index);

      let sent = 0;
      for (const email of recipients) {
        try {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject,
            body: message
          });
          sent++;
        } catch (e) {
          console.error(`Erro ao enviar para ${email}:`, e);
        }
      }

      toast.success(`Campanha enviada para ${sent} destinatários!`);
      
      // Log campaign (optional - try/catch to avoid breaking if entity doesn't exist)
      try {
        await base44.entities.MarketingCampaign.create({
          name: campaignName || `Campanha ${new Date().toLocaleDateString()}`,
          campaign_type: 'email',
          objective: 'property_promotion',
          status: 'completed',
          target_audience: {
            segment_type: 'custom',
            custom_filters: filters
          },
          email_config: {
            subject,
            content: message
          },
          metrics: {
            emails_sent: sent,
            leads: 0
          },
          properties: selectedProperties
        });
      } catch (e) {
        console.warn('Erro ao registar campanha:', e);
      }

      // Reset form
      setCampaignName("");
      setSubject("");
      setMessage("");
      setSelectedProperties([]);
    } catch (error) {
      toast.error("Erro ao enviar campanha");
      console.error(error);
    }
    setSending(false);
  };

  const cities = [...new Set(properties.map(p => p.city))].sort();

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Nome da Campanha</Label>
          <Input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Ex: Newsletter Janeiro 2024"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Critérios de Segmentação</CardTitle>
          <CardDescription>Defina o público-alvo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Negócio</Label>
              <Select value={filters.listing_type} onValueChange={(v) => setFilters({...filters, listing_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="rent">Arrendamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Imóvel</Label>
              <Select value={filters.property_type} onValueChange={(v) => setFilters({...filters, property_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="house">Moradia</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Preço Mínimo</Label>
              <Input
                type="number"
                value={filters.price_min}
                onChange={(e) => setFilters({...filters, price_min: e.target.value})}
                placeholder="Ex: 100000"
              />
            </div>

            <div>
              <Label>Preço Máximo</Label>
              <Input
                type="number"
                value={filters.price_max}
                onChange={(e) => setFilters({...filters, price_max: e.target.value})}
                placeholder="Ex: 500000"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Destinatários correspondentes:</span>
            </div>
            <Badge className="bg-blue-600 text-white text-lg px-4 py-1">
              {totalRecipients}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label>Selecionar Imóveis para Promover</Label>
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
          {properties.slice(0, 20).map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <Checkbox
                checked={selectedProperties.includes(p.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedProperties([...selectedProperties, p.id]);
                  } else {
                    setSelectedProperties(selectedProperties.filter(id => id !== p.id));
                  }
                }}
              />
              <span className="text-sm">{p.title} - {p.city} - €{p.price?.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {selectedProperties.length} imóveis selecionados
        </p>
      </div>

      <Button
        onClick={generateEmailContent}
        disabled={sending || selectedProperties.length === 0}
        variant="outline"
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Gerar Conteúdo com IA
      </Button>

      <div>
        <Label>Assunto do Email</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Novos Imóveis Disponíveis!"
        />
      </div>

      <div>
        <Label>Mensagem</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={10}
          placeholder="Conteúdo do email..."
        />
      </div>

      <Button
        onClick={sendCampaign}
        disabled={sending || !subject || !message || totalRecipients === 0}
        className="w-full"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            A enviar...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Enviar Campanha ({totalRecipients} destinatários)
          </>
        )}
      </Button>
    </div>
  );
}

// Main Marketing Hub
export default function MarketingHub() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <div>
            <CardTitle>Hub de Marketing</CardTitle>
            <CardDescription>
              Ferramentas integradas para promover os seus imóveis
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="social" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="social">
              <Share2 className="w-4 h-4 mr-2" />
              Redes Sociais
            </TabsTrigger>
            <TabsTrigger value="landing">
              <FileText className="w-4 h-4 mr-2" />
              Landing Pages
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Campanhas Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="social" className="mt-6">
            <SocialMediaGenerator />
          </TabsContent>

          <TabsContent value="landing" className="mt-6">
            <LandingPageGenerator />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <EmailCampaignCreator />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}