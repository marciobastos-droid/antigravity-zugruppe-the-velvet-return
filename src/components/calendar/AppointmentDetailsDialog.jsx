import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, User, Home, Phone, Mail, Clock, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import MeetingNotesGenerator from "../appointments/MeetingNotesGenerator";

export default function AppointmentDetailsDialog({ event, open, onOpenChange }) {
  const [notesDialogOpen, setNotesDialogOpen] = React.useState(false);
  const [completionMode, setCompletionMode] = React.useState(false);
  const [completionData, setCompletionData] = React.useState({
    completion_notes: "",
    client_interest_level: "medium",
    next_steps: ""
  });
  const queryClient = useQueryClient();
  
  if (!event) return null;

  const completeAppointmentMutation = useMutation({
    mutationFn: async ({ status, notes }) => {
      return await base44.entities.Appointment.update(event.id, {
        status,
        completion_notes: notes.completion_notes,
        client_interest_level: notes.client_interest_level,
        next_steps: notes.next_steps,
        completed_date: new Date().toISOString(),
        completed_by: (await base44.auth.me()).email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Visita marcada como concluída");
      setCompletionMode(false);
      onOpenChange(false);
    }
  });

  const typeLabels = {
    appointment: { label: "Visita", color: "bg-blue-100 text-blue-700" },
    signature: { label: "Assinatura", color: "bg-purple-100 text-purple-700" },
    deed: { label: "Escritura", color: "bg-green-100 text-green-700" },
    renewal: { label: "Renovação", color: "bg-amber-100 text-amber-700" },
    followup: { label: "Follow-up", color: "bg-orange-100 text-orange-700" }
  };

  const statusLabels = {
    scheduled: { label: "Agendada", color: "bg-blue-100 text-blue-700" },
    confirmed: { label: "Confirmada", color: "bg-green-100 text-green-700" },
    completed: { label: "Concluída", color: "bg-slate-100 text-slate-700" },
    cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
    no_show: { label: "Não Compareceu", color: "bg-orange-100 text-orange-700" },
    pending_confirmation: { label: "Aguardando Confirmação", color: "bg-yellow-100 text-yellow-700" }
  };

  const typeInfo = typeLabels[event.type] || typeLabels.appointment;
  const statusInfo = statusLabels[event.status] || statusLabels.scheduled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <event.icon className="w-5 h-5" />
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
            {event.status && (
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
            )}
            {event.data?.proposed_time_slots?.length > 0 && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {event.data.proposed_time_slots.length} horários propostos
              </Badge>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>{event.date.toLocaleDateString('pt-PT', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>

            {event.client && (
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-4 h-4" />
                <span>{event.client}</span>
              </div>
            )}

            {event.property && (
              <div className="flex items-center gap-2 text-slate-600">
                <Home className="w-4 h-4" />
                <span>{event.property}</span>
              </div>
            )}

            {event.data?.client_phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4" />
                <a href={`tel:${event.data.client_phone}`} className="hover:text-blue-600">
                  {event.data.client_phone}
                </a>
              </div>
            )}

            {event.data?.client_email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${event.data.client_email}`} className="hover:text-blue-600">
                  {event.data.client_email}
                </a>
              </div>
            )}

            {event.data?.duration_minutes && (
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{event.data.duration_minutes} minutos</span>
              </div>
            )}

            {event.data?.proposed_time_slots?.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs font-medium text-purple-700 mb-2">Horários Propostos:</p>
                <div className="space-y-1">
                  {event.data.proposed_time_slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {new Date(slot.date_time).toLocaleString('pt-PT', { 
                          day: '2-digit', 
                          month: '2-digit',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })} ({slot.duration_minutes}min)
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {slot.status === "accepted" ? "✓ Aceite" : 
                         slot.status === "rejected" ? "✗ Rejeitado" : 
                         "Pendente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.data?.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs font-medium text-slate-700 mb-1">Notas:</p>
                <p className="text-slate-600">{event.data.notes}</p>
              </div>
            )}

            {event.data?.completion_notes && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700 mb-1">Notas de Conclusão:</p>
                <p className="text-slate-600 text-sm mb-2">{event.data.completion_notes}</p>
                {event.data.client_interest_level && (
                  <Badge className="text-xs">
                    Interesse: {event.data.client_interest_level === "very_high" ? "Muito Alto" :
                               event.data.client_interest_level === "high" ? "Alto" :
                               event.data.client_interest_level === "medium" ? "Médio" :
                               event.data.client_interest_level === "low" ? "Baixo" : "Nenhum"}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Completion Form */}
          {completionMode && event.type === 'appointment' && (
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-sm">Concluir Visita</h4>
              
              <div>
                <Label>Nível de Interesse do Cliente</Label>
                <Select 
                  value={completionData.client_interest_level} 
                  onValueChange={(v) => setCompletionData({ ...completionData, client_interest_level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_high">🔥 Muito Alto</SelectItem>
                    <SelectItem value="high">😊 Alto</SelectItem>
                    <SelectItem value="medium">😐 Médio</SelectItem>
                    <SelectItem value="low">😕 Baixo</SelectItem>
                    <SelectItem value="none">❌ Nenhum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notas da Visita</Label>
                <Textarea
                  value={completionData.completion_notes}
                  onChange={(e) => setCompletionData({ ...completionData, completion_notes: e.target.value })}
                  placeholder="Como correu a visita? Feedback do cliente..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Próximos Passos</Label>
                <Textarea
                  value={completionData.next_steps}
                  onChange={(e) => setCompletionData({ ...completionData, next_steps: e.target.value })}
                  placeholder="O que fazer a seguir? Follow-up, proposta..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompletionMode(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => completeAppointmentMutation.mutate({ 
                    status: "completed", 
                    notes: completionData 
                  })}
                  disabled={completeAppointmentMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {completeAppointmentMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A guardar...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />Concluir</>
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t flex-wrap">
            {event.type === 'appointment' && event.status !== 'completed' && event.status !== 'no_show' && !completionMode && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCompletionMode(true)}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => completeAppointmentMutation.mutate({ 
                    status: "no_show", 
                    notes: { completion_notes: "Cliente não compareceu" } 
                  })}
                  disabled={completeAppointmentMutation.isPending}
                  className="flex-1 text-orange-600 border-orange-300"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Não Compareceu
                </Button>
              </>
            )}
            {event.type === 'appointment' && (
              <Button
                variant="outline"
                onClick={() => setNotesDialogOpen(true)}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Gerar Notas
              </Button>
            )}
            {event.type === 'appointment' && event.data?.property_id && (
              <Link to={`${createPageUrl("PropertyDetails")}?id=${event.data.property_id}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Ver Imóvel
                </Button>
              </Link>
            )}
            {(event.type === 'signature' || event.type === 'deed' || event.type === 'renewal') && (
              <Link to={createPageUrl("Contracts")} className="flex-1">
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Contrato
                </Button>
              </Link>
            )}
            {event.type === 'followup' && event.data?.id && (
              <Link to={`${createPageUrl("CRMAdvanced")}?tab=opportunities`} className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver Oportunidade
                </Button>
              </Link>
            )}
          </div>
          
          {event.type === 'appointment' && event.data && (
            <MeetingNotesGenerator
              appointment={{
                id: event.data.id,
                title: event.title,
                appointment_date: event.date.toISOString(),
                client_name: event.client,
                assigned_agent: event.data.assigned_agent,
                property_title: event.property,
                property_address: event.data.property_address,
                property_id: event.data.property_id,
                notes: event.data.notes
              }}
              open={notesDialogOpen}
              onOpenChange={setNotesDialogOpen}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}