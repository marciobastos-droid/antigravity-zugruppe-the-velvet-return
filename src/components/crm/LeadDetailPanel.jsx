import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  X, User, Mail, Phone, MapPin, Building2, Calendar, MessageSquare, 
  Plus, CheckCircle2, Clock, Target, UserPlus, Search, Sparkles, Loader2, 
  Send, Zap, Edit, Euro, TrendingUp, FileText, History, Flame, 
  ThermometerSun, Snowflake, AlertCircle, ExternalLink, Copy, MoreVertical,
  Maximize2, Minimize2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import AIAssistant from "./AIAssistant";
import LeadSourceClassifier from "./LeadSourceClassifier";
import CommunicationPanel from "./CommunicationPanel";
import AICommunicationAssistant from "./AICommunicationAssistant";
import SendEmailDialog from "../email/SendEmailDialog";
import LeadPropertyMatching from "./LeadPropertyMatching";
import AILeadScoring from "../opportunities/AILeadScoring";
import DocumentUploader from "../documents/DocumentUploader";
import ContactMatching from "./ContactMatching";
import ContactRequirements from "./ContactRequirements";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Wrapper component to fetch contact for requirements from lead
function ContactRequirementsFromLead({ lead }) {
  const { data: contact, isLoading } = useQuery({
    queryKey: ['clientContactFromLead', lead.id, lead.buyer_email, lead.contact_id, lead.profile_id],
    queryFn: async () => {
      // Primeiro tenta pelo contact_id ou profile_id
      if (lead.contact_id || lead.profile_id) {
        const contacts = await base44.entities.ClientContact.filter({ id: lead.contact_id || lead.profile_id });
        if (contacts[0]) return contacts[0];
      }
      
      // Depois procura contacto que tenha esta oportunidade ligada
      const allContacts = await base44.entities.ClientContact.list();
      const linkedContact = allContacts.find(c => 
        c.linked_opportunity_ids?.includes(lead.id)
      );
      if (linkedContact) return linkedContact;
      
      // Por fim, procura pelo email
      if (lead.buyer_email) {
        const byEmail = allContacts.find(c => c.email === lead.buyer_email);
        if (byEmail) return byEmail;
      }
      
      return null;
    },
    enabled: !!lead
  });

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!contact) {
    return (
      <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
        <CardContent className="p-4 text-center">
          <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Sem contacto associado</p>
          <p className="text-xs text-slate-400">Converta a oportunidade em contacto para definir requisitos</p>
        </CardContent>
      </Card>
    );
  }

  return <ContactRequirements contact={contact} />;
}

