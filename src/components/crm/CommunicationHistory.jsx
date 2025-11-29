import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Mail, MessageSquare, Video, MapPin, 
  ArrowDownLeft, ArrowUpRight, Clock, Calendar,
  CheckCircle2, Eye, Reply, Send, Star, XCircle
} from "lucide-react";
import { format } from "date-fns";

export default function CommunicationHistory({ contactId }) {
  const { data: communications = [], isLoading } = useQuery({
    queryKey: ['communicationLogs', contactId],
    queryFn: async () => {
      const all = await base44.entities.CommunicationLog.list('-communication_date');
      return all.filter(c => c.contact_id === contactId);
    },
    enabled: !!contactId
  });

  const typeIcons = {
    phone_call: Phone,
    email: Mail,
    whatsapp: MessageSquare,
    sms: MessageSquare,
    meeting: Calendar,
    video_call: Video,
    site_visit: MapPin,
    other: MessageSquare
  };

  const typeLabels = {
    phone_call: "Chamada",
    email: "Email",
    whatsapp: "WhatsApp",
    sms: "SMS",
    meeting: "Reunião",
    video_call: "Videochamada",
    site_visit: "Visita",
    other: "Outro"
  };

  const outcomeLabels = {
    successful: "Sucesso",
    no_answer: "Sem resposta",
    callback_requested: "Callback solicitado",
    not_interested: "Sem interesse",
    scheduled_meeting: "Reunião agendada",
    closed_deal: "Negócio fechado",
    voicemail: "Caixa de correio",
    busy: "Ocupado",
    wrong_number: "Número errado",
    other: "Outro"
  };

  const outcomeColors = {
    successful: "bg-green-100 text-green-800",
    no_answer: "bg-slate-100 text-slate-600",
    callback_requested: "bg-amber-100 text-amber-800",
    not_interested: "bg-red-100 text-red-800",
    scheduled_meeting: "bg-blue-100 text-blue-800",
    closed_deal: "bg-emerald-100 text-emerald-800",
    voicemail: "bg-purple-100 text-purple-800",
    busy: "bg-orange-100 text-orange-800",
    wrong_number: "bg-red-100 text-red-800",
    other: "bg-slate-100 text-slate-600"
  };

  const emailStatusLabels = {
    sent: "Enviado",
    delivered: "Entregue",
    opened: "Aberto",
    clicked: "Clicado",
    replied: "Respondido",
    bounced: "Devolvido",
    failed: "Falhou"
  };

  const emailStatusColors = {
    sent: "bg-blue-100 text-blue-700",
    delivered: "bg-cyan-100 text-cyan-700",
    opened: "bg-green-100 text-green-700",
    clicked: "bg-emerald-100 text-emerald-700",
    replied: "bg-purple-100 text-purple-700",
    bounced: "bg-orange-100 text-orange-700",
    failed: "bg-red-100 text-red-700"
  };

  const whatsappStatusLabels = {
    sent: "Enviada",
    delivered: "Entregue",
    read: "Lida",
    replied: "Respondida",
    failed: "Falhou"
  };

  const whatsappStatusColors = {
    sent: "bg-blue-100 text-blue-700",
    delivered: "bg-cyan-100 text-cyan-700",
    read: "bg-green-100 text-green-700",
    replied: "bg-purple-100 text-purple-700",
    failed: "bg-red-100 text-red-700"
  };

  const callOutcomeLabels = {
    completed: "Concluída",
    answered: "Atendida",
    no_answer: "Sem resposta",
    busy: "Ocupado",
    voicemail: "Caixa de correio",
    callback_scheduled: "Callback agendado",
    wrong_number: "Número errado"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma comunicação registada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {communications.map((comm) => {
        const Icon = typeIcons[comm.communication_type] || MessageSquare;
        
        return (
          <Card key={comm.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-slate-900">
                      {typeLabels[comm.communication_type]}
                    </span>
                    {comm.direction === 'inbound' ? (
                      <Badge variant="outline" className="text-xs">
                        <ArrowDownLeft className="w-3 h-3 mr-1" />
                        Recebido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        Enviado
                      </Badge>
                    )}
                    {comm.outcome && (
                      <Badge className={outcomeColors[comm.outcome]}>
                        {outcomeLabels[comm.outcome]}
                      </Badge>
                    )}
                  </div>

                  {comm.subject && (
                    <h4 className="font-medium text-slate-800 mb-1">{comm.subject}</h4>
                  )}

                  <p className="text-sm text-slate-600 mb-2">{comm.summary}</p>

                  {comm.detailed_notes && (
                    <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded mb-2">
                      {comm.detailed_notes}
                    </p>
                  )}

                  {/* Type-specific status badges */}
                  {comm.communication_type === "email" && comm.email_status && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge className={emailStatusColors[comm.email_status] || "bg-slate-100"}>
                        {comm.email_status === "opened" && <Eye className="w-3 h-3 mr-1" />}
                        {comm.email_status === "replied" && <Reply className="w-3 h-3 mr-1" />}
                        {comm.email_status === "sent" && <Send className="w-3 h-3 mr-1" />}
                        {emailStatusLabels[comm.email_status]}
                      </Badge>
                      {comm.email_opened_at && (
                        <span className="text-xs text-slate-500">
                          Aberto: {format(new Date(comm.email_opened_at), "dd/MM HH:mm")}
                        </span>
                      )}
                      {comm.email_replied_at && (
                        <span className="text-xs text-slate-500">
                          Respondido: {format(new Date(comm.email_replied_at), "dd/MM HH:mm")}
                        </span>
                      )}
                    </div>
                  )}

                  {comm.communication_type === "phone_call" && comm.call_outcome && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge className={outcomeColors[comm.call_outcome] || "bg-slate-100"}>
                        <Phone className="w-3 h-3 mr-1" />
                        {callOutcomeLabels[comm.call_outcome]}
                      </Badge>
                      {comm.call_duration_seconds > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {Math.floor(comm.call_duration_seconds / 60)}:{(comm.call_duration_seconds % 60).toString().padStart(2, '0')}
                        </Badge>
                      )}
                      {comm.call_quality_rating && (
                        <Badge variant="outline" className="text-xs">
                          <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />
                          {comm.call_quality_rating}/5
                        </Badge>
                      )}
                    </div>
                  )}

                  {comm.communication_type === "whatsapp" && comm.whatsapp_status && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge className={whatsappStatusColors[comm.whatsapp_status] || "bg-slate-100"}>
                        {comm.whatsapp_status === "read" && "✓✓ "}
                        {comm.whatsapp_status === "delivered" && "✓✓ "}
                        {comm.whatsapp_status === "sent" && "✓ "}
                        {whatsappStatusLabels[comm.whatsapp_status]}
                      </Badge>
                      {comm.whatsapp_delivered_at && (
                        <span className="text-xs text-slate-500">
                          Entregue: {format(new Date(comm.whatsapp_delivered_at), "dd/MM HH:mm")}
                        </span>
                      )}
                      {comm.whatsapp_read_at && (
                        <span className="text-xs text-green-600">
                          Lida: {format(new Date(comm.whatsapp_read_at), "dd/MM HH:mm")}
                        </span>
                      )}
                      {comm.whatsapp_replied_at && (
                        <span className="text-xs text-purple-600">
                          Respondida: {format(new Date(comm.whatsapp_replied_at), "dd/MM HH:mm")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(comm.communication_date || comm.created_date), "dd/MM/yyyy, HH:mm")}
                    </span>
                    {comm.duration_minutes > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {comm.duration_minutes} min
                      </span>
                    )}
                    {comm.agent_name && (
                      <span className="text-slate-400">
                        por {comm.agent_name}
                      </span>
                    )}
                  </div>

                  {comm.follow_up_required && comm.follow_up_date && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs font-medium text-amber-800">
                        📅 Follow-up: {format(new Date(comm.follow_up_date), "dd/MM/yyyy, HH:mm")}
                      </p>
                      {comm.follow_up_notes && (
                        <p className="text-xs text-amber-700 mt-1">{comm.follow_up_notes}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}