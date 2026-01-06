import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ChevronLeft, ChevronRight, Plus, Filter, CheckCircle2, FileText, List, Grid3X3, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const [viewMode, setViewMode] = useState("week");
  const [draggedEvent, setDraggedEvent] = useState(null);

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

  // Debug logging
  React.useEffect(() => {
    console.log('[UnifiedCalendar Debug]', {
      appointments: appointments.length,
      contracts: contracts.length,
      opportunities: opportunities.length,
      filterAgent,
      filterType
    });
  }, [appointments, contracts, opportunities, filterAgent, filterType]);

  // Build unified events from all sources
  const allEvents = React.useMemo(() => {
    const events = [];

    appointments.forEach(apt => {
      console.log('[Appointment]', apt.title, apt.appointment_date, apt.assigned_agent);
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

    console.log('[AllEvents]', events.length, 'total events');
    return events;
  }, [appointments, contracts, opportunities]);

  const filteredEvents = allEvents.filter(event => {
    if (filterAgent !== "all" && event.agent !== filterAgent) return false;
    if (filterType !== "all" && event.type !== filterType) return false;
    return true;
  });

  console.log('[FilteredEvents]', filteredEvents.length, 'after filters');

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

  const getWeekDays = (date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const weekDays = getWeekDays(currentDate);

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, newDate }) => {
      return base44.entities.Appointment.update(id, {
        appointment_date: newDate.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Visita reagendada");
    },
    onError: () => {
      toast.error("Erro ao reagendar");
    }
  });

  const handleDragStart = (event, e) => {
    if (event.type === 'appointment') {
      setDraggedEvent(event);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetDate, e) => {
    e.preventDefault();
    if (draggedEvent && draggedEvent.type === 'appointment') {
      const newDate = new Date(targetDate);
      const oldDate = draggedEvent.date;
      newDate.setHours(oldDate.getHours());
      newDate.setMinutes(oldDate.getMinutes());
      
      updateAppointmentMutation.mutate({
        id: draggedEvent.id,
        newDate
      });
      setDraggedEvent(null);
    }
  };

  const getConflictsForEvent = (event) => {
    if (event.type !== 'appointment') return [];
    
    const eventStart = new Date(event.date);
    const eventEnd = new Date(eventStart.getTime() + (event.data?.duration_minutes || 60) * 60000);
    
    return filteredEvents.filter(e => {
      if (e.id === event.id || e.type !== 'appointment') return false;
      if (e.agent !== event.agent) return false;
      
      const eStart = new Date(e.date);
      const eEnd = new Date(eStart.getTime() + (e.data?.duration_minutes || 60) * 60000);
      
      return (eventStart < eEnd && eventEnd > eStart);
    });
  };

  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    const upcoming = filteredEvents
      .filter(e => e.date >= now)
      .sort((a, b) => a.date - b.date)
      .slice(0, 10);
    
    console.log('[UpcomingEvents]', upcoming.length, 'upcoming events');
    return upcoming;
  }, [filteredEvents]);

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Calendário Unificado</h2>
          <p className="text-slate-600">Visitas, contratos, assinaturas e follow-ups</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
            <TabsList>
              <TabsTrigger value="month" className="gap-2">
                <Grid3X3 className="w-4 h-4" />
                Mês
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <Calendar className="w-4 h-4" />
                Semana
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="w-4 h-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Visita
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
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
            {(filterAgent !== "all" || filterType !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => {
                setFilterAgent("all");
                setFilterType("all");
              }}>
                Limpar Filtros
              </Button>
            )}
            <div className="flex-1" />
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {filteredEvents.length} eventos
            </Badge>
          </div>
        </CardContent>
      </Card>

      <SyncToGoogleCalendar />

      {/* Month View */}
      {viewMode === "month" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(date, e)}
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
                  {selectedDateEvents
                    .sort((a, b) => a.date - b.date)
                    .map((event, idx) => {
                      const Icon = event.icon;
                      const conflicts = getConflictsForEvent(event);
                      return (
                        <button
                          key={idx}
                          draggable={event.type === 'appointment'}
                          onDragStart={(e) => handleDragStart(event, e)}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full text-left p-3 rounded-lg border-2 ${eventColors[event.color]} hover:shadow-md transition-all ${
                            event.type === 'appointment' ? 'cursor-move' : 'cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-xs">
                                  {format(event.date, 'HH:mm')}
                                </p>
                                {conflicts.length > 0 && (
                                  <AlertTriangle className="w-3 h-3 text-red-500" title={`${conflicts.length} conflito(s)`} />
                                )}
                              </div>
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
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(addDays(currentDate, -7))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle>
                    {format(weekDays[0], 'd MMM', { locale: ptBR })} - {format(weekDays[6], 'd MMM yyyy', { locale: ptBR })}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(addDays(currentDate, 7))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-8 gap-2">
              <div className="space-y-12 pt-8">
                {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => (
                  <div key={hour} className="text-xs text-slate-500 text-right pr-2">
                    {hour}:00
                  </div>
                ))}
              </div>

              {weekDays.map((day, dayIdx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const dayEvents = getEventsForDate(day);
                
                return (
                  <div 
                    key={dayIdx} 
                    className={`border-l relative ${isToday ? 'bg-blue-50' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(day, e)}
                  >
                    <div className={`text-center py-2 border-b ${isToday ? 'bg-blue-100' : ''}`}>
                      <div className="text-xs font-medium text-slate-600">
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    
                    <div className="relative h-[600px]">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="absolute w-full border-b border-slate-100" style={{ top: `${i * 50}px`, height: '50px' }} />
                      ))}
                      
                      {dayEvents.map((event, idx) => {
                        const hour = event.date.getHours();
                        const minute = event.date.getMinutes();
                        const top = ((hour - 8) * 50) + (minute / 60 * 50);
                        const height = ((event.data?.duration_minutes || 60) / 60 * 50);
                        const conflicts = getConflictsForEvent(event);
                        
                        if (hour < 8 || hour >= 20) return null;
                        
                        const Icon = event.icon;
                        
                        return (
                          <button
                            key={idx}
                            draggable={event.type === 'appointment'}
                            onDragStart={(e) => handleDragStart(event, e)}
                            onClick={() => setSelectedEvent(event)}
                            className={`absolute left-1 right-1 rounded p-2 border-2 text-left ${eventColors[event.color]} hover:shadow-lg transition-all z-10 ${
                              event.type === 'appointment' ? 'cursor-move' : 'cursor-pointer'
                            }`}
                            style={{ 
                              top: `${top}px`, 
                              height: `${Math.max(height, 40)}px`,
                              minHeight: '40px'
                            }}
                          >
                            <div className="flex items-start gap-1">
                              <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate flex items-center gap-1">
                                  {format(event.date, 'HH:mm')}
                                  {conflicts.length > 0 && (
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                  )}
                                </p>
                                <p className="text-xs font-medium truncate">{event.title}</p>
                                {event.client && (
                                  <p className="text-xs opacity-75 truncate">{event.client}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
              </CardContent>
            </Card>
          </div>

          {/* Week Events List - Right Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eventos da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const weekEvents = filteredEvents
                  .filter(e => {
                    const eventDate = e.date;
                    return eventDate >= weekDays[0] && eventDate <= addDays(weekDays[6], 1);
                  })
                  .sort((a, b) => a.date - b.date);

                if (weekEvents.length === 0) {
                  return <p className="text-sm text-slate-500 text-center py-8">Sem eventos esta semana</p>;
                }

                return (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {weekEvents.map((event, idx) => {
                      const Icon = event.icon;
                      const conflicts = getConflictsForEvent(event);
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full text-left p-3 rounded-lg border-2 ${eventColors[event.color]} hover:shadow-md transition-all`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-xs">
                                  {format(event.date, "EEE dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                                {conflicts.length > 0 && (
                                  <AlertTriangle className="w-3 h-3 text-red-500" title={`${conflicts.length} conflito(s)`} />
                                )}
                              </div>
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
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Próximos Eventos</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Hoje
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-500 mb-2">
                      {allEvents.length === 0 
                        ? "Sem eventos agendados" 
                        : "Nenhum evento encontrado com os filtros atuais"}
                    </p>
                    {allEvents.length > 0 && filteredEvents.length === 0 && (
                      <Button variant="outline" size="sm" onClick={() => {
                        setFilterAgent("all");
                        setFilterType("all");
                      }}>
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event, idx) => {
                      const Icon = event.icon;
                      const conflicts = getConflictsForEvent(event);
                      
                      return (
                        <button
                          key={idx}
                          draggable={event.type === 'appointment'}
                          onDragStart={(e) => handleDragStart(event, e)}
                          onClick={() => setSelectedEvent(event)}
                          className={`w-full text-left p-4 rounded-lg border-2 ${eventColors[event.color]} hover:shadow-md transition-all ${
                            event.type === 'appointment' ? 'cursor-move' : 'cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${event.color === 'blue' ? 'bg-blue-200' : event.color === 'purple' ? 'bg-purple-200' : event.color === 'green' ? 'bg-green-200' : event.color === 'amber' ? 'bg-amber-200' : 'bg-orange-200'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-slate-900">{event.title}</p>
                                {conflicts.length > 0 && (
                                  <Badge className="bg-red-100 text-red-700 gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Conflito
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                                {event.data?.duration_minutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.data.duration_minutes}min
                                  </span>
                                )}
                              </div>
                              {event.client && (
                                <p className="text-sm text-slate-700 mb-1">👤 {event.client}</p>
                              )}
                              {event.property && (
                                <p className="text-sm text-slate-700 mb-1">🏠 {event.property}</p>
                              )}
                              {event.agent && (
                                <p className="text-xs text-slate-500">
                                  Agente: {users.find(u => u.email === event.agent)?.full_name || event.agent}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {event.type === 'appointment' ? 'Visita' :
                               event.type === 'signature' ? 'Assinatura' :
                               event.type === 'deed' ? 'Escritura' :
                               event.type === 'renewal' ? 'Renovação' :
                               'Follow-up'}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Total de Eventos</p>
                <p className="text-2xl font-bold text-blue-900">{filteredEvents.length}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">📅 Visitas</span>
                  <Badge>{filteredEvents.filter(e => e.type === 'appointment').length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">📝 Assinaturas</span>
                  <Badge>{filteredEvents.filter(e => e.type === 'signature').length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">📄 Escrituras</span>
                  <Badge>{filteredEvents.filter(e => e.type === 'deed').length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">🔔 Follow-ups</span>
                  <Badge>{filteredEvents.filter(e => e.type === 'followup').length}</Badge>
                </div>
              </div>

              {filteredEvents.some(e => getConflictsForEvent(e).length > 0) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">Conflitos Detetados</p>
                      <p className="text-xs text-red-700">
                        {filteredEvents.filter(e => getConflictsForEvent(e).length > 0).length} eventos com sobreposição
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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