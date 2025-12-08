import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MessageSquare, Calendar, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function QuickCommunicationLogger({ contact, opportunity, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'call',
    direction: 'outbound',
    subject: '',
    summary: '',
    outcome: 'successful',
    duration_minutes: 0
  });

  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('logCommunication', {
        contact_id: contact?.id,
        contact_email: contact?.email,
        opportunity_id: opportunity?.id,
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success("Comunicação registada!");
      setOpen(false);
      setFormData({
        type: 'call',
        direction: 'outbound',
        subject: '',
        summary: '',
        outcome: 'successful',
        duration_minutes: 0
      });
    },
    onError: () => {
      toast.error("Erro ao registar comunicação");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    logMutation.mutate(formData);
  };

  const typeIcons = {
    call: Phone,
    email: Mail,
    whatsapp: MessageSquare,
    meeting: Calendar
  };

  const TypeIcon = typeIcons[formData.type];

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, { onClick: () => setOpen(true) })
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Phone className="w-4 h-4 mr-2" />
          Registar Contacto
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registar Comunicação</DialogTitle>
            {contact && <p className="text-sm text-slate-600">{contact.full_name}</p>}
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Chamada
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="meeting">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Reunião
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Direção</Label>
                <Select value={formData.direction} onValueChange={(v) => setFormData({...formData, direction: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Saída</SelectItem>
                    <SelectItem value="inbound">Entrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Assunto</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Ex: Discussão sobre imóvel X"
              />
            </div>

            <div>
              <Label>Resumo *</Label>
              <Textarea
                required
                value={formData.summary}
                onChange={(e) => setFormData({...formData, summary: e.target.value})}
                placeholder="Descreva o que foi discutido..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Resultado</Label>
                <Select value={formData.outcome} onValueChange={(v) => setFormData({...formData, outcome: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="successful">Bem Sucedido</SelectItem>
                    <SelectItem value="no_answer">Sem Resposta</SelectItem>
                    <SelectItem value="scheduled_followup">Agendado Follow-up</SelectItem>
                    <SelectItem value="failed">Falhado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'call' && (
                <div>
                  <Label>Duração (min)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={logMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {logMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TypeIcon className="w-4 h-4 mr-2" />
                )}
                Registar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}