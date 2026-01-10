import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Save, User, Building2, Euro, Calendar,
  Percent, Bell, X, Plus, Search, MapPin, Bed
} from "lucide-react";
import { toast } from "sonner";
import { useAgentNames } from "../common/useAgentNames";

export default function OpportunityFormDialog({ opportunity, open, onOpenChange, onSaved, prefillContact }) {
  const queryClient = useQueryClient();
  const isEditing = !!opportunity;

  const [formData, setFormData] = useState({
    lead_type: "comprador",
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    location: "",
    budget: "",
    estimated_value: "",
    probability: 50,
    expected_close_date: "",
    status: "new",
    priority: "medium",
    qualification_status: "",
    lead_source: "",
    message: "",
    property_id: "",
    property_title: "",
    associated_properties: [],
    assigned_to: "",
    reminder_enabled: true,
    followup_reminder_days: 7,
    next_followup_date: "",
    company_name: "",
    partnership_type: ""
  });

  const [propertySearch, setPropertySearch] = useState("");
  const [showPropertySearch, setShowPropertySearch] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const { users, getAgentName } = useAgentNames();

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  useEffect(() => {
    if (opportunity) {
      setFormData({
        lead_type: opportunity.lead_type || "comprador",
        buyer_name: opportunity.buyer_name || "",
        buyer_email: opportunity.buyer_email || "",
        buyer_phone: opportunity.buyer_phone || "",
        location: opportunity.location || "",
        budget: opportunity.budget || "",
        estimated_value: opportunity.estimated_value || "",
        probability: opportunity.probability || 50,
        expected_close_date: opportunity.expected_close_date || "",
        status: opportunity.status || "new",
        priority: opportunity.priority || "medium",
        qualification_status: opportunity.qualification_status || "",
        lead_source: opportunity.lead_source || "",
        message: opportunity.message || "",
        property_id: opportunity.property_id || "",
        property_title: opportunity.property_title || "",
        associated_properties: opportunity.associated_properties || [],
        assigned_to: opportunity.assigned_to || "",
        reminder_enabled: opportunity.reminder_enabled !== false,
        followup_reminder_days: opportunity.followup_reminder_days || 7,
        next_followup_date: opportunity.next_followup_date?.split('T')[0] || "",
        company_name: opportunity.company_name || "",
        partnership_type: opportunity.partnership_type || ""
      });
    } else {
      // Pre-fill from contact if provided
      const req = prefillContact?.property_requirements || {};
      setFormData({
        lead_type: prefillContact?.contact_type === 'partner' ? 'parceiro_comprador' : 'comprador',
        buyer_name: prefillContact?.full_name || "",
        buyer_email: prefillContact?.email || "",
        buyer_phone: prefillContact?.phone || "",
        location: prefillContact?.city || req.locations?.[0] || "",
        budget: req.budget_max || "",
        estimated_value: "",
        probability: 50,
        expected_close_date: "",
        status: "new",
        priority: "medium",
        qualification_status: "",
        lead_source: prefillContact?.source || "",
        message: "",
        property_id: "",
        property_title: "",
        associated_properties: [],
        assigned_to: prefillContact?.assigned_agent || "",
        reminder_enabled: true,
        followup_reminder_days: 7,
        next_followup_date: "",
        company_name: prefillContact?.company_name || "",
        partnership_type: "",
        contact_id: prefillContact?.id || "",
        profile_id: prefillContact?.id || ""
      });
    }
  }, [opportunity, open, prefillContact]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let result;
      let contactId = data.profile_id || data.contact_id || prefillContact?.id;
      
      if (isEditing) {
        result = await base44.entities.Opportunity.update(opportunity.id, data);
        
        // Sincronizar consultor com contacto ao editar
        if (opportunity.contact_id && data.assigned_to) {
          try {
            await base44.entities.ClientContact.update(opportunity.contact_id, {
              assigned_agent: data.assigned_to
            });
          } catch (err) {
            console.error("Erro ao sincronizar consultor com contacto:", err);
          }
        }
      } else {
        // Se não tem contacto associado, procurar ou criar um
        if (!contactId && data.buyer_name) {
          // Procurar contacto existente por email ou telefone
          let existingContact = null;
          
          if (data.buyer_email) {
            existingContact = contacts.find(c => 
              c.email?.toLowerCase() === data.buyer_email.toLowerCase()
            );
          }
          
          if (!existingContact && data.buyer_phone) {
            const normalizedPhone = data.buyer_phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
            existingContact = contacts.find(c => {
              const contactPhone = c.phone?.replace(/\s+/g, '').replace(/[^\d+]/g, '');
              return contactPhone && contactPhone === normalizedPhone;
            });
          }
          
          if (existingContact) {
            // Contacto já existe - vincular a oportunidade e atualizar consultor
            contactId = existingContact.id;
            
            // Atualizar consultor do contacto se oportunidade tiver um atribuído
            if (data.assigned_to) {
              try {
                await base44.entities.ClientContact.update(contactId, {
                  assigned_agent: data.assigned_to
                });
              } catch (err) {
                console.error("Erro ao atualizar consultor do contacto:", err);
              }
            }
            
            toast.info(`Oportunidade vinculada ao contacto existente: ${existingContact.full_name}`);
          } else {
            // Criar novo contacto automaticamente
            const { data: contactRefData } = await base44.functions.invoke('generateRefId', { entity_type: 'ClientContact' });
            
            const newContact = await base44.entities.ClientContact.create({
              ref_id: contactRefData.ref_id,
              full_name: data.buyer_name,
              first_name: data.buyer_name.split(' ')[0],
              last_name: data.buyer_name.split(' ').slice(1).join(' ') || '',
              email: data.buyer_email || '',
              phone: data.buyer_phone || '',
              city: data.location || '',
              contact_type: data.lead_type?.includes('parceiro') ? 'partner' : 'client',
              status: 'active',
              source: data.lead_source || 'direct_contact',
              assigned_agent: data.assigned_to || '',
              company_name: data.company_name || '',
              property_requirements: {
                budget_max: data.budget ? Number(data.budget) : null,
                locations: data.location ? [data.location] : []
              }
            });
            
            contactId = newContact.id;
            toast.success(`Novo contacto criado: ${data.buyer_name}`);
          }
        }
        
        const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
        result = await base44.entities.Opportunity.create({ 
          ...data, 
          ref_id: refData.ref_id,
          contact_id: contactId,
          profile_id: contactId
        });
        
        // Adicionar oportunidade aos linked_opportunity_ids do contacto
        if (contactId) {
          try {
            const contact = contacts.find(c => c.id === contactId);
            const linkedIds = contact?.linked_opportunity_ids || [];
            if (!linkedIds.includes(result.id)) {
              await base44.entities.ClientContact.update(contactId, {
                linked_opportunity_ids: [...linkedIds, result.id]
              });
            }
          } catch (err) {
            console.error("Erro ao vincular oportunidade ao contacto:", err);
          }
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      queryClient.invalidateQueries({ queryKey: ['contactOpportunities'] });
      toast.success(isEditing ? "Oportunidade atualizada!" : "Oportunidade criada!");
      onOpenChange(false);
      onSaved?.();
    },
    onError: () => {
      toast.error("Erro ao guardar oportunidade");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      ...formData,
      budget: formData.budget ? Number(formData.budget) : null,
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      probability: Number(formData.probability),
      followup_reminder_days: Number(formData.followup_reminder_days)
    };

    saveMutation.mutate(dataToSave);
  };

  const filteredProperties = properties.filter(p => {
    if (!propertySearch) return true;
    const search = propertySearch.toLowerCase();
    return p.title?.toLowerCase().includes(search) ||
           p.city?.toLowerCase().includes(search) ||
           p.ref_id?.toLowerCase().includes(search);
  }).slice(0, 10);

  const addProperty = (property) => {
    if (formData.associated_properties.some(p => p.property_id === property.id)) {
      toast.error("Imóvel já adicionado");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      associated_properties: [
        ...prev.associated_properties,
        {
          property_id: property.id,
          property_title: property.title,
          added_date: new Date().toISOString(),
          status: "interested"
        }
      ]
    }));
    setPropertySearch("");
    setShowPropertySearch(false);
  };

  const removeProperty = (propertyId) => {
    setFormData(prev => ({
      ...prev,
      associated_properties: prev.associated_properties.filter(p => p.property_id !== propertyId)
    }));
  };

  const updatePropertyStatus = (propertyId, status) => {
    setFormData(prev => ({
      ...prev,
      associated_properties: prev.associated_properties.map(p =>
        p.property_id === propertyId ? { ...p, status } : p
      )
    }));
  };

  const propertyStatusLabels = {
    interested: "Interessado",
    visited: "Visitado",
    rejected: "Rejeitado",
    negotiating: "Em Negociação"
  };

  const propertyStatusColors = {
    interested: "bg-blue-100 text-blue-800",
    visited: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    negotiating: "bg-amber-100 text-amber-800"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="deal">Negócio</TabsTrigger>
              <TabsTrigger value="properties">Imóveis</TabsTrigger>
              <TabsTrigger value="followup">Follow-up</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="basic" className="mt-0 space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Lead *</Label>
                    <Select
                      value={formData.lead_type}
                      onValueChange={(v) => setFormData({ ...formData, lead_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comprador">Comprador</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                        <SelectItem value="parceiro_comprador">Parceiro Comprador</SelectItem>
                        <SelectItem value="parceiro_vendedor">Parceiro Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Origem</Label>
                    <Select
                      value={formData.lead_source}
                      onValueChange={(v) => setFormData({ ...formData, lead_source: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referência</SelectItem>
                        <SelectItem value="direct_contact">Contacto Direto</SelectItem>
                        <SelectItem value="real_estate_portal">Portal Imobiliário</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={formData.buyer_name}
                      onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.buyer_email}
                      onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.buyer_phone}
                      onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Localização</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Cidade/Zona"
                    />
                  </div>
                </div>

                {(formData.lead_type === "parceiro_comprador" || formData.lead_type === "parceiro_vendedor") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome da Empresa</Label>
                      <Input
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Tipo de Parceria</Label>
                      <Input
                        value={formData.partnership_type}
                        onChange={(e) => setFormData({ ...formData, partnership_type: e.target.value })}
                        placeholder="Ex: Construtor, Investidor..."
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Agente Responsável</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar agente">
                        {formData.assigned_to ? getAgentName(formData.assigned_to) : "Selecionar agente"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.email}>
                          {u.display_name || u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mensagem / Notas</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="deal" className="mt-0 space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estado</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                       <SelectItem value="new">Novo</SelectItem>
                       <SelectItem value="contacted">Contactado</SelectItem>
                       <SelectItem value="qualified">Qualificado</SelectItem>
                       <SelectItem value="visit_scheduled">Visita Agendada</SelectItem>
                       <SelectItem value="proposal">Proposta</SelectItem>
                       <SelectItem value="negotiation">Negociação</SelectItem>
                       <SelectItem value="won">Fechado ✓</SelectItem>
                       <SelectItem value="lost">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">🔴 Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Qualificação</Label>
                    <Select
                      value={formData.qualification_status}
                      onValueChange={(v) => setFormData({ ...formData, qualification_status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot">🔥 Hot</SelectItem>
                        <SelectItem value="warm">🌡️ Warm</SelectItem>
                        <SelectItem value="cold">❄️ Cold</SelectItem>
                        <SelectItem value="unqualified">Não Qualificado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Orçamento do Cliente</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                        className="pl-9"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Estimado da Oportunidade</Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        value={formData.estimated_value}
                        onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                        className="pl-9"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Probabilidade de Fecho (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Data de Fecho Prevista</Label>
                  <Input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>

                {formData.estimated_value && formData.probability && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-800">Valor Ponderado</span>
                        <span className="text-lg font-bold text-green-900">
                          €{Math.round((formData.estimated_value * formData.probability) / 100).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="properties" className="mt-0 space-y-4 pr-4">
                <div>
                  <Label>Imóvel Principal</Label>
                  <Select
                    value={formData.property_id}
                    onValueChange={(v) => {
                      const prop = properties.find(p => p.id === v);
                      setFormData({
                        ...formData,
                        property_id: v,
                        property_title: prop?.title || ""
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar imóvel principal" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.slice(0, 50).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.ref_id ? `${p.ref_id} - ` : ""}{p.title?.substring(0, 50)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Imóveis Associados</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPropertySearch(!showPropertySearch)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {showPropertySearch && (
                    <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          value={propertySearch}
                          onChange={(e) => setPropertySearch(e.target.value)}
                          placeholder="Pesquisar imóveis..."
                          className="pl-9"
                        />
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredProperties.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => addProperty(p)}
                            className="p-2 border rounded cursor-pointer hover:bg-white flex items-center gap-3"
                          >
                            <div className="w-12 h-10 rounded overflow-hidden bg-slate-200 flex-shrink-0">
                              {p.images?.[0] ? (
                                <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.title}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {p.city}
                                </span>
                                <span>€{p.price?.toLocaleString()}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.associated_properties.length > 0 ? (
                    <div className="space-y-2">
                      {formData.associated_properties.map((ap) => {
                        const prop = properties.find(p => p.id === ap.property_id);
                        return (
                          <div key={ap.property_id} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                            <div className="w-14 h-12 rounded overflow-hidden bg-slate-200 flex-shrink-0">
                              {prop?.images?.[0] ? (
                                <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building2 className="w-6 h-6 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{ap.property_title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Select
                                  value={ap.status}
                                  onValueChange={(v) => updatePropertyStatus(ap.property_id, v)}
                                >
                                  <SelectTrigger className="h-7 text-xs w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="interested">Interessado</SelectItem>
                                    <SelectItem value="visited">Visitado</SelectItem>
                                    <SelectItem value="rejected">Rejeitado</SelectItem>
                                    <SelectItem value="negotiating">Negociando</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProperty(ap.property_id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Nenhum imóvel associado
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="followup" className="mt-0 space-y-4 pr-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                  <div>
                    <Label>Lembretes Automáticos</Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Receber notificações de follow-up
                    </p>
                  </div>
                  <Switch
                    checked={formData.reminder_enabled}
                    onCheckedChange={(v) => setFormData({ ...formData, reminder_enabled: v })}
                  />
                </div>

                {formData.reminder_enabled && (
                  <div>
                    <Label>Dias para Lembrete (após último contacto)</Label>
                    <Select
                      value={String(formData.followup_reminder_days)}
                      onValueChange={(v) => setFormData({ ...formData, followup_reminder_days: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 dia</SelectItem>
                        <SelectItem value="2">2 dias</SelectItem>
                        <SelectItem value="3">3 dias</SelectItem>
                        <SelectItem value="5">5 dias</SelectItem>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="14">14 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Próximo Follow-up</Label>
                  <Input
                    type="date"
                    value={formData.next_followup_date}
                    onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                  />
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Como funcionam os lembretes</p>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• Notificações são geradas automaticamente</li>
                          <li>• Baseadas na data de fecho prevista</li>
                          <li>• Ou dias após o último contacto</li>
                          <li>• Aparecem no sino de notificações</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? "Guardar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}