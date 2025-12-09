import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Zap, Building2, Facebook, Instagram, Mail, 
  Loader2, CheckCircle, Play, Settings, Calendar,
  Target, Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AutomatedPropertyPublisher({ campaignId }) {
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [filters, setFilters] = useState({
    availability_status: "available",
    listing_type: "all",
    property_type: "all",
    featured_only: false,
    min_quality_score: 0
  });
  const [publishConfig, setPublishConfig] = useState({
    create_social_post: true,
    create_email_campaign: true,
    platforms: ["facebook", "instagram"],
    auto_schedule: false,
    schedule_date: ""
  });
  const [publishing, setPublishing] = useState(false);
  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const campaigns = await base44.entities.MarketingCampaign.filter({ id: campaignId });
      return campaigns[0];
    },
    enabled: !!campaignId
  });

  // Filter properties based on criteria
  const filteredProperties = properties.filter(p => {
    if (filters.availability_status !== "all" && p.availability_status !== filters.availability_status) return false;
    if (filters.listing_type !== "all" && p.listing_type !== filters.listing_type) return false;
    if (filters.property_type !== "all" && p.property_type !== filters.property_type) return false;
    if (filters.featured_only && !p.featured) return false;
    if (filters.min_quality_score > 0 && (p.quality_score || 0) < filters.min_quality_score) return false;
    return true;
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (data) => {
      if (!campaignId) return;
      return base44.entities.MarketingCampaign.update(campaignId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
    }
  });

  const handlePublishToSocial = async () => {
    if (selectedProperties.length === 0) {
      toast.error("Selecione pelo menos um imóvel");
      return;
    }

    setPublishing(true);
    try {
      const results = [];
      
      for (const propId of selectedProperties) {
        const property = properties.find(p => p.id === propId);
        if (!property) continue;

        // Generate social media posts
        for (const platform of publishConfig.platforms) {
          try {
            const post = await base44.integrations.Core.InvokeLLM({
              prompt: `Cria um post promocional para ${platform} sobre este imóvel:

Imóvel: ${property.title}
Localização: ${property.city}, ${property.state}
Preço: €${property.price?.toLocaleString()}
Tipo: ${property.property_type}
${property.bedrooms ? `Quartos: T${property.bedrooms}` : ''}
${property.useful_area ? `Área: ${property.useful_area}m²` : ''}

Instruções:
- Tom profissional e atraente
- Destacar pontos únicos do imóvel
- Incluir call-to-action forte
${platform === 'instagram' ? '- Adicionar 10-15 hashtags relevantes' : ''}
${platform === 'facebook' ? '- Texto mais detalhado (200-300 palavras)' : ''}
- Criar urgência e interesse

Retorna APENAS o texto do post.`
            });

            results.push({
              property_id: propId,
              platform,
              content: post,
              status: "generated"
            });
          } catch (error) {
            console.error(`Erro ao gerar post para ${platform}:`, error);
          }
        }
      }

      // Update campaign with generated content
      if (campaignId) {
        const currentProperties = campaign?.properties || [];
        await updateCampaignMutation.mutateAsync({
          properties: [...new Set([...currentProperties, ...selectedProperties])],
          social_ads_config: {
            ...campaign?.social_ads_config,
            generated_posts: results,
            last_generation_date: new Date().toISOString()
          },
          status: campaign?.status === "draft" ? "scheduled" : campaign?.status
        });
      }

      toast.success(`${results.length} posts gerados com sucesso!`);
      setPublishDialogOpen(false);
      setSelectedProperties([]);
    } catch (error) {
      toast.error("Erro ao gerar posts");
      console.error(error);
    }
    setPublishing(false);
  };

  const handleSelectAll = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(filteredProperties.map(p => p.id));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Publicação Automática de Imóveis
              </CardTitle>
              <CardDescription>
                Publique imóveis automaticamente em campanhas de marketing
              </CardDescription>
            </div>
            <Button onClick={() => setPublishDialogOpen(true)}>
              <Play className="w-4 h-4 mr-2" />
              Publicar Imóveis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="w-4 h-4" />
              Filtros de Seleção
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Disponibilidade</Label>
                <Select value={filters.availability_status} onValueChange={(v) => setFilters({...filters, availability_status: v})}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="reserved">Reservado</SelectItem>
                    <SelectItem value="prospecting">Em Prospecção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Tipo de Negócio</Label>
                <Select value={filters.listing_type} onValueChange={(v) => setFilters({...filters, listing_type: v})}>
                  <SelectTrigger className="h-9">
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
                <Label className="text-xs">Natureza</Label>
                <Select value={filters.property_type} onValueChange={(v) => setFilters({...filters, property_type: v})}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="apartment">Apartamento</SelectItem>
                    <SelectItem value="house">Moradia</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Score Mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.min_quality_score}
                  onChange={(e) => setFilters({...filters, min_quality_score: parseInt(e.target.value) || 0})}
                  className="h-9"
                  placeholder="0-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.featured_only}
                onCheckedChange={(checked) => setFilters({...filters, featured_only: checked})}
              />
              <Label className="text-sm cursor-pointer">Apenas imóveis em destaque</Label>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Imóveis correspondentes:</span>
              </div>
              <Badge className="bg-blue-600 text-white text-lg px-4 py-1">
                {filteredProperties.length}
              </Badge>
            </div>
          </div>

          {/* Currently attached properties */}
          {campaign && campaign.properties?.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-sm mb-3">
                Imóveis já associados a esta campanha ({campaign.properties.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {campaign.properties.map(propId => {
                  const prop = properties.find(p => p.id === propId);
                  return prop ? (
                    <div key={propId} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>{prop.title}</span>
                      </div>
                      <Badge variant="outline">{prop.city}</Badge>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publicar Imóveis na Campanha</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Property Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Selecionar Imóveis ({selectedProperties.length}/{filteredProperties.length})</Label>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedProperties.length === filteredProperties.length ? "Desselecionar Todos" : "Selecionar Todos"}
                </Button>
              </div>
              
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {filteredProperties.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum imóvel corresponde aos filtros</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredProperties.map(property => (
                      <div
                        key={property.id}
                        className={`p-3 hover:bg-slate-50 cursor-pointer ${
                          selectedProperties.includes(property.id) ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          setSelectedProperties(prev =>
                            prev.includes(property.id)
                              ? prev.filter(id => id !== property.id)
                              : [...prev, property.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedProperties.includes(property.id)}
                            onCheckedChange={(checked) => {
                              setSelectedProperties(prev =>
                                checked
                                  ? [...prev, property.id]
                                  : prev.filter(id => id !== property.id)
                              );
                            }}
                          />
                          <img
                            src={property.images?.[0] || "https://via.placeholder.com/100"}
                            alt={property.title}
                            className="w-16 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{property.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{property.city}</Badge>
                              <span className="text-xs text-slate-600">€{property.price?.toLocaleString()}</span>
                              {property.quality_score && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  Score: {property.quality_score}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Publication Options */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Opções de Publicação</Label>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={publishConfig.create_social_post}
                    onCheckedChange={(checked) => setPublishConfig({...publishConfig, create_social_post: checked})}
                  />
                  <Label className="cursor-pointer">Gerar posts para redes sociais</Label>
                </div>

                {publishConfig.create_social_post && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-xs text-slate-600">Plataformas:</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "facebook", label: "Facebook", icon: Facebook },
                        { value: "instagram", label: "Instagram", icon: Instagram }
                      ].map(({ value, label, icon: Icon }) => (
                        <div
                          key={value}
                          onClick={() => {
                            setPublishConfig(prev => ({
                              ...prev,
                              platforms: prev.platforms.includes(value)
                                ? prev.platforms.filter(p => p !== value)
                                : [...prev.platforms, value]
                            }));
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                            publishConfig.platforms.includes(value)
                              ? "bg-blue-50 border-blue-500"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{label}</span>
                          {publishConfig.platforms.includes(value) && (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={publishConfig.create_email_campaign}
                    onCheckedChange={(checked) => setPublishConfig({...publishConfig, create_email_campaign: checked})}
                  />
                  <Label className="cursor-pointer">Gerar campanha de email</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={publishConfig.auto_schedule}
                    onCheckedChange={(checked) => setPublishConfig({...publishConfig, auto_schedule: checked})}
                  />
                  <Label className="cursor-pointer">Agendar publicação</Label>
                </div>

                {publishConfig.auto_schedule && (
                  <div className="ml-6">
                    <Label className="text-xs text-slate-600">Data e hora:</Label>
                    <Input
                      type="datetime-local"
                      value={publishConfig.schedule_date}
                      onChange={(e) => setPublishConfig({...publishConfig, schedule_date: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePublishToSocial} 
              disabled={publishing || selectedProperties.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Publicar {selectedProperties.length} {selectedProperties.length === 1 ? 'Imóvel' : 'Imóveis'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Posts Preview */}
      {campaign?.social_ads_config?.generated_posts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Posts Gerados ({campaign.social_ads_config.generated_posts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {campaign.social_ads_config.generated_posts.map((post, idx) => {
                const property = properties.find(p => p.id === post.property_id);
                return (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {post.platform === 'facebook' && <Facebook className="w-4 h-4 text-blue-600" />}
                        {post.platform === 'instagram' && <Instagram className="w-4 h-4 text-pink-600" />}
                        <span className="font-medium text-sm">{property?.title}</span>
                      </div>
                      <Badge variant="outline">{post.platform}</Badge>
                    </div>
                    <div className="bg-slate-50 p-3 rounded text-sm whitespace-pre-wrap">
                      {post.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}