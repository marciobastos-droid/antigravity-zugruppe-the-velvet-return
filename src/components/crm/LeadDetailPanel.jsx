import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, User, Mail, Phone, MapPin, Building2, Calendar, MessageSquare, Plus, CheckCircle2, Clock, Target, UserPlus, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import AIAssistant from "./AIAssistant";
import LeadSourceClassifier from "./LeadSourceClassifier";
import CommunicationPanel from "./CommunicationPanel";

export default function LeadDetailPanel({ lead, onClose, onUpdate, properties = [] }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = React.useState("");
  const [addingNote, setAddingNote] = React.useState(false);
  const [newFollowUp, setNewFollowUp] = React.useState({ type: "call", notes: "", date: "" });
  const [propertyLocationFilter, setPropertyLocationFilter] = React.useState("");
  const [addingFollowUp, setAddingFollowUp] = React.useState(false);

  const convertToContactMutation = useMutation({
    mutationFn: async () => {
      // Map lead_type to contact_type
      const contactTypeMap = {
        'comprador': 'client',
        'vendedor': 'client',
        'parceiro_comprador': 'partner',
        'parceiro_vendedor': 'partner'
      };
      
      const contactData = {
        full_name: lead.buyer_name,
        email: lead.buyer_email || "",
        phone: lead.buyer_phone || "",
        city: lead.location || "",
        contact_type: contactTypeMap[lead.lead_type] || 'client',
        source: lead.lead_source || "other",
        notes: `Tipo original: ${lead.lead_type === 'comprador' ? 'Comprador' : lead.lead_type === 'vendedor' ? 'Vendedor' : lead.lead_type === 'parceiro_comprador' ? 'Parceiro Comprador' : 'Parceiro Vendedor'}\n\n${lead.message || ""}`,
        linked_opportunity_ids: [lead.id]
      };
      return await base44.entities.ClientContact.create(contactData);
    },
    onSuccess: () => {
      toast.success("Lead convertido em contacto!");
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

    await onUpdate(lead.id, { follow_ups: updatedFollowUps });
    setNewFollowUp({ type: "call", notes: "", date: "" });
    setAddingFollowUp(false);
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

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{lead.buyer_name}</h2>
          <Badge className="mt-1">
            {lead.lead_type === 'comprador' ? 'Comprador' : 
             lead.lead_type === 'vendedor' ? 'Vendedor' : 
             lead.lead_type === 'parceiro_comprador' ? 'Parceiro Comprador' :
             lead.lead_type === 'parceiro_vendedor' ? 'Parceiro Vendedor' : 'Parceiro'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => convertToContactMutation.mutate()}
            disabled={convertToContactMutation.isPending}
            className="text-green-600 border-green-300 hover:bg-green-50"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            {convertToContactMutation.isPending ? "A converter..." : "Converter em Contacto"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Communication Panel */}
        <CommunicationPanel 
          lead={lead}
          onUpdate={onUpdate}
        />

        {/* AI Assistant */}
        <AIAssistant 
          lead={lead}
          onSuggestionAccept={handleAISuggestion}
        />

        {/* Lead Source Classifier */}
        {!lead.lead_source && (
          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-sm">Classificar Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadSourceClassifier 
                lead={lead}
                onSourceUpdate={handleSourceUpdate}
              />
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Informação de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.buyer_email && (
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${lead.buyer_email}`} className="hover:text-blue-600">
                  {lead.buyer_email}
                </a>
              </div>
            )}
            {lead.buyer_phone && (
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4" />
                <a href={`tel:${lead.buyer_phone}`} className="hover:text-blue-600">
                  {lead.buyer_phone}
                </a>
              </div>
            )}
            {lead.location && (
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4" />
                {lead.location}
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4" />
              Criado: {format(new Date(lead.created_date), 'dd/MM/yyyy HH:mm')}
            </div>
            {lead.lead_source && (
              <div className="mt-2 pt-2 border-t">
                <Badge variant="outline" className="text-xs">
                  Origem: {lead.lead_source}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Associated Property */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Imóvel de Interesse
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.property_title ? (
              <div className="bg-blue-50 rounded p-3 mb-2">
                <p className="font-medium text-blue-900">{lead.property_title}</p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto text-xs"
                  onClick={() => handleAssociateProperty("")}
                >
                  Remover associação
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    value={propertyLocationFilter}
                    onChange={(e) => setPropertyLocationFilter(e.target.value)}
                    placeholder="Filtrar por localização..."
                    className="pl-9"
                  />
                </div>
                <Select onValueChange={handleAssociateProperty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Associar a um imóvel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties
                      .filter(p => 
                        propertyLocationFilter === "" ||
                        p.city?.toLowerCase().includes(propertyLocationFilter.toLowerCase()) ||
                        p.address?.toLowerCase().includes(propertyLocationFilter.toLowerCase()) ||
                        p.state?.toLowerCase().includes(propertyLocationFilter.toLowerCase())
                      )
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span>{p.title} - €{p.price?.toLocaleString()}</span>
                            <span className="text-xs text-slate-500">{p.city}{p.address ? `, ${p.address}` : ''}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Qualification */}
        {lead.qualification_status && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Qualificação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Score:</span>
                  <Badge variant="outline">{lead.qualification_score}/100</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status:</span>
                  <Badge>
                    {lead.qualification_status === 'hot' ? '🔥 Quente' :
                     lead.qualification_status === 'warm' ? '🌡️ Morno' : '❄️ Frio'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notas Rápidas
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setAddingNote(!addingNote)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addingNote && (
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escreva uma nota..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddNote}>Guardar</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingNote(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {lead.quick_notes?.length > 0 ? (
              <div className="space-y-2">
                {[...lead.quick_notes].reverse().map((note, idx) => (
                  <div key={idx} className="bg-slate-50 rounded p-3">
                    <p className="text-sm text-slate-700">{note.text}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(note.date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sem notas</p>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Follow-ups
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setAddingFollowUp(!addingFollowUp)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agendar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addingFollowUp && (
              <div className="space-y-2 border rounded p-3">
                <Select 
                  value={newFollowUp.type}
                  onValueChange={(value) => setNewFollowUp({...newFollowUp, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">📞 Chamada</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="meeting">🤝 Reunião</SelectItem>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  type="datetime-local"
                  value={newFollowUp.date}
                  onChange={(e) => setNewFollowUp({...newFollowUp, date: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <Textarea
                  value={newFollowUp.notes}
                  onChange={(e) => setNewFollowUp({...newFollowUp, notes: e.target.value})}
                  placeholder="Notas do follow-up..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddFollowUp}>Agendar</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingFollowUp(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {lead.follow_ups?.length > 0 ? (
              <div className="space-y-2">
                {[...lead.follow_ups].sort((a, b) => 
                  new Date(b.date) - new Date(a.date)
                ).map((followUp, idx) => (
                  <div 
                    key={idx} 
                    className={`border rounded p-3 ${
                      followUp.completed ? 'bg-green-50 border-green-200' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
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
                          <p className="text-xs text-slate-600">
                            {format(new Date(followUp.date), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleFollowUpComplete(lead.follow_ups.length - 1 - idx)}
                      >
                        <CheckCircle2 
                          className={`w-4 h-4 ${
                            followUp.completed ? 'text-green-600' : 'text-slate-400'
                          }`}
                        />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-700">{followUp.notes}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sem follow-ups agendados</p>
            )}
          </CardContent>
        </Card>

        {/* Message */}
        {lead.message && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mensagem Original</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-line">{lead.message}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}