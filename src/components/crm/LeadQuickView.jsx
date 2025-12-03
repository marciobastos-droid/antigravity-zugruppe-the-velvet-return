import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, Mail, MapPin, Building2, User, Euro, Calendar, Clock,
  MessageSquare, Edit, Save, X, Plus, Star, Flame, Thermometer, 
  Snowflake, Tag, ChevronRight, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contactado" },
  { value: "visit_scheduled", label: "Visita Agendada" },
  { value: "proposal", label: "Proposta" },
  { value: "negotiation", label: "Negociação" },
  { value: "won", label: "Fechado ✓" },
  { value: "lost", label: "Perdido" }
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" }
];

const SEGMENT_OPTIONS = [
  { value: "residential", label: "Residencial" },
  { value: "commercial", label: "Comercial" },
  { value: "luxury", label: "Luxo" },
  { value: "investment", label: "Investimento" },
  { value: "first_time_buyer", label: "Primeira Compra" },
  { value: "relocation", label: "Relocalização" },
  { value: "other", label: "Outro" }
];

const SOURCE_OPTIONS = [
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "website", label: "Website" },
  { value: "referral", label: "Referência" },
  { value: "direct_contact", label: "Contacto Direto" },
  { value: "real_estate_portal", label: "Portal Imobiliário" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Telefone" },
  { value: "walk_in", label: "Presencial" },
  { value: "other", label: "Outro" }
];

