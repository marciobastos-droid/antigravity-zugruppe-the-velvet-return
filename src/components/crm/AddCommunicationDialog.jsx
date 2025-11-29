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
      follow_up_notes: "",
      email_status: "",
      email_opened_at: "",
      email_replied_at: "",
      call_outcome: "",
      call_duration_seconds: "",
      call_quality_rating: "",
      whatsapp_status: "",
      whatsapp_delivered_at: "",
      whatsapp_read_at: "",
      whatsapp_replied_at: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const user = await base44.auth.me();
    
    const data = {
      contact_id: contactId,
      contact_name: contactName,
      agent_email: user?.email,
      agent_name: user?.full_name,
      ...formData,
      duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : undefined,
      communication_date: new Date(formData.communication_date).toISOString(),
      follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : undefined,
      // Email fields
      email_status: formData.email_status || undefined,
      email_opened_at: formData.email_opened_at ? new Date(formData.email_opened_at).toISOString() : undefined,
      email_replied_at: formData.email_replied_at ? new Date(formData.email_replied_at).toISOString() : undefined,
      // Phone fields
      call_outcome: formData.call_outcome || undefined,
      call_duration_seconds: formData.call_duration_seconds ? Number(formData.call_duration_seconds) : undefined,
      call_quality_rating: formData.call_quality_rating ? Number(formData.call_quality_rating) : undefined,
      // WhatsApp fields
      whatsapp_status: formData.whatsapp_status || undefined,
      whatsapp_delivered_at: formData.whatsapp_delivered_at ? new Date(formData.whatsapp_delivered_at).toISOString() : undefined,
      whatsapp_read_at: formData.whatsapp_read_at ? new Date(formData.whatsapp_read_at).toISOString() : undefined,
      whatsapp_replied_at: formData.whatsapp_replied_at ? new Date(formData.whatsapp_replied_at).toISOString() : undefined
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
                <SelectItem value="voicemail">📞 Caixa de correio</SelectItem>
                <SelectItem value="busy">📵 Ocupado</SelectItem>
                <SelectItem value="wrong_number">❌ Número errado</SelectItem>
                <SelectItem value="other">📝 Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {formData.communication_type === "email" && (
            <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <Mail className="w-4 h-4" />
                Detalhes do Email
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Estado do Email</Label>
                  <Select value={formData.email_status} onValueChange={(v) => setFormData({...formData, email_status: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent"><Send className="w-3 h-3 inline mr-1" /> Enviado</SelectItem>
                      <SelectItem value="delivered"><CheckCircle2 className="w-3 h-3 inline mr-1" /> Entregue</SelectItem>
                      <SelectItem value="opened"><Eye className="w-3 h-3 inline mr-1" /> Aberto</SelectItem>
                      <SelectItem value="clicked">🔗 Clicado</SelectItem>
                      <SelectItem value="replied"><Reply className="w-3 h-3 inline mr-1" /> Respondido</SelectItem>
                      <SelectItem value="bounced">⚠️ Devolvido</SelectItem>
                      <SelectItem value="failed">❌ Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de Abertura</Label>
                  <Input
                    type="datetime-local"
                    value={formData.email_opened_at}
                    onChange={(e) => setFormData({...formData, email_opened_at: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Data de Resposta</Label>
                  <Input
                    type="datetime-local"
                    value={formData.email_replied_at}
                    onChange={(e) => setFormData({...formData, email_replied_at: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {formData.communication_type === "phone_call" && (
            <div className="border rounded-lg p-4 bg-green-50 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <Phone className="w-4 h-4" />
                Detalhes da Chamada
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <Label>Resultado da Chamada</Label>
                  <Select value={formData.call_outcome} onValueChange={(v) => setFormData({...formData, call_outcome: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">✅ Concluída</SelectItem>
                      <SelectItem value="answered">📞 Atendida</SelectItem>
                      <SelectItem value="no_answer">📵 Sem resposta</SelectItem>
                      <SelectItem value="busy">🔴 Ocupado</SelectItem>
                      <SelectItem value="voicemail">📞 Caixa de correio</SelectItem>
                      <SelectItem value="callback_scheduled">🔄 Callback agendado</SelectItem>
                      <SelectItem value="wrong_number">❌ Número errado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração (segundos)</Label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      value={formData.call_duration_seconds}
                      onChange={(e) => setFormData({...formData, call_duration_seconds: e.target.value})}
                      placeholder="120"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label>Qualidade (1-5)</Label>
                  <Select value={formData.call_quality_rating} onValueChange={(v) => setFormData({...formData, call_quality_rating: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Avaliar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">⭐⭐⭐⭐⭐</SelectItem>
                      <SelectItem value="4">⭐⭐⭐⭐</SelectItem>
                      <SelectItem value="3">⭐⭐⭐</SelectItem>
                      <SelectItem value="2">⭐⭐</SelectItem>
                      <SelectItem value="1">⭐</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {formData.communication_type === "whatsapp" && (
            <div className="border rounded-lg p-4 bg-emerald-50 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <MessageCircle className="w-4 h-4" />
                Detalhes do WhatsApp
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Estado da Mensagem</Label>
                  <Select value={formData.whatsapp_status} onValueChange={(v) => setFormData({...formData, whatsapp_status: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent">📤 Enviada</SelectItem>
                      <SelectItem value="delivered">✓✓ Entregue</SelectItem>
                      <SelectItem value="read">✓✓ Lida</SelectItem>
                      <SelectItem value="replied">↩️ Respondida</SelectItem>
                      <SelectItem value="failed">❌ Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Entregue em</Label>
                  <Input
                    type="datetime-local"
                    value={formData.whatsapp_delivered_at}
                    onChange={(e) => setFormData({...formData, whatsapp_delivered_at: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Lida em</Label>
                  <Input
                    type="datetime-local"
                    value={formData.whatsapp_read_at}
                    onChange={(e) => setFormData({...formData, whatsapp_read_at: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Respondida em</Label>
                  <Input
                    type="datetime-local"
                    value={formData.whatsapp_replied_at}
                    onChange={(e) => setFormData({...formData, whatsapp_replied_at: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

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