import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, MessageCircle, FileText, Home, User, 
  Mail, Phone, CheckCircle2, Clock, TrendingUp 
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function ClientHistoryTimeline({ clientEmail, clientName }) {
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunitiesForClient', clientEmail],
    queryFn: () => base44.entities.Opportunity.filter({ buyer_email: clientEmail })
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointmentsForClient', clientEmail],
    queryFn: () => base44.entities.Appointment.filter({ client_email: clientEmail })
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contractsForClient', clientEmail],
    queryFn: () => base44.entities.Contract.filter({ party_b_email: clientEmail })
  });

  const { data: communications = [] } = useQuery({
    queryKey: ['communicationsForClient', clientEmail],
    queryFn: () => base44.entities.CommunicationLog.filter({ contact_email: clientEmail })
  });

  // Build unified timeline
  const timeline = React.useMemo(() => {
    const events = [];

    opportunities.forEach(opp => {
      events.push({
        id: opp.id,
        type: 'opportunity',
        title: `Lead: ${opp.property_title || 'Geral'}`,
        date: new Date(opp.created_date),
        icon: TrendingUp,
        color: 'blue',
        status: opp.status,
        description: opp.message,
        data: opp
      });

      if (opp.last_contact_date) {
        events.push({
          id: `${opp.id}-contact`,
          type: 'contact',
          title: 'Último Contacto',
          date: new Date(opp.last_contact_date),
          icon: Phone,
          color: 'green',
          data: opp
        });
      }
    });

    appointments.forEach(apt => {
      events.push({
        id: apt.id,
        type: 'appointment',
        title: apt.title,
        date: new Date(apt.appointment_date),
        icon: Calendar,
        color: 'purple',
        status: apt.status,
        description: apt.notes,
        data: apt
      });
    });

    contracts.forEach(contract => {
      events.push({
        id: contract.id,
        type: 'contract',
        title: `Contrato: ${contract.property_title}`,
        date: new Date(contract.created_date),
        icon: FileText,
        color: 'amber',
        status: contract.status,
        description: `Valor: €${contract.contract_value?.toLocaleString()}`,
        data: contract
      });
    });

    communications.forEach(comm => {
      events.push({
        id: comm.id,
        type: 'communication',
        title: comm.subject || `${comm.type} - ${comm.direction}`,
        date: new Date(comm.communication_date),
        icon: comm.type === 'email' ? Mail : comm.type === 'whatsapp' ? MessageCircle : Phone,
        color: 'slate',
        description: comm.notes,
        data: comm
      });
    });

    return events.sort((a, b) => b.date - a.date);
  }, [opportunities, appointments, contracts, communications]);

  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Sem histórico disponível</p>
        </CardContent>
      </Card>
    );
  }

  const colorClasses = {
    blue: "bg-blue-100 border-blue-300 text-blue-700",
    purple: "bg-purple-100 border-purple-300 text-purple-700",
    amber: "bg-amber-100 border-amber-300 text-amber-700",
    green: "bg-green-100 border-green-300 text-green-700",
    slate: "bg-slate-100 border-slate-300 text-slate-700"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Histórico do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

          {timeline.map((event, idx) => {
            const Icon = event.icon;
            return (
              <div key={event.id} className="relative pl-14">
                {/* Timeline dot */}
                <div className={`absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  colorClasses[event.color]
                }`}>
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>

                {/* Event card */}
                <div className={`p-4 rounded-lg border-2 ${colorClasses[event.color]}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                    </div>
                    {event.status && (
                      <Badge variant="outline" className="text-xs">
                        {event.status}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs opacity-75 mb-2">
                    {event.date.toLocaleDateString('pt-PT', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {event.description && (
                    <p className="text-sm mb-3">{event.description}</p>
                  )}

                  {event.type === 'opportunity' && event.data.property_id && (
                    <Link to={`${createPageUrl("PropertyDetails")}?id=${event.data.property_id}`}>
                      <Button variant="outline" size="sm">
                        <Home className="w-3 h-3 mr-1" />
                        Ver Imóvel
                      </Button>
                    </Link>
                  )}

                  {event.type === 'contract' && (
                    <Link to={createPageUrl("Contracts")}>
                      <Button variant="outline" size="sm">
                        <FileText className="w-3 h-3 mr-1" />
                        Ver Contrato
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}