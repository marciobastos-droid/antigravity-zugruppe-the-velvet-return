import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";

export default function CreateLandingPageDialog({ open, onOpenChange, campaigns }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    title: "",
    slug: "",
    campaign_id: "",
    hero_headline: "",
    hero_subheadline: "",
    hero_cta_text: "Saber Mais",
    hero_background: "",
    contact_form_enabled: true
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const campaign = campaigns.find(c => c.id === formData.campaign_id);
    
    const landingPageData = {
      title: formData.title,
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      campaign_id: formData.campaign_id || undefined,
      campaign_name: campaign?.name || undefined,
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