export default function LeadQuickView({ lead, open, onOpenChange, agents = [] }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  React.useEffect(() => {
    if (lead) {
      setEditData({
        status: lead.status,
        priority: lead.priority,
        assigned_agent_id: lead.assigned_agent_id || "",
        assigned_to: lead.assigned_to || "",
        qualification_status: lead.qualification_status || "",
        segment: lead.segment || "",
        lead_source: lead.lead_source || "",
        budget: lead.budget || "",
        estimated_value: lead.estimated_value || "",
        next_followup_date: lead.next_followup_date ? lead.next_followup_date.split('T')[0] : "",
        preferred_contact_method: lead.preferred_contact_method || "any",
        financing_status: lead.financing_status || "",
        urgency: lead.urgency || "",
        tags: lead.tags || [],
        custom_fields: lead.custom_fields || {}
      });
    }
  }, [lead]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Opportunity.update(lead.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success("Lead atualizado");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar");
    }
  });

  const handleSave = () => {
    const agent = agents.find(a => a.id === editData.assigned_agent_id);
    updateMutation.mutate({
      ...editData,
      assigned_agent_name: agent?.full_name || "",
      budget: editData.budget ? Number(editData.budget) : null,
      estimated_value: editData.estimated_value ? Number(editData.estimated_value) : null
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const notes = lead.quick_notes || [];
    const newNotes = [...notes, {
      text: newNote,
      date: new Date().toISOString(),
      by: "current_user"
    }];
    
    updateMutation.mutate({ quick_notes: newNotes });
    setNewNote("");
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const currentTags = editData.tags || [];
    if (!currentTags.includes(newTag)) {
      setEditData({ ...editData, tags: [...currentTags, newTag] });
    }
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditData({ 
      ...editData, 
      tags: (editData.tags || []).filter(t => t !== tagToRemove) 
    });
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{lead.buyer_name}</DialogTitle>
              {lead.ref_id && (
                <span className="text-sm text-slate-500 font-mono">{lead.ref_id}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="qualification">Qualificação</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
            <TabsTrigger value="custom">Campos Extra</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-slate-900">Contacto</h4>
                <div className="grid grid-cols-2 gap-3">
                  {lead.buyer_email && (
                    <a href={`mailto:${lead.buyer_email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      <Mail className="w-4 h-4" />
                      {lead.buyer_email}
                    </a>
                  )}
                  {lead.buyer_phone && (
                    <a href={`tel:${lead.buyer_phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      <Phone className="w-4 h-4" />
                      {lead.buyer_phone}
                    </a>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      {lead.location}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={(v) => setEditData({...editData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{STATUS_OPTIONS.find(s => s.value === lead.status)?.label || lead.status}</p>
                )}
              </div>
              <div>
                <Label>Prioridade</Label>
                {isEditing ? (
                  <Select value={editData.priority} onValueChange={(v) => setEditData({...editData, priority: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{PRIORITY_OPTIONS.find(p => p.value === lead.priority)?.label || lead.priority}</p>
                )}
              </div>
            </div>

            {/* Agent Assignment */}
            <div>
              <Label>Agente Atribuído</Label>
              {isEditing ? (
                <Select value={editData.assigned_agent_id} onValueChange={(v) => setEditData({...editData, assigned_agent_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecionar agente..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sem agente</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{lead.assigned_agent_name || "Não atribuído"}</p>
              )}
            </div>

            {/* Budget & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Orçamento</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.budget}
                    onChange={(e) => setEditData({...editData, budget: e.target.value})}
                    placeholder="€"
                  />
                ) : (
                  <p className="text-sm">€{lead.budget?.toLocaleString() || "-"}</p>
                )}
              </div>
              <div>
                <Label>Valor Estimado</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.estimated_value}
                    onChange={(e) => setEditData({...editData, estimated_value: e.target.value})}
                    placeholder="€"
                  />
                ) : (
                  <p className="text-sm">€{lead.estimated_value?.toLocaleString() || "-"}</p>
                )}
              </div>
            </div>

            {/* Next Follow-up */}
            <div>
              <Label>Próximo Follow-up</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.next_followup_date}
                  onChange={(e) => setEditData({...editData, next_followup_date: e.target.value})}
                />
              ) : (
                <p className="text-sm">
                  {lead.next_followup_date 
                    ? format(new Date(lead.next_followup_date), "d 'de' MMMM 'de' yyyy", { locale: pt })
                    : "Não definido"}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(isEditing ? editData.tags : lead.tags || []).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                    {isEditing && (
                      <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                    )}
                  </Badge>
                ))}
                {isEditing && (
                  <div className="flex gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Nova tag"
                      className="h-7 w-24 text-xs"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button variant="outline" size="sm" className="h-7" onClick={handleAddTag}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qualification" className="space-y-4 mt-4">
            {/* Qualification Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Qualificação</Label>
                {isEditing ? (
                  <Select value={editData.qualification_status} onValueChange={(v) => setEditData({...editData, qualification_status: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hot">🔥 Quente</SelectItem>
                      <SelectItem value="warm">🌡️ Morno</SelectItem>
                      <SelectItem value="cold">❄️ Frio</SelectItem>
                      <SelectItem value="unqualified">Não Qualificado</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {lead.qualification_status === 'hot' && '🔥 Quente'}
                    {lead.qualification_status === 'warm' && '🌡️ Morno'}
                    {lead.qualification_status === 'cold' && '❄️ Frio'}
                    {lead.qualification_status === 'unqualified' && 'Não Qualificado'}
                    {!lead.qualification_status && '-'}
                  </p>
                )}
              </div>
              <div>
                <Label>Segmento</Label>
                {isEditing ? (
                  <Select value={editData.segment} onValueChange={(v) => setEditData({...editData, segment: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {SEGMENT_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{SEGMENT_OPTIONS.find(s => s.value === lead.segment)?.label || '-'}</p>
                )}
              </div>
            </div>

            {/* Source */}
            <div>
              <Label>Origem</Label>
              {isEditing ? (
                <Select value={editData.lead_source} onValueChange={(v) => setEditData({...editData, lead_source: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{SOURCE_OPTIONS.find(s => s.value === lead.lead_source)?.label || '-'}</p>
              )}
            </div>

            {/* Financing & Urgency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Financiamento</Label>
                {isEditing ? (
                  <Select value={editData.financing_status} onValueChange={(v) => setEditData({...editData, financing_status: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_needed">Não Necessário</SelectItem>
                      <SelectItem value="pre_approved">Pré-Aprovado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                      <SelectItem value="unknown">Desconhecido</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {lead.financing_status === 'not_needed' && 'Não Necessário'}
                    {lead.financing_status === 'pre_approved' && 'Pré-Aprovado'}
                    {lead.financing_status === 'pending' && 'Pendente'}
                    {lead.financing_status === 'rejected' && 'Rejeitado'}
                    {lead.financing_status === 'unknown' && 'Desconhecido'}
                    {!lead.financing_status && '-'}
                  </p>
                )}
              </div>
              <div>
                <Label>Urgência</Label>
                {isEditing ? (
                  <Select value={editData.urgency} onValueChange={(v) => setEditData({...editData, urgency: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Imediato</SelectItem>
                      <SelectItem value="1_month">1 Mês</SelectItem>
                      <SelectItem value="3_months">3 Meses</SelectItem>
                      <SelectItem value="6_months">6 Meses</SelectItem>
                      <SelectItem value="1_year">1 Ano</SelectItem>
                      <SelectItem value="just_looking">Só a Ver</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {lead.urgency === 'immediate' && 'Imediato'}
                    {lead.urgency === '1_month' && '1 Mês'}
                    {lead.urgency === '3_months' && '3 Meses'}
                    {lead.urgency === '6_months' && '6 Meses'}
                    {lead.urgency === '1_year' && '1 Ano'}
                    {lead.urgency === 'just_looking' && 'Só a Ver'}
                    {!lead.urgency && '-'}
                  </p>
                )}
              </div>
            </div>

            {/* Preferred Contact */}
            <div>
              <Label>Contacto Preferido</Label>
              {isEditing ? (
                <Select value={editData.preferred_contact_method} onValueChange={(v) => setEditData({...editData, preferred_contact_method: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">
                  {lead.preferred_contact_method === 'phone' && 'Telefone'}
                  {lead.preferred_contact_method === 'email' && 'Email'}
                  {lead.preferred_contact_method === 'whatsapp' && 'WhatsApp'}
                  {(!lead.preferred_contact_method || lead.preferred_contact_method === 'any') && 'Qualquer'}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            {/* Add Note */}
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar nota..."
                className="flex-1"
                rows={2}
              />
              <Button onClick={handleAddNote} disabled={!newNote.trim() || updateMutation.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              {(lead.quick_notes || []).slice().reverse().map((note, idx) => (
                <Card key={idx}>
                  <CardContent className="p-3">
                    <p className="text-sm text-slate-700">{note.text}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {note.date && format(new Date(note.date), "d MMM yyyy, HH:mm", { locale: pt })}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {(!lead.quick_notes || lead.quick_notes.length === 0) && (
                <p className="text-center text-slate-500 py-8">Sem notas</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <p className="text-sm text-slate-600">
              Campos personalizados permitem guardar informações específicas para cada lead.
            </p>
            
            {/* Property Interest */}
            {lead.property_title && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium">{lead.property_title}</p>
                      <p className="text-sm text-slate-500">Imóvel de interesse</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Message */}
            {lead.message && (
              <Card>
                <CardContent className="p-4">
                  <Label className="text-xs text-slate-500">Mensagem Original</Label>
                  <p className="text-sm mt-1">{lead.message}</p>
                </CardContent>
              </Card>
            )}

            {/* Custom Fields Display */}
            {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Label className="text-xs text-slate-500">Campos Personalizados</Label>
                  {Object.entries(lead.custom_fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-slate-600">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}