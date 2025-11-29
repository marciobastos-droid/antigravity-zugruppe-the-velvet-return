import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Mail, MessageCircle, Clock, CheckCircle2, Send, Eye, Reply } from "lucide-react";

export default function AddCommunicationDialog({ open, onOpenChange, contactId, contactName }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = React.useState({
    communication_type: "phone_call",
    direction: "outbound",
    subject: "",
    summary: "",
    detailed_notes: "",
    outcome: "",
    duration_minutes: "",
    communication_date: new Date().toISOString().slice(0, 16),
    follow_up_required: false,
    follow_up_date: "",
    follow_up_notes: "",
    // Email specific
    email_status: "",
    email_opened_at: "",
    email_replied_at: "",
    // Phone specific
    call_outcome: "",
    call_duration_seconds: "",
    call_quality_rating: "",
    // WhatsApp specific
    whatsapp_status: "",
    whatsapp_delivered_at: "",
    whatsapp_read_at: "",
    whatsapp_replied_at: ""
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CommunicationLog.create(data),
    onSuccess: () => {
      toast.success("Comunicação registada");
      queryClient.invalidateQueries({ queryKey: ['communicationLogs'] });
      onOpenChange(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      communication_type: "phone_call",
      direction: "outbound",
      subject: "",
      summary: "",
      detailed_notes: "",
      outcome: "",
      duration_minutes: "",
      communication_date: new Date().toISOString().slice(0, 16),
      follow_up_required: false,
      follow_up_date: "",
      follow_up_notes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      contact_id: contactId,
      contact_name: contactName,
      ...formData,
      duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : undefined,
      communication_date: new Date(formData.communication_date).toISOString(),
      follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : undefined
    };

    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registar Comunicação - {contactName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Comunicação *</Label>
              <Select 
                value={formData.communication_type} 
                onValueChange={(v) => setFormData({...formData, communication_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone_call">📞 Chamada Telefónica</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="sms">📱 SMS</SelectItem>
                  <SelectItem value="meeting">🤝 Reunião Presencial</SelectItem>
                  <SelectItem value="video_call">🎥 Videochamada</SelectItem>
                  <SelectItem value="site_visit">🏠 Visita a Imóvel</SelectItem>
                  <SelectItem value="other">📝 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Direção</Label>
              <Select 
                value={formData.direction} 
                onValueChange={(v) => setFormData({...formData, direction: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">↗️ Enviado/Realizado</SelectItem>
                  <SelectItem value="inbound">↙️ Recebido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Data e Hora *</Label>
              <Input
                type="datetime-local"
                value={formData.communication_date}
                onChange={(e) => setFormData({...formData, communication_date: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                placeholder="15"
              />
            </div>
          </div>

          <div>
            <Label>Assunto</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="Ex: Acompanhamento sobre imóvel X"
            />
          </div>

          <div>
            <Label>Resumo *</Label>
            <Textarea
              required
              value={formData.summary}
              onChange={(e) => setFormData({...formData, summary: e.target.value})}
              placeholder="Breve resumo da comunicação..."
              rows={2}
            />
          </div>

          <div>
            <Label>Notas Detalhadas</Label>
            <Textarea
              value={formData.detailed_notes}
              onChange={(e) => setFormData({...formData, detailed_notes: e.target.value})}
              placeholder="Detalhes adicionais..."
              rows={3}
            />
          </div>

          <div>
            <Label>Resultado</Label>
            <Select 
              value={formData.outcome} 
              onValueChange={(v) => setFormData({...formData, outcome: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="successful">✅ Sucesso</SelectItem>
                <SelectItem value="no_answer">📵 Sem resposta</SelectItem>
                <SelectItem value="callback_requested">🔄 Callback solicitado</SelectItem>
                <SelectItem value="not_interested">❌ Sem interesse</SelectItem>
                <SelectItem value="scheduled_meeting">📅 Reunião agendada</SelectItem>
                <SelectItem value="closed_deal">🎉 Negócio fechado</SelectItem>
                <SelectItem value="other">📝 Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="follow_up"
                checked={formData.follow_up_required}
                onCheckedChange={(checked) => setFormData({...formData, follow_up_required: checked})}
              />
              <Label htmlFor="follow_up" className="cursor-pointer">Agendar Follow-up</Label>
            </div>

            {formData.follow_up_required && (
              <div className="space-y-3">
                <div>
                  <Label>Data do Follow-up</Label>
                  <Input
                    type="datetime-local"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Notas para o Follow-up</Label>
                  <Input
                    value={formData.follow_up_notes}
                    onChange={(e) => setFormData({...formData, follow_up_notes: e.target.value})}
                    placeholder="O que fazer no follow-up..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
              {createMutation.isPending ? "A guardar..." : "Registar Comunicação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}