import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Loader2, Download, Save, Sparkles, 
  Plus, Trash2, Check, Calendar, User, Building2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MeetingNotesGenerator({ appointment, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState({
    title: `Reunião - ${appointment?.title || ''}`,
    date: appointment?.appointment_date || new Date().toISOString(),
    attendees: [
      appointment?.client_name || '',
      appointment?.assigned_agent || ''
    ].filter(Boolean).join(', '),
    property: appointment?.property_title || '',
    agenda: '',
    discussion_points: [''],
    action_items: [''],
    next_steps: '',
    conclusions: '',
    attachments: []
  });

  // Generate notes with AI
  const generateWithAI = async () => {
    setGenerating(true);
    
    try {
      const context = `
Reunião: ${appointment.title}
Data: ${format(new Date(appointment.appointment_date), "PPP 'às' HH:mm", { locale: ptBR })}
Cliente: ${appointment.client_name}
Agente: ${appointment.assigned_agent}
Imóvel: ${appointment.property_title || 'N/A'}
Endereço: ${appointment.property_address || 'N/A'}
Notas existentes: ${appointment.notes || 'Sem notas'}
`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Com base nas informações desta reunião imobiliária, gera notas estruturadas profissionais:

${context}

Gera notas completas incluindo:
- Agenda da reunião
- Pontos de discussão principais (3-5 pontos)
- Itens de ação (2-4 itens)
- Próximos passos
- Conclusões

Usa português de Portugal, tom profissional mas acessível.`,
        response_json_schema: {
          type: "object",
          properties: {
            agenda: { type: "string" },
            discussion_points: { type: "array", items: { type: "string" } },
            action_items: { type: "array", items: { type: "string" } },
            next_steps: { type: "string" },
            conclusions: { type: "string" }
          }
        }
      });

      setNotes(prev => ({
        ...prev,
        agenda: result.agenda || prev.agenda,
        discussion_points: result.discussion_points?.length > 0 ? result.discussion_points : prev.discussion_points,
        action_items: result.action_items?.length > 0 ? result.action_items : prev.action_items,
        next_steps: result.next_steps || prev.next_steps,
        conclusions: result.conclusions || prev.conclusions
      }));

      toast.success("Notas geradas com IA!");
    } catch (error) {
      toast.error("Erro ao gerar notas com IA");
    }

    setGenerating(false);
  };

  // Save as PropertyDocument
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Generate formatted document content
      const documentContent = `
NOTAS DE REUNIÃO
================

${notes.title}
${format(new Date(notes.date), "PPP 'às' HH:mm", { locale: ptBR })}

PARTICIPANTES
-------------
${notes.attendees}

${notes.property ? `IMÓVEL DISCUTIDO\n----------------\n${notes.property}\n\n` : ''}

AGENDA
------
${notes.agenda}

PONTOS DE DISCUSSÃO
-------------------
${notes.discussion_points.filter(p => p.trim()).map((p, i) => `${i + 1}. ${p}`).join('\n')}

ITENS DE AÇÃO
-------------
${notes.action_items.filter(a => a.trim()).map((a, i) => `☐ ${a}`).join('\n')}

PRÓXIMOS PASSOS
---------------
${notes.next_steps}

CONCLUSÕES
----------
${notes.conclusions}

---
Documento gerado automaticamente em ${format(new Date(), "PPP 'às' HH:mm", { locale: ptBR })}
`;

      // Create document in PropertyDocument entity
      if (appointment.property_id) {
        await base44.entities.PropertyDocument.create({
          property_id: appointment.property_id,
          property_title: appointment.property_title,
          document_name: notes.title,
          document_type: 'other',
          description: documentContent,
          is_public: false,
          status: 'draft',
          tags: ['reunião', 'notas', 'appointment'],
          linked_contact_names: [appointment.client_name].filter(Boolean)
        });
      }

      // Update appointment with notes
      await base44.entities.Appointment.update(appointment.id, {
        notes: documentContent,
        status: 'completed'
      });

      return documentContent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['propertyDocuments'] });
      toast.success("Notas guardadas com sucesso!");
      onOpenChange(false);
    }
  });

  // Download as text file
  const downloadNotes = () => {
    const documentContent = `
NOTAS DE REUNIÃO
================

${notes.title}
${format(new Date(notes.date), "PPP 'às' HH:mm", { locale: ptBR })}

PARTICIPANTES: ${notes.attendees}
${notes.property ? `IMÓVEL: ${notes.property}` : ''}

AGENDA
------
${notes.agenda}

PONTOS DE DISCUSSÃO
-------------------
${notes.discussion_points.filter(p => p.trim()).map((p, i) => `${i + 1}. ${p}`).join('\n')}

ITENS DE AÇÃO
-------------
${notes.action_items.filter(a => a.trim()).map((a, i) => `☐ ${a}`).join('\n')}

PRÓXIMOS PASSOS
---------------
${notes.next_steps}

CONCLUSÕES
----------
${notes.conclusions}
`;

    const blob = new Blob([documentContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notas-reuniao-${format(new Date(notes.date), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success("Notas descarregadas!");
  };

  const addDiscussionPoint = () => {
    setNotes(prev => ({
      ...prev,
      discussion_points: [...prev.discussion_points, '']
    }));
  };

  const updateDiscussionPoint = (index, value) => {
    setNotes(prev => ({
      ...prev,
      discussion_points: prev.discussion_points.map((p, i) => i === index ? value : p)
    }));
  };

  const removeDiscussionPoint = (index) => {
    setNotes(prev => ({
      ...prev,
      discussion_points: prev.discussion_points.filter((_, i) => i !== index)
    }));
  };

  const addActionItem = () => {
    setNotes(prev => ({
      ...prev,
      action_items: [...prev.action_items, '']
    }));
  };

  const updateActionItem = (index, value) => {
    setNotes(prev => ({
      ...prev,
      action_items: prev.action_items.map((a, i) => i === index ? value : a)
    }));
  };

  const removeActionItem = (index) => {
    setNotes(prev => ({
      ...prev,
      action_items: prev.action_items.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Gerar Notas de Reunião
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <Calendar className="w-4 h-4" />
                Data
              </div>
              <p className="font-medium">
                {format(new Date(notes.date), "PPP", { locale: ptBR })}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                <User className="w-4 h-4" />
                Cliente
              </div>
              <p className="font-medium">{appointment.client_name}</p>
            </div>
            {notes.property && (
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <Building2 className="w-4 h-4" />
                  Imóvel
                </div>
                <p className="font-medium text-sm truncate">{notes.property}</p>
              </div>
            )}
          </div>

          {/* AI Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={generateWithAI}
              disabled={generating}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {generating ? "A gerar com IA..." : "Gerar Notas com IA"}
            </Button>
          </div>

          {/* Title */}
          <div>
            <Label>Título</Label>
            <Input
              value={notes.title}
              onChange={(e) => setNotes({ ...notes, title: e.target.value })}
              placeholder="Título da reunião"
            />
          </div>

          {/* Attendees */}
          <div>
            <Label>Participantes</Label>
            <Input
              value={notes.attendees}
              onChange={(e) => setNotes({ ...notes, attendees: e.target.value })}
              placeholder="Nomes dos participantes (separados por vírgula)"
            />
          </div>

          {/* Agenda */}
          <div>
            <Label>Agenda</Label>
            <Textarea
              value={notes.agenda}
              onChange={(e) => setNotes({ ...notes, agenda: e.target.value })}
              placeholder="Pontos principais da agenda da reunião..."
              rows={3}
            />
          </div>

          {/* Discussion Points */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Pontos de Discussão</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addDiscussionPoint}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {notes.discussion_points.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={point}
                    onChange={(e) => updateDiscussionPoint(index, e.target.value)}
                    placeholder={`Ponto ${index + 1}...`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDiscussionPoint(index)}
                    disabled={notes.discussion_points.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens de Ação</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addActionItem}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {notes.action_items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateActionItem(index, e.target.value)}
                    placeholder={`Ação ${index + 1}...`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeActionItem(index)}
                    disabled={notes.action_items.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <Label>Próximos Passos</Label>
            <Textarea
              value={notes.next_steps}
              onChange={(e) => setNotes({ ...notes, next_steps: e.target.value })}
              placeholder="Definir os próximos passos e follow-ups necessários..."
              rows={3}
            />
          </div>

          {/* Conclusions */}
          <div>
            <Label>Conclusões</Label>
            <Textarea
              value={notes.conclusions}
              onChange={(e) => setNotes({ ...notes, conclusions: e.target.value })}
              placeholder="Resumo das conclusões da reunião..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={downloadNotes}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Descarregar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Notas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}