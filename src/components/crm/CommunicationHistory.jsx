import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Mail, MessageSquare, Video, MapPin, 
  ArrowDownLeft, ArrowUpRight, Clock, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    other: "Outro"
  };

  const outcomeColors = {
    successful: "bg-green-100 text-green-800",
    no_answer: "bg-slate-100 text-slate-600",
    callback_requested: "bg-amber-100 text-amber-800",
    not_interested: "bg-red-100 text-red-800",
    scheduled_meeting: "bg-blue-100 text-blue-800",
    closed_deal: "bg-emerald-100 text-emerald-800",
    other: "bg-slate-100 text-slate-600"
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

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(comm.communication_date || comm.created_date), "d MMM yyyy, HH:mm", { locale: ptBR })}
                    </span>
                    {comm.duration_minutes > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {comm.duration_minutes} min
                      </span>
                    )}
                  </div>

                  {comm.follow_up_required && comm.follow_up_date && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs font-medium text-amber-800">
                        📅 Follow-up: {format(new Date(comm.follow_up_date), "d MMM yyyy, HH:mm", { locale: ptBR })}
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