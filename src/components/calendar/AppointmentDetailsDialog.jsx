import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Home, Phone, Mail, Clock, FileText } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import MeetingNotesGenerator from "../appointments/MeetingNotesGenerator";

export default function AppointmentDetailsDialog({ event, open, onOpenChange }) {
  const [notesDialogOpen, setNotesDialogOpen] = React.useState(false);
  
  if (!event) return null;

  const typeLabels = {
    appointment: { label: "Visita", color: "bg-blue-100 text-blue-700" },
    signature: { label: "Assinatura", color: "bg-purple-100 text-purple-700" },
    deed: { label: "Escritura", color: "bg-green-100 text-green-700" },
    renewal: { label: "Renovação", color: "bg-amber-100 text-amber-700" },
    followup: { label: "Follow-up", color: "bg-orange-100 text-orange-700" }
  };

  const typeInfo = typeLabels[event.type] || typeLabels.appointment;

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
          <div className="flex items-center gap-2">
            <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
            {event.status && (
              <Badge variant="outline">{event.status}</Badge>
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

            {event.data?.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs font-medium text-slate-700 mb-1">Notas:</p>
                <p className="text-slate-600">{event.data.notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
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