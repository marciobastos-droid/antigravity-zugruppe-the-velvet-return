import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter, Eye, CheckCircle2, FileText, Home } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateAppointmentDialog from "./CreateAppointmentDialog";
import AppointmentDetailsDialog from "./AppointmentDetailsDialog";
import SyncToGoogleCalendar from "./SyncToGoogleCalendar";

export default function UnifiedCalendar() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date')
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list('-created_date')
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Build unified events from all sources
  const allEvents = React.useMemo(() => {
    const events = [];

    // Appointments
    appointments.forEach(apt => {
      events.push({
        id: apt.id,
        type: 'appointment',
        title: apt.title,
        date: new Date(apt.appointment_date),
        status: apt.status,
        agent: apt.assigned_agent,
        client: apt.client_name,
        property: apt.property_title,
        icon: Calendar,
        color: 'blue',
        data: apt
      });
    });

    // Contract signatures
    contracts.forEach(contract => {
      if (contract.signature_date) {
        events.push({
          id: contract.id,
          type: 'signature',
          title: `Assinatura: ${contract.property_title}`,
          date: new Date(contract.signature_date),
          status: contract.status,
          client: contract.party_b_name,
          property: contract.property_title,
          icon: FileText,
          color: 'purple',
          data: contract
        });
      }
      if (contract.deed_date) {
        events.push({
          id: contract.id,
          type: 'deed',
          title: `Escritura: ${contract.property_title}`,
          date: new Date(contract.deed_date),
          status: contract.status,
          client: contract.party_b_name,
          property: contract.property_title,
          icon: FileText,
          color: 'green',
          data: contract
        });
      }
      if (contract.end_date && contract.contract_type === 'lease') {
        events.push({
          id: contract.id,
          type: 'renewal',
          title: `Renovação: ${contract.property_title}`,
          date: new Date(contract.end_date),
          status: contract.status,
          client: contract.party_b_name,
          property: contract.property_title,
          icon: FileText,
          color: 'amber',
          data: contract
        });
      }
    });

    // Follow-up reminders
    opportunities.filter(opp => opp.next_followup_date).forEach(opp => {
      events.push({
        id: opp.id,
        type: 'followup',
        title: `Follow-up: ${opp.buyer_name}`,
        date: new Date(opp.next_followup_date),
        status: opp.status,
        client: opp.buyer_name,
        property: opp.property_title,
        agent: opp.assigned_to,
        icon: CheckCircle2,
        color: 'orange',
        data: opp
      });
    });

    return events;
  }, [appointments, contracts, opportunities]);

  // Filter events
  const filteredEvents = allEvents.filter(event => {
    if (filterAgent !== "all" && event.agent !== filterAgent) return false;
    if (filterType !== "all" && event.type !== filterType) return false;
    return true;
  });

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date) => {
    return filteredEvents.filter(event => {
      const eventDate = event.date;
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);

  const eventColors = {
    blue: "bg-blue-100 text-blue-700 border-blue-300",
    purple: "bg-purple-100 text-purple-700 border-purple-300",
    green: "bg-green-100 text-green-700 border-green-300",
    amber: "bg-amber-100 text-amber-700 border-amber-300",
    orange: "bg-orange-100 text-orange-700 border-orange-300"
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Calendário Unificado</h2>
          <p className="text-slate-600">Visitas, contratos, assinaturas e follow-ups</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Visita
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos os agentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Agentes</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.email}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="appointment">📅 Visitas</SelectItem>
                <SelectItem value="signature">📝 Assinaturas</SelectItem>
                <SelectItem value="deed">📄 Escrituras</SelectItem>
                <SelectItem value="renewal">🔄 Renovações</SelectItem>
                <SelectItem value="followup">🔔 Follow-ups</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 space-y-4">
          <SyncToGoogleCalendar />
          
          <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle>
                {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-600 p-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const dayEvents = getEventsForDate(date);
                const isSelected = selectedDate.getDate() === day &&
                                 selectedDate.getMonth() === month &&
                                 selectedDate.getFullYear() === year;
                const isToday = new Date().getDate() === day &&
                               new Date().getMonth() === month &&
                               new Date().getFullYear() === year;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square p-1 rounded-lg border-2 transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' :
                      isToday ? 'border-blue-300 bg-blue-50/50' :
                      'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-900">{day}</div>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            event.color === 'blue' ? 'bg-blue-500' :
                            event.color === 'purple' ? 'bg-purple-500' :
                            event.color === 'green' ? 'bg-green-500' :
                            event.color === 'amber' ? 'bg-amber-500' :
                            'bg-orange-500'
                          }`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[8px] text-slate-500">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Selected Day Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate.toLocaleDateString('pt-PT', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Sem eventos</p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map((event, idx) => {
                  const Icon = event.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left p-3 rounded-lg border-2 ${eventColors[event.color]} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          {event.client && (
                            <p className="text-xs opacity-75 truncate">{event.client}</p>
                          )}
                          <Badge variant="outline" className="mt-1 text-xs">
                            {event.type === 'appointment' ? 'Visita' :
                             event.type === 'signature' ? 'Assinatura' :
                             event.type === 'deed' ? 'Escritura' :
                             event.type === 'renewal' ? 'Renovação' :
                             'Follow-up'}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateAppointmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        initialDate={selectedDate}
      />

      {selectedEvent && (
        <AppointmentDetailsDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </div>
  );
}