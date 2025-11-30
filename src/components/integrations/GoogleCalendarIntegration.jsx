import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, RefreshCw, Clock, MapPin, Users, Trash2, ExternalLink } from "lucide-react";
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function GoogleCalendarIntegration({ opportunityId, opportunityName, clientEmail, clientPhone }) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [eventForm, setEventForm] = React.useState({
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    attendees: []
  });
  const queryClient = useQueryClient();

  const { data: eventsData, isLoading, refetch } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const response = await base44.functions.invoke('googleCalendar', {
        action: 'list',
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      return response.data;
    }
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await base44.functions.invoke('googleCalendar', {
        action: 'create',
        eventData
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Evento criado no Google Calendar!");
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao criar evento: " + error.message);
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      const response = await base44.functions.invoke('googleCalendar', {
        action: 'delete',
        eventId
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Evento removido!");
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    }
  });

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      location: '',
      attendees: []
    });
  };

  const handleCreateFollowUp = () => {
    const now = new Date();
    const startTime = addHours(now, 1);
    const endTime = addHours(now, 2);
    
    setEventForm({
      title: `Follow-up: ${opportunityName || 'Lead'}`,
      description: clientPhone ? `Contacto: ${clientPhone}` : '',
      startDateTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(endTime, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      attendees: clientEmail ? [clientEmail] : []
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.startDateTime || !eventForm.endDateTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createEventMutation.mutate({
      ...eventForm,
      startDateTime: new Date(eventForm.startDateTime).toISOString(),
      endDateTime: new Date(eventForm.endDateTime).toISOString()
    });
  };

  const events = eventsData?.events || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            Google Calendar
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={handleCreateFollowUp}>
                  <Plus className="w-4 h-4 mr-1" />
                  Agendar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Evento no Calendar</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Título *</Label>
                    <Input
                      value={eventForm.title}
                      onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                      placeholder="Follow-up com cliente"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Início *</Label>
                      <Input
                        type="datetime-local"
                        value={eventForm.startDateTime}
                        onChange={(e) => setEventForm({...eventForm, startDateTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Fim *</Label>
                      <Input
                        type="datetime-local"
                        value={eventForm.endDateTime}
                        onChange={(e) => setEventForm({...eventForm, endDateTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Localização</Label>
                    <Input
                      value={eventForm.location}
                      onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                      placeholder="Escritório ou endereço"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                      placeholder="Notas sobre o evento..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Convidados (emails separados por vírgula)</Label>
                    <Input
                      value={eventForm.attendees.join(', ')}
                      onChange={(e) => setEventForm({
                        ...eventForm, 
                        attendees: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createEventMutation.isPending}>
                      {createEventMutation.isPending ? 'A criar...' : 'Criar Evento'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-slate-500">A carregar eventos...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-4 text-slate-500">Sem eventos próximos</div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{event.summary}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock className="w-3 h-3" />
                    {event.start?.dateTime ? 
                      format(new Date(event.start.dateTime), "dd/MM HH:mm", { locale: ptBR }) :
                      format(new Date(event.start?.date), "dd/MM", { locale: ptBR })
                    }
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(event.htmlLink, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => deleteEventMutation.mutate(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}