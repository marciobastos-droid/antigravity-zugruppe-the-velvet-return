import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Home } from "lucide-react";

export default function CreateLandingPageDialog({ open, onOpenChange, campaigns }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    title: "",
    slug: "",
    campaign_id: "",
    property_id: "",
    hero_headline: "",
    hero_subheadline: "",
    hero_cta_text: "Saber Mais",
    hero_background: "",
    contact_form_enabled: true
  });

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LandingPage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success('Landing page criada com sucesso!');
      onOpenChange(false);
      setFormData({
        title: "",
        slug: "",
        campaign_id: "",
        property_id: "",
        hero_headline: "",
        hero_subheadline: "",
        hero_cta_text: "Saber Mais",
        hero_background: "",
        contact_form_enabled: true
      });
    },
    onError: (error) => {
      toast.error('Erro ao criar landing page: ' + error.message);
    }
  });

  // Auto-fill from property
  const handlePropertySelect = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      const bedroomText = property.bedrooms > 0 ? `T${property.bedrooms}` : '';
      const typeLabels = {
        apartment: "Apartamento",
        house: "Moradia",
        land: "Terreno",
        building: "Prédio",
        farm: "Quinta",
        store: "Loja",
        warehouse: "Armazém",
        office: "Escritório"
      };
      const typeText = typeLabels[property.property_type] || property.property_type;
      
      setFormData(prev => ({
        ...prev,
        property_id: propertyId,
        title: property.title || `${bedroomText} ${typeText} em ${property.city}`,
        slug: prev.slug || generateSlug(property.title || `${bedroomText}-${typeText}-${property.city}`),
        hero_headline: `${bedroomText} ${typeText} em ${property.city}`,
        hero_subheadline: property.description ? 
          property.description.substring(0, 150) + (property.description.length > 150 ? '...' : '') : 
          `${property.useful_area || property.square_feet || 0}m² | €${property.price?.toLocaleString()}`,
        hero_background: property.images?.[0] || ""
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const campaign = campaigns.find(c => c.id === formData.campaign_id);
    
    const selectedProperty = formData.property_id ? properties.find(p => p.id === formData.property_id) : null;
    
    const landingPageData = {
      title: formData.title,
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      campaign_id: formData.campaign_id || undefined,
      campaign_name: campaign?.name || undefined,
      property_id: formData.property_id || undefined,
      property_title: selectedProperty?.title || undefined,
      property_ref_id: selectedProperty?.ref_id || undefined,
      status: 'draft',
      content: {
        hero: {
          headline: formData.hero_headline,
          subheadline: formData.hero_subheadline,
          background_image: formData.hero_background || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600",
          cta_text: formData.hero_cta_text,
          cta_link: "#contacto"
        },
        sections: [],
        contact_form: {
          enabled: formData.contact_form_enabled,
          title: "Entre em Contacto",
          fields: ["name", "email", "phone", "message"]
        }
      },
      theme: {
        primary_color: "#3b82f6",
        secondary_color: "#1e40af",
        font_family: "Inter"
      },
      seo: {
        meta_title: formData.title,
        meta_description: formData.hero_subheadline
      },
      analytics: {
        views: 0,
        unique_visitors: 0,
        conversions: 0,
        conversion_rate: 0
      }
    };

    createMutation.mutate(landingPageData);
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Landing Page</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Título da Landing Page *</Label>
              <Input
                required
                value={formData.title}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    title: e.target.value,
                    slug: formData.slug || generateSlug(e.target.value)
                  });
                }}
                placeholder="Ex: Promoção de Verão 2025"
              />
            </div>

            <div className="col-span-2">
              <Label>URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{window.location.origin}/lp/</span>
                <Input
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                  })}
                  placeholder="promocao-verao-2025"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Apenas letras minúsculas, números e hífens
              </p>
            </div>

            <div className="col-span-2">
              <Label>Imóvel (Opcional)</Label>
              <Select
                value={formData.property_id}
                onValueChange={handlePropertySelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar imóvel..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        <span className="truncate">
                          {property.ref_id && `${property.ref_id} - `}
                          {property.title || `${property.property_type} em ${property.city}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Selecione um imóvel para pré-preencher os dados da landing page
              </p>
            </div>

            <div className="col-span-2">
              <Label>Campanha Associada (Opcional)</Label>
              <Select
                value={formData.campaign_id}
                onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar campanha..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 pt-4 border-t">
              <h4 className="font-semibold mb-3">Secção Hero</h4>
            </div>

            <div className="col-span-2">
              <Label>Headline Principal *</Label>
              <Input
                required
                value={formData.hero_headline}
                onChange={(e) => setFormData({ ...formData, hero_headline: e.target.value })}
                placeholder="Encontre a Casa dos Seus Sonhos"
              />
            </div>

            <div className="col-span-2">
              <Label>Sub-headline</Label>
              <Textarea
                value={formData.hero_subheadline}
                onChange={(e) => setFormData({ ...formData, hero_subheadline: e.target.value })}
                placeholder="Imóveis exclusivos com as melhores condições do mercado"
                rows={2}
              />
            </div>

            <div>
              <Label>Texto do Botão</Label>
              <Input
                value={formData.hero_cta_text}
                onChange={(e) => setFormData({ ...formData, hero_cta_text: e.target.value })}
                placeholder="Saber Mais"
              />
            </div>

            <div>
              <Label>Imagem de Fundo (URL)</Label>
              <Input
                value={formData.hero_background}
                onChange={(e) => setFormData({ ...formData, hero_background: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Landing Page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}