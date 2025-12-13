import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Edit, Trash2, Eye, Copy, ExternalLink, Sparkles, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function LandingPageBuilder() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPage, setEditingPage] = React.useState(null);
  const [generating, setGenerating] = React.useState(false);

  const [formData, setFormData] = React.useState({
    title: "",
    slug: "",
    meta_title: "",
    meta_description: "",
    keywords: "",
    hero_headline: "",
    hero_subheadline: "",
    hero_image: "",
    cta_text: "Contacte-nos",
    cta_action: "contact",
    property_filters: {},
    campaign_id: "",
    tracking_code: "",
    status: "draft"
  });

  const { data: landingPages = [] } = useQuery({
    queryKey: ['landingPages'],
    queryFn: () => base44.entities.LandingPage.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LandingPage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      setDialogOpen(false);
      resetForm();
      toast.success("Landing page criada!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LandingPage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      setDialogOpen(false);
      resetForm();
      toast.success("Landing page atualizada!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LandingPage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landingPages'] });
      toast.success("Landing page eliminada!");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      meta_title: "",
      meta_description: "",
      keywords: "",
      hero_headline: "",
      hero_subheadline: "",
      hero_image: "",
      cta_text: "Contacte-nos",
      cta_action: "contact",
      property_filters: {},
      campaign_id: "",
      tracking_code: "",
      status: "draft"
    });
    setEditingPage(null);
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setFormData({ ...page });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPage) {
      updateMutation.mutate({ id: editingPage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateWithAI = async () => {
    if (!formData.title) {
      toast.error("Defina o título da campanha primeiro");
      return;
    }

    setGenerating(true);
    try {
      const aiContent = await base44.integrations.Core.InvokeLLM({
        prompt: `Cria conteúdo otimizado para uma landing page imobiliária:

Campanha: ${formData.title}
Objetivo: Conversão máxima de visitantes em leads

Gera:
1. Headline impactante (8-12 palavras, emocional)
2. Subheadline persuasivo (15-20 palavras, benefício claro)
3. Meta title SEO (50-60 caracteres)
4. Meta description SEO (150-160 caracteres)
5. Keywords SEO (10-15 palavras-chave separadas por vírgula)
6. CTA text (2-4 palavras, ação clara)

Tom: Profissional mas acolhedor, focado em benefícios`,
        response_json_schema: {
          type: "object",
          properties: {
            hero_headline: { type: "string" },
            hero_subheadline: { type: "string" },
            meta_title: { type: "string" },
            meta_description: { type: "string" },
            keywords: { type: "string" },
            cta_text: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        hero_headline: aiContent.hero_headline,
        hero_subheadline: aiContent.hero_subheadline,
        meta_title: aiContent.meta_title,
        meta_description: aiContent.meta_description,
        keywords: aiContent.keywords,
        cta_text: aiContent.cta_text
      }));

      toast.success("Conteúdo gerado com IA!");
    } catch (error) {
      toast.error("Erro ao gerar conteúdo");
    }
    setGenerating(false);
  };

  const copyPageUrl = (page) => {
    const url = `${window.location.origin}${createPageUrl("LandingPage")}?slug=${page.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Landing Pages</h2>
          <p className="text-slate-600">Crie páginas otimizadas para campanhas</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Landing Page
        </Button>
      </div>

      {/* Pages List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {landingPages.map(page => (
          <Card key={page.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{page.title}</CardTitle>
                  <Badge className={page.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}>
                    {page.status === 'published' ? 'Publicada' : 'Rascunho'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyPageUrl(page)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      if (confirm('Eliminar esta landing page?')) {
                        deleteMutation.mutate(page.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-slate-600 line-clamp-2">{page.hero_headline}</p>
                <div className="flex items-center gap-2 text-slate-500">
                  <FileText className="w-4 h-4" />
                  <span className="font-mono text-xs">/{page.slug}</span>
                </div>
                {page.campaign_id && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs">{page.campaign_id}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {landingPages.length === 0 && (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Nenhuma landing page criada</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Editar" : "Criar"} Landing Page</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Conteúdo da Página</Label>
                  <Button
                    type="button"
                    onClick={generateWithAI}
                    disabled={generating || !formData.title}
                    variant="outline"
                    size="sm"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar com IA
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <Label>Título da Campanha *</Label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Campanha Moradias Cascais 2025"
                  />
                </div>

                <div>
                  <Label>URL Slug *</Label>
                  <Input
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    placeholder="moradias-cascais-2025"
                  />
                  <p className="text-xs text-slate-500 mt-1">URL: /lp/{formData.slug}</p>
                </div>

                <div>
                  <Label>Headline Principal</Label>
                  <Input
                    value={formData.hero_headline}
                    onChange={(e) => setFormData({...formData, hero_headline: e.target.value})}
                    placeholder="Descubra a Sua Casa de Sonho em Cascais"
                  />
                </div>

                <div>
                  <Label>Subheadline</Label>
                  <Textarea
                    value={formData.hero_subheadline}
                    onChange={(e) => setFormData({...formData, hero_subheadline: e.target.value})}
                    placeholder="Moradias exclusivas com vista mar e acabamentos premium"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>URL da Imagem Hero</Label>
                  <Input
                    value={formData.hero_image}
                    onChange={(e) => setFormData({...formData, hero_image: e.target.value})}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Texto do CTA</Label>
                    <Input
                      value={formData.cta_text}
                      onChange={(e) => setFormData({...formData, cta_text: e.target.value})}
                      placeholder="Agendar Visita"
                    />
                  </div>
                  <div>
                    <Label>Ação do CTA</Label>
                    <Select value={formData.cta_action} onValueChange={(v) => setFormData({...formData, cta_action: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contact">Formulário Contacto</SelectItem>
                        <SelectItem value="phone">Ligar</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="schedule">Agendar Visita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Estado</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <div>
                  <Label>Meta Title (SEO)</Label>
                  <Input
                    value={formData.meta_title}
                    onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
                    placeholder="Moradias de Luxo em Cascais | Zugruppe"
                    maxLength={60}
                  />
                  <p className="text-xs text-slate-500 mt-1">{formData.meta_title.length}/60 caracteres</p>
                </div>

                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    value={formData.meta_description}
                    onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
                    placeholder="Encontre a moradia perfeita em Cascais. Vistas deslumbrantes, acabamentos premium e localização privilegiada."
                    maxLength={160}
                    rows={3}
                  />
                  <p className="text-xs text-slate-500 mt-1">{formData.meta_description.length}/160 caracteres</p>
                </div>

                <div>
                  <Label>Keywords</Label>
                  <Input
                    value={formData.keywords}
                    onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                    placeholder="moradias cascais, casas luxo, vista mar, imobiliária"
                  />
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="space-y-4 mt-4">
                <div>
                  <Label>ID da Campanha</Label>
                  <Input
                    value={formData.campaign_id}
                    onChange={(e) => setFormData({...formData, campaign_id: e.target.value})}
                    placeholder="FB_CAMPAIGN_2025_Q1"
                  />
                </div>

                <div>
                  <Label>Código de Tracking (Google Analytics, Facebook Pixel, etc.)</Label>
                  <Textarea
                    value={formData.tracking_code}
                    onChange={(e) => setFormData({...formData, tracking_code: e.target.value})}
                    placeholder="<!-- Google tag (gtag.js) -->..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}