export default function LeadDetailPanel({ lead, onClose, onUpdate, properties = [], onEdit }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = React.useState("");
  const [addingNote, setAddingNote] = React.useState(false);
  const [newFollowUp, setNewFollowUp] = React.useState({ type: "call", notes: "", date: "" });
  const [addingFollowUp, setAddingFollowUp] = React.useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const { data: communications = [] } = useQuery({
    queryKey: ['communicationLogs', lead.id],
    queryFn: async () => {
      const all = await base44.entities.CommunicationLog.list('-communication_date');
      return all.filter(c => c.contact_id === lead.contact_id || c.contact_id === lead.profile_id);
    },
    enabled: !!lead.contact_id || !!lead.profile_id
  });

  const convertToContactMutation = useMutation({
    mutationFn: async () => {
      const contactTypeMap = {
        'comprador': 'client',
        'vendedor': 'client',
        'parceiro_comprador': 'partner',
        'parceiro_vendedor': 'partner'
      };

      let propertyRequirements = {};
      
      if (lead.message || lead.budget || lead.location || lead.property_type_interest) {
        try {
          const textToAnalyze = `
            Nome: ${lead.buyer_name}
            Tipo: ${lead.lead_type}
            Localização: ${lead.location || ''}
            Orçamento: ${lead.budget || ''}
            Tipo de imóvel: ${lead.property_type_interest || ''}
            Mensagem: ${lead.message || ''}
            Imóvel de interesse: ${lead.property_title || ''}
          `;

          const extracted = await base44.integrations.Core.InvokeLLM({
            prompt: `Analisa as informações deste lead e extrai requisitos de imóvel:

${textToAnalyze}

Extrai:
- listing_type: sale, rent ou both
- budget_min e budget_max (números)
- locations: array de cidades/localizações
- property_types: array (apartment, house, townhouse, condo, land, commercial, building)
- bedrooms_min e bedrooms_max
- bathrooms_min
- area_min e area_max (m²)
- amenities: array de comodidades desejadas
- additional_notes: outras preferências mencionadas`,
            response_json_schema: {
              type: "object",
              properties: {
                listing_type: { type: "string" },
                budget_min: { type: "number" },
                budget_max: { type: "number" },
                locations: { type: "array", items: { type: "string" } },
                property_types: { type: "array", items: { type: "string" } },
                bedrooms_min: { type: "number" },
                bedrooms_max: { type: "number" },
                bathrooms_min: { type: "number" },
                area_min: { type: "number" },
                area_max: { type: "number" },
                amenities: { type: "array", items: { type: "string" } },
                additional_notes: { type: "string" }
              }
            }
          });

          propertyRequirements = {
            listing_type: extracted.listing_type || "sale",
            property_types: extracted.property_types || [],
            locations: extracted.locations?.length > 0 ? extracted.locations : (lead.location ? [lead.location] : []),
            budget_min: extracted.budget_min || lead.budget || 0,
            budget_max: extracted.budget_max || lead.budget || 0,
            bedrooms_min: extracted.bedrooms_min || null,
            bedrooms_max: extracted.bedrooms_max || null,
            bathrooms_min: extracted.bathrooms_min || null,
            area_min: extracted.area_min || null,
            area_max: extracted.area_max || null,
            amenities: extracted.amenities || [],
            additional_notes: extracted.additional_notes || ""
          };
        } catch (e) {
          propertyRequirements = {
            listing_type: "sale",
            locations: lead.location ? [lead.location] : [],
            budget_min: lead.budget || 0,
            budget_max: lead.budget || 0
          };
        }
      }
      
      const contactData = {
        full_name: lead.buyer_name,
        email: lead.buyer_email || "",
        phone: lead.buyer_phone || "",
        city: lead.location || "",
        contact_type: contactTypeMap[lead.lead_type] || 'client',
        source: lead.lead_source || "other",
        notes: `Tipo original: ${lead.lead_type === 'comprador' ? 'Comprador' : lead.lead_type === 'vendedor' ? 'Vendedor' : lead.lead_type === 'parceiro_comprador' ? 'Parceiro Comprador' : 'Parceiro Vendedor'}\n\n${lead.message || ""}`,
        linked_opportunity_ids: [lead.id],
        property_requirements: propertyRequirements
      };
      return await base44.entities.ClientContact.create(contactData);
    },
    onSuccess: () => {
      toast.success("Lead convertido em contacto com requisitos extraídos!");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
    },
    onError: () => {
      toast.error("Erro ao converter lead");
    }
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const updatedNotes = [
      ...(lead.quick_notes || []),
      {
        text: newNote,
        date: new Date().toISOString(),
        by: lead.assigned_to || lead.created_by
      }
    ];

    await onUpdate(lead.id, { quick_notes: updatedNotes });
    setNewNote("");
    setAddingNote(false);
    toast.success("Nota adicionada");
  };

  const handleAddFollowUp = async () => {
    if (!newFollowUp.date || !newFollowUp.notes) {
      toast.error("Preencha data e notas");
      return;
    }

    const updatedFollowUps = [
      ...(lead.follow_ups || []),
      {
        ...newFollowUp,
        date: new Date(newFollowUp.date).toISOString(),
        completed: false
      }
    ];

    await onUpdate(lead.id, { follow_ups: updatedFollowUps, next_followup_date: newFollowUp.date });
    setNewFollowUp({ type: "call", notes: "", date: "" });
    setAddingFollowUp(false);
    toast.success("Follow-up agendado");
  };

  const handleToggleFollowUpComplete = async (index) => {
    const updatedFollowUps = [...(lead.follow_ups || [])];
    updatedFollowUps[index].completed = !updatedFollowUps[index].completed;
    await onUpdate(lead.id, { follow_ups: updatedFollowUps });
  };

  const handleAssociateProperty = async (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      await onUpdate(lead.id, { 
        property_id: propertyId,
        property_title: property.title
      });
    }
  };

  const handleAISuggestion = async (followUp) => {
    const updatedFollowUps = [...(lead.follow_ups || []), followUp];
    await onUpdate(lead.id, { follow_ups: updatedFollowUps });
  };

  const handleSourceUpdate = async (source) => {
    await onUpdate(lead.id, { lead_source: source });
  };

  const handleStatusChange = async (newStatus) => {
    await onUpdate(lead.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    toast.success("Estado atualizado");
  };

  const handleQualificationChange = async (qualification) => {
    await onUpdate(lead.id, { qualification_status: qualification });
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    toast.success("Qualificação atualizada");
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const getStatusConfig = (status) => {
    const configs = {
      new: { label: 'Novo', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
      contacted: { label: 'Contactado', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Phone },
      qualified: { label: 'Qualificado', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Target },
      proposal: { label: 'Proposta', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: FileText },
      negotiation: { label: 'Negociação', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: TrendingUp },
      won: { label: 'Ganho', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
      lost: { label: 'Perdido', color: 'bg-red-100 text-red-800 border-red-200', icon: X }
    };
    return configs[status] || configs.new;
  };

  const getQualificationConfig = (qual) => {
    const configs = {
      hot: { label: 'Hot', color: 'bg-red-500 text-white', icon: Flame },
      warm: { label: 'Warm', color: 'bg-orange-500 text-white', icon: ThermometerSun },
      cold: { label: 'Cold', color: 'bg-blue-500 text-white', icon: Snowflake },
      unqualified: { label: 'Não Qualificado', color: 'bg-slate-400 text-white', icon: X }
    };
    return configs[qual] || null;
  };

  const getLeadTypeLabel = (type) => {
    const labels = {
      comprador: 'Comprador',
      vendedor: 'Vendedor',
      parceiro_comprador: 'Parceiro Comprador',
      parceiro_vendedor: 'Parceiro Vendedor'
    };
    return labels[type] || type;
  };

  const statusConfig = getStatusConfig(lead.status);
  const qualConfig = getQualificationConfig(lead.qualification_status);
  const StatusIcon = statusConfig.icon;

  const pendingFollowUps = (lead.follow_ups || []).filter(f => !f.completed);
  const overdueFollowups = pendingFollowUps.filter(f => new Date(f.date) < new Date());

  const panelContent = (
    <div className={`bg-white flex flex-col h-full max-h-screen ${!isFullscreen ? 'shadow-2xl' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {lead.ref_id && (
                <Badge variant="outline" className="text-white/70 border-white/30 text-xs">
                  {lead.ref_id}
                </Badge>
              )}
              <Badge className={qualConfig ? qualConfig.color : 'bg-slate-600'}>
                {qualConfig ? (
                  <span className="flex items-center gap-1">
                    <qualConfig.icon className="w-3 h-3" />
                    {qualConfig.label}
                  </span>
                ) : 'Sem qualificação'}
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold truncate">{lead.buyer_name}</h2>
            <p className="text-white/70 text-sm mt-1">{getLeadTypeLabel(lead.lead_type)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="text-white hover:bg-white/10"
              title={isFullscreen ? "Minimizar" : "Expandir"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Oportunidade
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => convertToContactMutation.mutate()}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Converter em Contacto
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => copyToClipboard(lead.buyer_email, 'Email')}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyToClipboard(lead.buyer_phone, 'Telefone')}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Telefone
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {lead.buyer_phone && (
            <a href={`tel:${lead.buyer_phone}`}>
              <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                <Phone className="w-4 h-4 mr-1" />
                Ligar
              </Button>
            </a>
          )}
          {lead.buyer_email && (
            <Button 
              size="sm" 
              variant="secondary" 
              className="bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={() => setEmailDialogOpen(true)}
            >
              <Mail className="w-4 h-4 mr-1" />
              Email
            </Button>
          )}
          {lead.buyer_phone && (
            <a href={`https://wa.me/${lead.buyer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="secondary" className="bg-green-600/80 hover:bg-green-600 text-white border-0">
                <MessageSquare className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
            </a>
          )}
          <Button 
            size="sm" 
            variant="secondary" 
            className="bg-white/10 hover:bg-white/20 text-white border-0"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">Estado:</span>
            <Select value={lead.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 w-auto min-w-[120px] bg-white/10 border-white/20 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Novo</SelectItem>
                <SelectItem value="contacted">Contactado</SelectItem>
                <SelectItem value="qualified">Qualificado</SelectItem>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="negotiation">Negociação</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">Qualificação:</span>
            <Select value={lead.qualification_status || ""} onValueChange={handleQualificationChange}>
              <SelectTrigger className="h-7 w-auto min-w-[100px] bg-white/10 border-white/20 text-white text-xs">
                <SelectValue placeholder="Definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">🔥 Hot</SelectItem>
                <SelectItem value="warm">🌡️ Warm</SelectItem>
                <SelectItem value="cold">❄️ Cold</SelectItem>
                <SelectItem value="unqualified">Não Qualificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alert for overdue follow-ups */}
      {overdueFollowups.length > 0 && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-800 font-medium">
            {overdueFollowups.length} follow-up{overdueFollowups.length > 1 ? 's' : ''} em atraso
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-6 mx-4 mt-4 flex-shrink-0">
          <TabsTrigger value="overview" className="text-xs">Resumo</TabsTrigger>
          <TabsTrigger value="matching" className="text-xs">Matching</TabsTrigger>
          <TabsTrigger value="communications" className="text-xs">Comunicações</TabsTrigger>
          <TabsTrigger value="properties" className="text-xs">Imóveis</TabsTrigger>
          <TabsTrigger value="followups" className="text-xs">Follow-ups</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">IA</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4 pb-20" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-600 mb-1">Orçamento</div>
                <div className="text-lg font-bold text-blue-900">
                  {lead.budget ? `€${lead.budget.toLocaleString()}` : '-'}
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-green-600 mb-1">Valor Estimado</div>
                <div className="text-lg font-bold text-green-900">
                  {lead.estimated_value ? `€${lead.estimated_value.toLocaleString()}` : '-'}
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-xs text-purple-600 mb-1">Probabilidade</div>
                <div className="text-lg font-bold text-purple-900">
                  {lead.probability || 50}%
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="text-xs text-amber-600 mb-1">Valor Ponderado</div>
                <div className="text-lg font-bold text-amber-900">
                  {lead.estimated_value 
                    ? `€${Math.round((lead.estimated_value * (lead.probability || 50)) / 100).toLocaleString()}`
                    : '-'}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informação de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  {lead.buyer_email && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <a href={`mailto:${lead.buyer_email}`} className="text-sm text-blue-600 hover:underline flex-1 truncate">
                        {lead.buyer_email}
                      </a>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => copyToClipboard(lead.buyer_email, 'Email')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {lead.buyer_phone && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <a href={`tel:${lead.buyer_phone}`} className="text-sm text-blue-600 hover:underline flex-1">
                        {lead.buyer_phone}
                      </a>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => copyToClipboard(lead.buyer_phone, 'Telefone')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                {lead.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    {lead.location}
                  </div>
                )}
                <Separator />
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Criado: {format(new Date(lead.created_date), "d MMM yyyy", { locale: pt })}
                  </span>
                  {lead.lead_source && (
                    <Badge variant="outline" className="text-xs">
                      Origem: {lead.lead_source}
                    </Badge>
                  )}
                  {lead.assigned_to && (
                    <Badge variant="outline" className="text-xs">
                      Agente: {lead.assigned_to.split('@')[0]}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Associated Property */}
            {lead.property_title && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Imóvel Associado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-blue-900">{lead.property_title}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={() => handleAssociateProperty("")}
                    >
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notas ({(lead.quick_notes || []).length})
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setAddingNote(!addingNote)}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {addingNote && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Escreva uma nota..."
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddNote} className="h-7 text-xs">Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingNote(false)} className="h-7 text-xs">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {lead.quick_notes?.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {[...lead.quick_notes].reverse().slice(0, 5).map((note, idx) => (
                      <div key={idx} className="bg-slate-50 rounded p-2">
                        <p className="text-sm text-slate-700">{note.text}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(note.date), { addSuffix: true, locale: pt })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">Sem notas</p>
                )}
              </CardContent>
            </Card>

            {/* Message */}
            {lead.message && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Mensagem Original</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg">
                    {lead.message}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Matching Tab */}
          <TabsContent value="matching" className="mt-0 space-y-4">
            {/* Contact Requirements - busca contacto pelo email ou linked_opportunity_ids */}
            <ContactRequirementsFromLead lead={lead} />
            
            <LeadPropertyMatching 
              lead={lead}
              onAssociateProperty={handleAssociateProperty}
            />
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="mt-0">
            <CommunicationPanel 
              lead={lead}
              onUpdate={onUpdate}
            />
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="mt-0 space-y-4">
            <LeadPropertyMatching 
              lead={lead}
              onAssociateProperty={handleAssociateProperty}
            />

            {/* Associated Properties */}
            {lead.associated_properties?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Imóveis Associados ({lead.associated_properties.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lead.associated_properties.map((ap, idx) => {
                    const prop = properties.find(p => p.id === ap.property_id);
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 border rounded-lg">
                        <div className="w-12 h-10 rounded overflow-hidden bg-slate-200 flex-shrink-0">
                          {prop?.images?.[0] ? (
                            <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ap.property_title}</p>
                          <Badge variant="outline" className="text-xs">
                            {ap.status === 'interested' ? 'Interessado' :
                             ap.status === 'visited' ? 'Visitado' :
                             ap.status === 'rejected' ? 'Rejeitado' : 'Negociando'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <DocumentUploader 
              leadId={lead.id}
              leadName={lead.buyer_name}
              propertyId={lead.property_id}
              propertyTitle={lead.property_title}
              entityType="lead"
            />
          </TabsContent>

          {/* Follow-ups Tab */}
          <TabsContent value="followups" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Follow-ups ({(lead.follow_ups || []).length})
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setAddingFollowUp(!addingFollowUp)}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Agendar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {addingFollowUp && (
                  <div className="space-y-2 border rounded-lg p-3 bg-blue-50">
                    <Select 
                      value={newFollowUp.type}
                      onValueChange={(value) => setNewFollowUp({...newFollowUp, type: value})}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">📞 Chamada</SelectItem>
                        <SelectItem value="email">📧 Email</SelectItem>
                        <SelectItem value="meeting">🤝 Reunião</SelectItem>
                        <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="datetime-local"
                      value={newFollowUp.date}
                      onChange={(e) => setNewFollowUp({...newFollowUp, date: e.target.value})}
                      className="h-8 text-sm"
                    />
                    <Textarea
                      value={newFollowUp.notes}
                      onChange={(e) => setNewFollowUp({...newFollowUp, notes: e.target.value})}
                      placeholder="Notas do follow-up..."
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddFollowUp} className="h-7 text-xs">Agendar</Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingFollowUp(false)} className="h-7 text-xs">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {lead.follow_ups?.length > 0 ? (
                  <div className="space-y-2">
                    {[...lead.follow_ups].sort((a, b) => 
                      new Date(a.date) - new Date(b.date)
                    ).map((followUp, idx) => {
                      const isOverdue = !followUp.completed && new Date(followUp.date) < new Date();
                      return (
                        <div 
                          key={idx} 
                          className={`border rounded-lg p-3 transition-colors ${
                            followUp.completed 
                              ? 'bg-green-50 border-green-200' 
                              : isOverdue 
                                ? 'bg-red-50 border-red-200'
                                : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {followUp.type === 'call' ? '📞' :
                                 followUp.type === 'email' ? '📧' :
                                 followUp.type === 'meeting' ? '🤝' : '💬'}
                              </span>
                              <div>
                                <p className="text-sm font-medium">
                                  {followUp.type === 'call' ? 'Chamada' :
                                   followUp.type === 'email' ? 'Email' :
                                   followUp.type === 'meeting' ? 'Reunião' : 'WhatsApp'}
                                </p>
                                <p className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                                  {format(new Date(followUp.date), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                                  {isOverdue && ' (Em atraso)'}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleFollowUpComplete(idx)}
                              className="h-7 w-7"
                            >
                              <CheckCircle2 
                                className={`w-5 h-5 ${
                                  followUp.completed ? 'text-green-600' : 'text-slate-300 hover:text-green-500'
                                }`}
                              />
                            </Button>
                          </div>
                          <p className="text-sm text-slate-700 mt-2">{followUp.notes}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">Sem follow-ups agendados</p>
                )}
              </CardContent>
            </Card>

            {/* Next Follow-up Date */}
            {lead.next_followup_date && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Próximo Follow-up</p>
                      <p className="text-xs text-amber-700">
                        {format(new Date(lead.next_followup_date), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-0 space-y-4">
            {/* AI Communication Assistant */}
            <AICommunicationAssistant 
              contact={null}
              opportunity={lead}
              communications={communications}
              properties={properties}
            />
            
            <AILeadScoring opportunity={lead} />
            
            <AIAssistant 
              lead={lead}
              onSuggestionAccept={handleAISuggestion}
            />

            {!lead.lead_source && (
              <Card className="border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Classificar Origem com IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <LeadSourceClassifier 
                    lead={lead}
                    onSourceUpdate={handleSourceUpdate}
                  />
                </CardContent>
              </Card>
            )}

            {/* Convert to Contact */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">Converter em Contacto</p>
                    <p className="text-xs text-green-700">A IA irá extrair automaticamente os requisitos de imóvel</p>
                  </div>
                  <Button 
                    onClick={() => convertToContactMutation.mutate()}
                    disabled={convertToContactMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {convertToContactMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        A analisar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-1" />
                        Converter
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Send Email Dialog */}
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        recipient={{
          type: 'opportunity',
          id: lead.id,
          name: lead.buyer_name,
          email: lead.buyer_email,
          data: {
            name: lead.buyer_name,
            email: lead.buyer_email,
            phone: lead.buyer_phone,
            location: lead.location,
            property_title: lead.property_title,
            budget: lead.budget
          }
        }}
      />
    </div>
  );

  // Render as fullscreen dialog or side panel
  if (isFullscreen) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && setIsFullscreen(false)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden">
          {panelContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[780px] z-50 overflow-hidden">
      {panelContent}
    </div>
  );
}