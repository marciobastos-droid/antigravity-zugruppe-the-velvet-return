import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon, Sparkles, ExternalLink, Home, Building2, MapPin, Settings, ChevronDown, ChevronRight, Languages } from "lucide-react";
import PropertyTagger from "../property/PropertyTagger";
import AIPropertyTools from "../property/AIPropertyTools";
import LocationAutocomplete from "../property/LocationAutocomplete";
import ValidatedInput from "../property/ValidatedInput";
import PublicationManager from "../property/PublicationManager";
import ImageManager from "../property/ImageManager";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuditLog } from "../audit/useAuditLog";

export default function EditPropertyDialog({ property, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const [uploading, setUploading] = useState(false);
  const [improvingDescription, setImprovingDescription] = useState(false);
  const [improvingTitle, setImprovingTitle] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("pt");
  const [translating, setTranslating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    property_type: "apartment",
    listing_type: "sale",
    price: "",
    currency: "EUR",
    country: "Portugal",
    bedrooms: "",
    bathrooms: "",
    square_feet: "",
    gross_area: "",
    useful_area: "",
    balcony_area: "",
    garage_area: "",
    floor: "",
    front_count: "",
    finishes: "",
    energy_certificate: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    year_built: "",
    year_renovated: "",
    garage: "",
    sun_exposure: "",
    construction_date: "",
    completion_date: "",
    images: [],
    amenities: [],
    status: "active",
    visibility: "public",
    assigned_consultant: "",
    assigned_consultant_name: "",
    assigned_consultant_phone: "",
    assigned_consultant_photo: "",
    internal_notes: "",
    tags: [],
    development_id: "",
    development_name: "",
    unit_number: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    owner_nif: "",
    published_portals: [],
    published_pages: ["zugruppe"],
    publication_config: {
      auto_publish: false,
      exclude_from_feeds: false
    },
    translations: {
      en: { title: "", description: "", amenities: [] },
      es: { title: "", description: "", amenities: [] },
      fr: { title: "", description: "", amenities: [] },
      de: { title: "", description: "", amenities: [] }
    }
  });

  const { data: developments = [] } = useQuery({
    queryKey: ['developments'],
    queryFn: () => base44.entities.Development.list('name')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      // Mostrar todos os utilizadores, ordenados por nome
      return allUsers.sort((a, b) => {
        const nameA = a.display_name || a.full_name || a.email;
        const nameB = b.display_name || b.full_name || b.email;
        return nameA.localeCompare(nameB);
      });
    }
  });

  // Fetch existing properties for autocomplete
  const { data: existingProperties = [] } = useQuery({
    queryKey: ['propertiesForAutocomplete'],
    queryFn: () => base44.entities.Property.list('-created_date', 500)
  });

  const existingCities = React.useMemo(() => 
    [...new Set(existingProperties.map(p => p.city).filter(Boolean))].sort()
  , [existingProperties]);

  const existingStates = React.useMemo(() => 
    [...new Set(existingProperties.map(p => p.state).filter(Boolean))].sort()
  , [existingProperties]);

  // Collapsible sections state
  const [openSections, setOpenSections] = useState({
    basic: true,
    details: true,
    location: true,
    media: true,
    management: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ section, title, icon: Icon }) => (
    <CollapsibleTrigger asChild>
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          {Icon && <Icon className="w-5 h-5 text-slate-600" />}
          {title}
        </div>
        {openSections[section] ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
    </CollapsibleTrigger>
  );

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || "",
        description: property.description || "",
        property_type: property.property_type || "apartment",
        listing_type: property.listing_type || "sale",
        price: property.price || "",
        currency: property.currency || "EUR",
        country: property.country || "Portugal",
        bedrooms: property.bedrooms || "",
        bathrooms: property.bathrooms || "",
        square_feet: property.square_feet || "",
        gross_area: property.gross_area || "",
        useful_area: property.useful_area || "",
        balcony_area: property.balcony_area || "",
        garage_area: property.garage_area || "",
        floor: property.floor || "",
        front_count: property.front_count || "",
        finishes: property.finishes || "",
        energy_certificate: property.energy_certificate || "",
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        zip_code: property.zip_code || "",
        year_built: property.year_built || "",
        year_renovated: property.year_renovated || "",
        garage: property.garage || "",
        sun_exposure: property.sun_exposure || "",
        construction_date: property.construction_date || "",
        completion_date: property.completion_date || "",
        images: property.images || [],
        amenities: property.amenities || [],
        status: property.status || "active",
        visibility: property.visibility || "public",
        assigned_consultant: property.assigned_consultant || "",
        assigned_consultant_name: property.assigned_consultant_name || "",
        assigned_consultant_phone: property.assigned_consultant_phone || "",
        assigned_consultant_photo: property.assigned_consultant_photo || "",
        internal_notes: property.internal_notes || "",
        tags: property.tags || [],
        development_id: property.development_id || "",
        development_name: property.development_name || "",
        unit_number: property.unit_number || "",
        owner_name: property.owner_name || "",
        owner_email: property.owner_email || "",
        owner_phone: property.owner_phone || "",
        owner_nif: property.owner_nif || "",
        published_portals: property.published_portals || [],
        published_pages: property.published_pages || ["zugruppe"],
        publication_config: property.publication_config || {
          auto_publish: false,
          exclude_from_feeds: false
        },
        translations: property.translations || {
          en: { title: "", description: "", amenities: [] },
          es: { title: "", description: "", amenities: [] },
          fr: { title: "", description: "", amenities: [] },
          de: { title: "", description: "", amenities: [] }
        }
      });
    }
  }, [property]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Property.update(property.id, data),
    onSuccess: async (result, variables) => {
      toast.success("Imóvel atualizado com sucesso!");
      
      // Log audit action
      await logAction('update', 'Property', property.id, property.title, {
        fields_changed: Object.keys(variables)
      });
      
      queryClient.invalidateQueries({ queryKey: ['property', property.id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar imóvel");
    }
  });

  const handleImproveDescription = async () => {
    if (!formData.title || !formData.price) {
      toast.error("Preencha o título e preço primeiro");
      return;
    }

    setImprovingDescription(true);

    try {
      const propertyDetails = `
Título: ${formData.title}
Tipo: ${formData.property_type}
Negócio: ${formData.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Preço: €${Number(formData.price).toLocaleString()}
${formData.bedrooms ? `Quartos: ${formData.bedrooms}` : ''}
${formData.bathrooms ? `WCs: ${formData.bathrooms}` : ''}
${formData.square_feet ? `Área: ${formData.square_feet}m²` : ''}
${formData.useful_area ? `Área Útil: ${formData.useful_area}m²` : ''}
Localização: ${formData.city}, ${formData.state}
${formData.amenities?.length > 0 ? `Comodidades: ${formData.amenities.join(', ')}` : ''}
${formData.finishes ? `Acabamentos: ${formData.finishes}` : ''}
${formData.energy_certificate ? `Certificado Energético: ${formData.energy_certificate}` : ''}
${formData.year_built ? `Ano de Construção: ${formData.year_built}` : ''}
`;

      const improvedDescription = await base44.integrations.Core.InvokeLLM({
        prompt: `És um copywriter especialista em imobiliário português.

MISSÃO: Melhorar a descrição de um imóvel para ser profissional, atrativa e otimizada.

DETALHES DO IMÓVEL:
${propertyDetails}

${formData.description ? `DESCRIÇÃO ATUAL:\n${formData.description}\n\n` : ''}

INSTRUÇÕES:
1. Cria uma descrição COMPLETA e PROFISSIONAL (200-300 palavras)
2. Estrutura clara com parágrafos curtos
3. Destaca pontos fortes e diferenciais
4. Linguagem persuasiva mas honesta
5. Tom profissional e elegante
6. Foca em benefícios para o comprador/inquilino
7. Menciona localização e acessos se relevante
8. Inclui call-to-action no final

${formData.description ? 'IMPORTANTE: Mantém os factos da descrição atual mas melhora a escrita e estrutura.' : 'Cria uma descrição completa baseada nos dados fornecidos.'}

Retorna APENAS a descrição melhorada, sem introduções ou comentários.`,
      });

      setFormData(prev => ({ ...prev, description: improvedDescription }));
      toast.success("Descrição melhorada com IA!");
    } catch (error) {
      toast.error("Erro ao melhorar descrição");
      console.error(error);
    }

    setImprovingDescription(false);
  };

  const handleAutoTranslate = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Preencha o título e descrição em Português primeiro");
      return;
    }

    setTranslating(true);
    try {
      const { data: translations } = await base44.functions.invoke('translatePropertyContent', {
        title: formData.title,
        description: formData.description,
        amenities: formData.amenities
      });

      setFormData(prev => ({
        ...prev,
        translations: translations
      }));

      toast.success("Traduções geradas com sucesso!");
    } catch (error) {
      toast.error("Erro ao traduzir conteúdo: " + (error.message || ""));
    }
    setTranslating(false);
  };

  const handleImproveTitle = async () => {
    if (!formData.property_type || !formData.city) {
      toast.error("Preencha o tipo de imóvel e cidade primeiro");
      return;
    }

    setImprovingTitle(true);

    try {
      const propertyDetails = `
Tipo: ${formData.property_type}
Negócio: ${formData.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
${formData.bedrooms ? `Quartos: T${formData.bedrooms}` : ''}
${formData.useful_area || formData.square_feet ? `Área: ${formData.useful_area || formData.square_feet}m²` : ''}
Localização: ${formData.city}, ${formData.state}
${formData.development_name ? `Empreendimento: ${formData.development_name}` : ''}
${formData.energy_certificate ? `Cert. Energético: ${formData.energy_certificate}` : ''}
${formData.amenities?.length > 0 ? `Destaques: ${formData.amenities.slice(0, 3).join(', ')}` : ''}
`;

      const improvedTitle = await base44.integrations.Core.InvokeLLM({
        prompt: `És um especialista em marketing imobiliário português.

MISSÃO: Criar um título CURTO, ATRATIVO e PROFISSIONAL para um imóvel.

DETALHES DO IMÓVEL:
${propertyDetails}

INSTRUÇÕES:
1. Máximo 60-80 caracteres
2. Incluir tipologia (ex: T2, T3, Moradia)
3. Incluir localização principal
4. Destacar 1-2 características únicas se houver
5. Tom profissional e direto
6. SEM emojis, SEM excesso de adjetivos
7. Formato: "[Tipo] [Tipologia] em [Localização] [+ característica opcional]"

EXEMPLOS:
- "Apartamento T2 Renovado no Centro de Lisboa"
- "Moradia T4 com Piscina em Cascais"
- "Terreno Urbano 500m² na Comporta"
- "Escritório Moderno 120m² no Porto"

Retorna APENAS o título melhorado, nada mais.`,
      });

      // Remover aspas do início e fim se existirem
      const cleanedTitle = improvedTitle.trim().replace(/^["']|["']$/g, '');
      setFormData(prev => ({ ...prev, title: cleanedTitle }));
      toast.success("Título melhorado com IA!");
    } catch (error) {
      toast.error("Erro ao melhorar título");
      console.error(error);
    }

    setImprovingTitle(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      
      toast.success(`${files.length} imagem${files.length > 1 ? 'ns' : ''} carregada${files.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error("Erro ao carregar imagens");
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleTagsUpdate = React.useCallback((tags) => {
    setFormData(prev => ({ ...prev, tags }));
  }, []);

  // Ref para prevenir loops infinitos
  const updateCountRef = React.useRef(0);
  const lastUpdateRef = React.useRef(Date.now());

  const handlePublicationUpdate = React.useCallback((publicationData) => {
    // Proteção contra loops infinitos
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) {
      updateCountRef.current++;
      if (updateCountRef.current > 5) {
        console.warn('PublicationManager: Loop detectado, ignorando atualização');
        return;
      }
    } else {
      updateCountRef.current = 0;
    }
    lastUpdateRef.current = now;

    setFormData(prev => {
      // Verificar se realmente mudou algo
      const portalsChanged = JSON.stringify(prev.published_portals || []) !== JSON.stringify(publicationData.published_portals || []);
      const pagesChanged = JSON.stringify(prev.published_pages || []) !== JSON.stringify(publicationData.published_pages || []);
      const configChanged = JSON.stringify(prev.publication_config || {}) !== JSON.stringify(publicationData.publication_config || {});
      
      if (!portalsChanged && !pagesChanged && !configChanged) {
        return prev;
      }
      
      return { 
        ...prev, 
        published_portals: publicationData.published_portals || [],
        published_pages: publicationData.published_pages || [],
        publication_config: publicationData.publication_config || { auto_publish: false, exclude_from_feeds: false }
      };
    });
  }, []);

  // Props estáveis para o PublicationManager
  const publicationProps = React.useMemo(() => ({
    published_portals: formData.published_portals || [],
    published_pages: formData.published_pages || [],
    publication_config: formData.publication_config || { auto_publish: false, exclude_from_feeds: false }
  }), [
    JSON.stringify(formData.published_portals || []),
    JSON.stringify(formData.published_pages || []),
    JSON.stringify(formData.publication_config || {})
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      price: formData.price ? Number(formData.price) : 0,
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : 0,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : 0,
      square_feet: formData.square_feet ? Number(formData.square_feet) : 0,
      gross_area: formData.gross_area ? Number(formData.gross_area) : 0,
      useful_area: formData.useful_area ? Number(formData.useful_area) : 0,
      balcony_area: formData.balcony_area ? Number(formData.balcony_area) : 0,
      garage_area: formData.garage_area ? Number(formData.garage_area) : 0,
      floor: formData.floor || undefined,
      front_count: formData.front_count ? Number(formData.front_count) : 0,
      year_built: formData.year_built ? Number(formData.year_built) : undefined,
      year_renovated: formData.year_renovated ? Number(formData.year_renovated) : undefined,
      garage: formData.garage || undefined,
      sun_exposure: formData.sun_exposure || undefined,
      construction_date: formData.construction_date || undefined,
      completion_date: formData.completion_date || undefined,
      development_id: formData.development_id || undefined,
      development_name: formData.development_name || undefined,
      unit_number: formData.unit_number || undefined,
      owner_name: formData.owner_name || undefined,
      owner_email: formData.owner_email || undefined,
      owner_phone: formData.owner_phone || undefined,
      owner_nif: formData.owner_nif || undefined,
      published_portals: formData.published_portals || [],
      published_pages: formData.published_pages || [],
      publication_config: formData.publication_config || { auto_publish: false, exclude_from_feeds: false },
      translations: formData.translations
    };

    updateMutation.mutate(data);
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Editar Imóvel</DialogTitle>
            <div className="flex items-center gap-2">
              {property?.ref_id && (
                <Badge variant="outline" className="text-xs font-mono">
                  REF: {property.ref_id}
                </Badge>
              )}
              {property?.id && (
                <Badge variant="outline" className="text-xs font-mono">
                  ID: {property.id}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="mt-6">
            <ImageManager 
              property={{...property, images: formData.images}}
              onChange={(newImages) => setFormData(prev => ({ ...prev, images: newImages }))}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['property', property.id] });
                queryClient.invalidateQueries({ queryKey: ['properties'] });
              }}
            />
          </TabsContent>

          <TabsContent value="details">
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">

          {/* Source URL - Link de Origem */}
          {property?.source_url && (
            <div className="p-4 bg-slate-50 rounded-lg border">
              <Label className="text-slate-600 mb-2 block">Link de Origem</Label>
              <a 
                href={property.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-sm break-all"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {property.source_url}
              </a>
              {property.external_id && (
                <p className="text-xs text-slate-500 mt-1">ID Externo: {property.external_id}</p>
              )}
            </div>
          )}

          {/* Basic Information */}
          <Collapsible open={openSections.basic} onOpenChange={() => toggleSection('basic')}>
            <SectionHeader section="basic" title="Informação Básica" icon={Home} />
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Título *</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoTranslate}
                        disabled={translating}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        {translating ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            A traduzir...
                          </>
                        ) : (
                          <>
                            <Languages className="w-3 h-3 mr-2" />
                            Traduzir Tudo
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleImproveTitle}
                        disabled={improvingTitle}
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        {improvingTitle ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            A melhorar...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-2" />
                            Melhorar com IA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Language Tabs */}
                    <div className="flex gap-1 border-b">
                      <button
                        type="button"
                        onClick={() => setActiveLanguage("pt")}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                          activeLanguage === "pt"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        🇵🇹 Português
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLanguage("en")}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                          activeLanguage === "en"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        🇬🇧 English
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLanguage("fr")}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                          activeLanguage === "fr"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        🇫🇷 Français
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLanguage("de")}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                          activeLanguage === "de"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        🇩🇪 Deutsch
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLanguage("es")}
                        className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                          activeLanguage === "es"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        🇪🇸 Español
                      </button>
                    </div>

                    {/* Title Input */}
                    {activeLanguage === "pt" ? (
                      <Input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Apartamento T2 no Centro"
                      />
                    ) : (
                      <Input
                        value={formData.translations?.[activeLanguage]?.title || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          translations: {
                            ...formData.translations,
                            [activeLanguage]: {
                              ...formData.translations[activeLanguage],
                              title: e.target.value
                            }
                          }
                        })}
                        placeholder={`Título em ${activeLanguage.toUpperCase()}`}
                      />
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{activeLanguage === "pt" ? formData.title.length : (formData.translations?.[activeLanguage]?.title?.length || 0)}/60</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Moeda</Label>
                  <Select value={formData.currency || "EUR"} onValueChange={(v) => setFormData({...formData, currency: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                      <SelectItem value="USD">$ Dólar (USD)</SelectItem>
                      <SelectItem value="GBP">£ Libra (GBP)</SelectItem>
                      <SelectItem value="AED">د.إ Dirham (AED)</SelectItem>
                      <SelectItem value="AOA">Kz Kwanza (AOA)</SelectItem>
                      <SelectItem value="BRL">R$ Real (BRL)</SelectItem>
                      <SelectItem value="CHF">CHF Franco Suíço</SelectItem>
                      <SelectItem value="CAD">C$ Dólar Canadiano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ValidatedInput
                  id="edit-price"
                  label="Preço"
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="250000"
                  validator="price"
                />

                <div>
                  <Label>Tipo de Imóvel *</Label>
                  <Select value={formData.property_type} onValueChange={(v) => setFormData({...formData, property_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">Moradia</SelectItem>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="condo">Condomínio</SelectItem>
                      <SelectItem value="townhouse">Casa Geminada</SelectItem>
                      <SelectItem value="building">Prédio</SelectItem>
                      <SelectItem value="land">Terreno</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="warehouse">Armazém</SelectItem>
                      <SelectItem value="office">Escritório</SelectItem>
                      <SelectItem value="store">Loja</SelectItem>
                      <SelectItem value="farm">Quinta</SelectItem>
                      <SelectItem value="development">Empreendimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Anúncio *</Label>
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

                <div>
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="sold">Vendido</SelectItem>
                      <SelectItem value="rented">Arrendado</SelectItem>
                      <SelectItem value="off_market">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Consultant & Visibility */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Consultor Responsável</Label>
              <Select 
                value={formData.assigned_consultant} 
                onValueChange={(v) => {
                  const consultant = users.find(u => u.email === v);
                  setFormData({
                    ...formData, 
                    assigned_consultant: v,
                    assigned_consultant_name: consultant?.display_name || consultant?.full_name || "",
                    assigned_consultant_phone: consultant?.phone || "",
                    assigned_consultant_photo: consultant?.photo_url || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um consultor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {users.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.email}>
                      {consultant.display_name || consultant.full_name} ({consultant.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibilidade</Label>
              <Select 
                value={formData.visibility} 
                onValueChange={(v) => setFormData({...formData, visibility: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público (visível a todos)</SelectItem>
                  <SelectItem value="team_only">Apenas Equipa</SelectItem>
                  <SelectItem value="private">Privado (só eu)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Development Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Empreendimento</Label>
              <Select 
                value={formData.development_id} 
                onValueChange={(v) => {
                  const dev = developments.find(d => d.id === v);
                  setFormData({
                    ...formData, 
                    development_id: v,
                    development_name: dev?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um empreendimento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {developments.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name} - {dev.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nº da Fração/Unidade</Label>
              <Input
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                placeholder="Ex: A1, 1º Dto, Lote 5"
                disabled={!formData.development_id}
              />
            </div>
          </div>

          {/* Property Details */}
          <Collapsible open={openSections.details} onOpenChange={() => toggleSection('details')}>
            <SectionHeader section="details" title="Detalhes do Imóvel" icon={Building2} />
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <ValidatedInput
                  id="edit-bedrooms"
                  label="Quartos"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                  placeholder="3"
                  validator="integer"
                />
                <ValidatedInput
                  id="edit-bathrooms"
                  label="Casas de Banho"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                  placeholder="2"
                  validator="integer"
                />
                <ValidatedInput
                  id="edit-square_feet"
                  label="Área (m²)"
                  type="number"
                  value={formData.square_feet}
                  onChange={(e) => setFormData({...formData, square_feet: e.target.value})}
                  placeholder="120"
                  validator="positiveNumber"
                />
                <ValidatedInput
                  id="edit-gross_area"
                  label="Área Bruta (m²)"
                  type="number"
                  value={formData.gross_area}
                  onChange={(e) => setFormData({...formData, gross_area: e.target.value})}
                  placeholder="150"
                  validator="positiveNumber"
                />
                <ValidatedInput
                  id="edit-useful_area"
                  label="Área Útil (m²)"
                  type="number"
                  value={formData.useful_area}
                  onChange={(e) => setFormData({...formData, useful_area: e.target.value})}
                  placeholder="120"
                  validator="positiveNumber"
                />
                <ValidatedInput
                  id="edit-front_count"
                  label="Nº de Frentes"
                  type="number"
                  value={formData.front_count}
                  onChange={(e) => setFormData({...formData, front_count: e.target.value})}
                  placeholder="2"
                  validator="integer"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Piso</Label>
                  <Input
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                    placeholder="Ex: 1, 2, RC, Cave"
                  />
                </div>
                <ValidatedInput
                  id="edit-balcony_area"
                  label="Área Varanda (m²)"
                  type="number"
                  value={formData.balcony_area}
                  onChange={(e) => setFormData({...formData, balcony_area: e.target.value})}
                  placeholder="10"
                  validator="positiveNumber"
                />
                <ValidatedInput
                  id="edit-garage_area"
                  label="Área Garagem (m²)"
                  type="number"
                  value={formData.garage_area}
                  onChange={(e) => setFormData({...formData, garage_area: e.target.value})}
                  placeholder="20"
                  validator="positiveNumber"
                />
              </div>

              {/* Energy Certificate */}
              <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Certificado Energético</Label>
              <Select 
                value={formData.energy_certificate} 
                onValueChange={(v) => setFormData({...formData, energy_certificate: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                  <SelectItem value="isento">Isento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Garagem</Label>
              <Select 
                value={formData.garage} 
                onValueChange={(v) => setFormData({...formData, garage: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem garagem</SelectItem>
                  <SelectItem value="1">1 lugar</SelectItem>
                  <SelectItem value="2">2 lugares</SelectItem>
                  <SelectItem value="3">3 lugares</SelectItem>
                  <SelectItem value="4+">4+ lugares</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Exposição Solar</Label>
              <Select 
                value={formData.sun_exposure} 
                onValueChange={(v) => setFormData({...formData, sun_exposure: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="north">Norte</SelectItem>
                  <SelectItem value="south">Sul</SelectItem>
                  <SelectItem value="east">Nascente</SelectItem>
                  <SelectItem value="west">Poente</SelectItem>
                  <SelectItem value="north_south">Norte/Sul</SelectItem>
                  <SelectItem value="east_west">Nascente/Poente</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

              {/* Description with AI Improvement */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Descrição</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleImproveDescription}
                    disabled={improvingDescription}
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    {improvingDescription ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        A melhorar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-2" />
                        Melhorar com IA
                      </>
                    )}
                  </Button>
                </div>
                
                {activeLanguage === "pt" ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva o imóvel..."
                    rows={6}
                  />
                ) : (
                  <Textarea
                    value={formData.translations?.[activeLanguage]?.description || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        [activeLanguage]: {
                          ...formData.translations[activeLanguage],
                          description: e.target.value
                        }
                      }
                    })}
                    placeholder={`Descrição em ${activeLanguage.toUpperCase()}`}
                    rows={6}
                  />
                )}
                
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{activeLanguage === "pt" ? formData.description.length : (formData.translations?.[activeLanguage]?.description?.length || 0)}/5000</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* AI Property Tagger */}
          <PropertyTagger 
            property={formData}
            onTagsUpdate={handleTagsUpdate}
          />

          {/* AI Property Tools */}
          {property?.id && (
            <AIPropertyTools 
              property={{...property, ...formData}}
              onUpdate={(id, data) => {
                setFormData(prev => ({ ...prev, ...data }));
                return Promise.resolve();
              }}
            />
          )}

          {/* Publication Manager */}
          <PublicationManager
            property={publicationProps}
            onChange={handlePublicationUpdate}
          />

          {/* Location */}
          <Collapsible open={openSections.location} onOpenChange={() => toggleSection('location')}>
            <SectionHeader section="location" title="Localização" icon={MapPin} />
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Morada *</Label>
                  <Input
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua Principal, 123"
                  />
                </div>
                <LocationAutocomplete
                  field="state"
                  label="Distrito"
                  value={formData.state}
                  onChange={(val) => setFormData({...formData, state: val})}
                  placeholder="Lisboa"
                  required
                  existingData={existingStates}
                />
                <LocationAutocomplete
                  field="city"
                  label="Concelho"
                  value={formData.city}
                  onChange={(val) => setFormData({...formData, city: val})}
                  placeholder="Lisboa"
                  required
                  otherFieldValue={formData.state}
                  existingData={existingCities}
                />
                <ValidatedInput
                  id="edit-zip_code"
                  label="Código Postal"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                  placeholder="1000-001"
                  hint="Ex: 1234-567 (PT), 10001 (US)"
                />
                <div>
                  <Label>País *</Label>
                  <Select value={formData.country || "Portugal"} onValueChange={(v) => setFormData({...formData, country: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Portugal">🇵🇹 Portugal</SelectItem>
                      <SelectItem value="Spain">🇪🇸 Espanha</SelectItem>
                      <SelectItem value="France">🇫🇷 França</SelectItem>
                      <SelectItem value="Italy">🇮🇹 Itália</SelectItem>
                      <SelectItem value="United Kingdom">🇬🇧 Reino Unido</SelectItem>
                      <SelectItem value="Germany">🇩🇪 Alemanha</SelectItem>
                      <SelectItem value="United States">🇺🇸 Estados Unidos</SelectItem>
                      <SelectItem value="Canada">🇨🇦 Canadá</SelectItem>
                      <SelectItem value="Brazil">🇧🇷 Brasil</SelectItem>
                      <SelectItem value="United Arab Emirates">🇦🇪 Emirados Árabes</SelectItem>
                      <SelectItem value="Angola">🇦🇴 Angola</SelectItem>
                      <SelectItem value="Mozambique">🇲🇿 Moçambique</SelectItem>
                      <SelectItem value="Cape Verde">🇨🇻 Cabo Verde</SelectItem>
                      <SelectItem value="Switzerland">🇨🇭 Suíça</SelectItem>
                      <SelectItem value="Luxembourg">🇱🇺 Luxemburgo</SelectItem>
                      <SelectItem value="Netherlands">🇳🇱 Holanda</SelectItem>
                      <SelectItem value="Belgium">🇧🇪 Bélgica</SelectItem>
                      <SelectItem value="Greece">🇬🇷 Grécia</SelectItem>
                      <SelectItem value="Turkey">🇹🇷 Turquia</SelectItem>
                      <SelectItem value="Morocco">🇲🇦 Marrocos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </div>
                </CollapsibleContent>
                </Collapsible>

          {/* Management & Notes */}
          <Collapsible open={openSections.management} onOpenChange={() => toggleSection('management')}>
            <SectionHeader section="management" title="Gestão e Notas" icon={Settings} />
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Years & Dates */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ValidatedInput
                  id="edit-year_built"
                  label="Ano de Construção"
                  type="number"
                  value={formData.year_built}
                  onChange={(e) => setFormData({...formData, year_built: e.target.value})}
                  placeholder="2020"
                  validator="year"
                />
                <ValidatedInput
                  id="edit-year_renovated"
                  label="Ano de Renovação"
                  type="number"
                  value={formData.year_renovated}
                  onChange={(e) => setFormData({...formData, year_renovated: e.target.value})}
                  placeholder="2023"
                  validator="year"
                />
                <div>
                  <Label>Data de Construção</Label>
                  <Input
                    type="date"
                    value={formData.construction_date}
                    onChange={(e) => setFormData({...formData, construction_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data de Conclusão</Label>
                  <Input
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) => setFormData({...formData, completion_date: e.target.value})}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <Label>Comodidades (separadas por vírgula)</Label>
                <Input
                  value={formData.amenities.join(", ")}
                  onChange={(e) => setFormData({...formData, amenities: e.target.value.split(",").map(a => a.trim()).filter(Boolean)})}
                  placeholder="Piscina, Garagem, Jardim"
                />
              </div>

              {/* Finishes */}
              <div>
                <Label>Acabamentos</Label>
                <Input
                  value={formData.finishes}
                  onChange={(e) => setFormData({...formData, finishes: e.target.value})}
                  placeholder="Descrição dos acabamentos"
                />
              </div>

              {/* Owner Information */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold text-slate-900">Dados do Proprietário</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Proprietário</Label>
                    <Input
                      value={formData.owner_name}
                      onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label>Email do Proprietário</Label>
                    <Input
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Telefone do Proprietário</Label>
                    <Input
                      value={formData.owner_phone}
                      onChange={(e) => setFormData({...formData, owner_phone: e.target.value})}
                      placeholder="+351 912 345 678"
                    />
                  </div>
                  <div>
                    <Label>NIF do Proprietário</Label>
                    <Input
                      value={formData.owner_nif}
                      onChange={(e) => setFormData({...formData, owner_nif: e.target.value})}
                      placeholder="123456789"
                    />
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <Label>Notas Internas (privadas)</Label>
                <Textarea
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
                  placeholder="Notas privadas sobre o imóvel..."
                  rows={3}
                />
              </div>
              </CollapsibleContent>
              </Collapsible>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    "Guardar Alterações"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}