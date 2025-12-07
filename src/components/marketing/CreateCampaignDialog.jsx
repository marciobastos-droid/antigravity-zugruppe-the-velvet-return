import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Facebook, Instagram, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function CreateCampaignDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    campaign_type: "email",
    objective: "lead_generation",
    target_audience: {
      segment_type: "all",
      tags: [],
      locations: []
    },
    email_config: {
      subject: "",
      content: "",
      sender_name: "ZuGruppe"
    },
    social_ads_config: {
      platform: "facebook",
      budget: 0,
      ad_creative: {
        headline: "",
        description: "",
        call_to_action: "LEARN_MORE"
      }
    },
    tracking_config: {
      utm_source: "zugruppe",
      utm_medium: "",
      utm_campaign: ""
    },
    budget: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    status: "draft",
    properties: [],
    assigned_to: "",
    notes: ""
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const allTags = await base44.entities.Tag.list();
      return allTags;
    }
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { data: marketingTeam = [] } = useQuery({
    queryKey: ['marketingTeam'],
    queryFn: () => base44.entities.MarketingTeamMember.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketingCampaign.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketingCampaigns'] });
      toast.success("Campanha criada com sucesso!");
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao criar campanha");
    }
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: "",
      campaign_type: "email",
      objective: "lead_generation",
      target_audience: { segment_type: "all", tags: [], locations: [] },
      email_config: { subject: "", content: "", sender_name: "ZuGruppe" },
      social_ads_config: {
        platform: "facebook",
        budget: 0,
        ad_creative: { headline: "", description: "", call_to_action: "LEARN_MORE" }
      },
      tracking_config: { utm_source: "zugruppe", utm_medium: "", utm_campaign: "" },
      budget: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: "",
      status: "draft",
      properties: [],
      assigned_to: "",
      notes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Set tracking parameters
    const trackingData = {
      ...formData,
      tracking_config: {
        ...formData.tracking_config,
        utm_medium: formData.campaign_type,
        utm_campaign: formData.name.toLowerCase().replace(/\s+/g, '_')
      }
    };
    
    createMutation.mutate(trackingData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha de Marketing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Nome da Campanha *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Campanha Verão 2025"
                />
              </div>

              <div>
                <Label>Tipo de Campanha *</Label>
                <Select 
                  value={formData.campaign_type} 
                  onValueChange={(v) => setFormData({...formData, campaign_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Marketing
                      </div>
                    </SelectItem>
                    <SelectItem value="facebook_ads">
                      <div className="flex items-center gap-2">
                        <Facebook className="w-4 h-4" />
                        Facebook Ads
                      </div>
                    </SelectItem>
                    <SelectItem value="instagram_ads">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4" />
                        Instagram Ads
                      </div>
                    </SelectItem>
                    <SelectItem value="multi_channel">Multi-canal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Objetivo *</Label>
                <Select 
                  value={formData.objective} 
                  onValueChange={(v) => setFormData({...formData, objective: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_generation">Geração de Leads</SelectItem>
                    <SelectItem value="brand_awareness">Consciência de Marca</SelectItem>
                    <SelectItem value="property_promotion">Promoção de Imóveis</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="nurturing">Nutrição de Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Orçamento (€)</Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Fim (opcional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Select 
                    value={formData.assigned_to} 
                    onValueChange={(v) => setFormData({...formData, assigned_to: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar membro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {marketingTeam.filter(m => m.status === 'active').map(member => (
                        <SelectItem key={member.id} value={member.user_email}>
                          {member.full_name} - {member.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => setStep(2)}>
                  Próximo: Audiência
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Target Audience */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Segmento de Audiência</Label>
                <Select 
                  value={formData.target_audience.segment_type} 
                  onValueChange={(v) => setFormData({
                    ...formData, 
                    target_audience: {...formData.target_audience, segment_type: v}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Contactos</SelectItem>
                    <SelectItem value="buyers">Compradores</SelectItem>
                    <SelectItem value="sellers">Vendedores</SelectItem>
                    <SelectItem value="investors">Investidores</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Localizações (separadas por vírgula)</Label>
                <Input
                  value={formData.target_audience.locations?.join(", ") || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    target_audience: {
                      ...formData.target_audience,
                      locations: e.target.value.split(",").map(l => l.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="Lisboa, Porto, Faro"
                />
              </div>

              <div>
                <Label>Imóveis a Promover (opcional)</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {properties.slice(0, 20).map(prop => (
                    <div key={prop.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.properties.includes(prop.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              properties: [...formData.properties, prop.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              properties: formData.properties.filter(id => id !== prop.id)
                            });
                          }
                        }}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {prop.images?.[0] && (
                          <img src={prop.images[0]} alt="" className="w-10 h-10 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{prop.title}</p>
                          <p className="text-xs text-slate-500">{prop.city} • €{prop.price?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {properties.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-2">Nenhum imóvel disponível</p>
                  )}
                </div>
                {formData.properties.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">{formData.properties.length} imóveis selecionados</p>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={() => setStep(3)}>
                    Próximo: Conteúdo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Content */}
          {step === 3 && (
            <div className="space-y-4">
              {formData.campaign_type === "email" && (
                <>
                  <div>
                    <Label>Assunto do Email *</Label>
                    <Input
                      required
                      value={formData.email_config.subject}
                      onChange={(e) => setFormData({
                        ...formData,
                        email_config: {...formData.email_config, subject: e.target.value}
                      })}
                      placeholder="Descubra os melhores imóveis"
                    />
                  </div>
                  <div>
                    <Label>Conteúdo do Email *</Label>
                    <Textarea
                      required
                      value={formData.email_config.content}
                      onChange={(e) => setFormData({
                        ...formData,
                        email_config: {...formData.email_config, content: e.target.value}
                      })}
                      placeholder="Conteúdo HTML do email..."
                      rows={8}
                    />
                  </div>
                </>
              )}

              {(formData.campaign_type === "facebook_ads" || formData.campaign_type === "instagram_ads") && (
                <>
                  <div>
                    <Label>Título do Anúncio *</Label>
                    <Input
                      required
                      value={formData.social_ads_config.ad_creative.headline}
                      onChange={(e) => setFormData({
                        ...formData,
                        social_ads_config: {
                          ...formData.social_ads_config,
                          ad_creative: {
                            ...formData.social_ads_config.ad_creative,
                            headline: e.target.value
                          }
                        }
                      })}
                      placeholder="Encontre a sua casa de sonho"
                    />
                  </div>
                  <div>
                    <Label>Descrição *</Label>
                    <Textarea
                      required
                      value={formData.social_ads_config.ad_creative.description}
                      onChange={(e) => setFormData({
                        ...formData,
                        social_ads_config: {
                          ...formData.social_ads_config,
                          ad_creative: {
                            ...formData.social_ads_config.ad_creative,
                            description: e.target.value
                          }
                        }
                      })}
                      placeholder="Descrição do anúncio..."
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Orçamento Diário (€)</Label>
                    <Input
                      type="number"
                      value={formData.social_ads_config.daily_budget}
                      onChange={(e) => setFormData({
                        ...formData,
                        social_ads_config: {
                          ...formData.social_ads_config,
                          daily_budget: Number(e.target.value)
                        }
                      })}
                      placeholder="50"
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas sobre a campanha..."
                  rows={3}
                />
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        A criar...
                      </>
                    ) : (
                      "Criar Campanha"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}