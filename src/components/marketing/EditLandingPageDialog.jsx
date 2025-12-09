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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function EditLandingPageDialog({ page, open, onOpenChange, campaigns }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    title: page.title || "",
    slug: page.slug || "",
    campaign_id: page.campaign_id || "",
    hero_headline: page.content?.hero?.headline || "",
    hero_subheadline: page.content?.hero?.subheadline || "",
    hero_cta_text: page.content?.hero?.cta_text || "Saber Mais",
    hero_background: page.content?.hero?.background_image || "",
    contact_form_enabled: page.content?.contact_form?.enabled !== false,
    primary_color: page.theme?.primary_color || "#3b82f6",
    secondary_color: page.theme?.secondary_color || "#1e40af"
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.LandingPage.update(page.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success('Landing page atualizada!');
      onOpenChange(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const campaign = campaigns.find(c => c.id === formData.campaign_id);
    
    const updatedData = {
      title: formData.title,
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      campaign_id: formData.campaign_id || undefined,
      campaign_name: campaign?.name || undefined,
      content: {
        ...page.content,
        hero: {
          headline: formData.hero_headline,
          subheadline: formData.hero_subheadline,
          background_image: formData.hero_background,
          cta_text: formData.hero_cta_text,
          cta_link: "#contacto"
        },
        contact_form: {
          ...page.content?.contact_form,
          enabled: formData.contact_form_enabled
        }
      },
      theme: {
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        font_family: page.theme?.font_family || "Inter"
      }
    };

    updateMutation.mutate(updatedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Landing Page</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div>
                <Label>Título *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
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
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Campanha Associada</Label>
                <Select
                  value={formData.campaign_id}
                  onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
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

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Hero Section</h4>
                <div className="space-y-3">
                  <div>
                    <Label>Headline *</Label>
                    <Input
                      required
                      value={formData.hero_headline}
                      onChange={(e) => setFormData({ ...formData, hero_headline: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Sub-headline</Label>
                    <Textarea
                      value={formData.hero_subheadline}
                      onChange={(e) => setFormData({ ...formData, hero_subheadline: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Texto do Botão</Label>
                    <Input
                      value={formData.hero_cta_text}
                      onChange={(e) => setFormData({ ...formData, hero_cta_text: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="design" className="space-y-4 mt-4">
              <div>
                <Label>Imagem de Fundo Hero (URL)</Label>
                <Input
                  value={formData.hero_background}
                  onChange={(e) => setFormData({ ...formData, hero_background: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div>
                  <Label>Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <p className="text-sm text-slate-600">
                Configurações de SEO e meta tags (em breve)
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}