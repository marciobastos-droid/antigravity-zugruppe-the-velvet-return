import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Clock, MapPin, User, Phone, Mail, Plus, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CalendarTool() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [filterAgent, setFilterAgent] = React.useState("all");
  
  const [formData, setFormData] = React.useState({
    title: "",
    property_id: "",
    property_title: "",
    property_address: "",
    lead_id: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    assigned_agent: "",
    appointment_date: "",
    duration_minutes: 60,
    status: "scheduled",
    notes: ""
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const activeUsers = allUsers.filter(u => u.is_active !== false);

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date'),
    enabled: !!user
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: async (appointment) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setDialogOpen(false);
      resetForm();
      toast.success("Visita agendada!");
      
      if (appointment.client_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: appointment.client_email,
            subject: `Visita Agendada - ${appointment.property_title || appointment.title}`,
            body: `Olá ${appointment.client_name},

A sua visita foi agendada com sucesso!

Detalhes da Visita:
📅 Data: ${format(parseISO(appointment.appointment_date), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
🏠 Imóvel: ${appointment.property_title || 'N/A'}
📍 Morada: ${appointment.property_address || 'N/A'}
⏱️ Duração: ${appointment.duration_minutes} minutos

Cumprimentos,
Equipa Zugruppe`
          });
        } catch (error) {
          console.error("Erro ao enviar email:", error);
        }
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Visita atualizada!");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      property_id: "",
      property_title: "",
      property_address: "",
      lead_id: "",
      client_name: "",
      client_email: "",
      client_phone: "",
      assigned_agent: user?.email || "",
      appointment_date: "",
      duration_minutes: 60,
      status: "scheduled",
      notes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handlePropertySelect = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setFormData(prev => ({
        ...prev,
        property_id: propertyId,
        property_title: property.title,
        property_address: `${property.address}, ${property.city}`,
        title: `Visita - ${property.title}`
      }));
    }
  };

  const handleLeadSelect = (leadId) => {
    const lead = opportunities.find(l => l.id === leadId);
    if (lead) {
      setFormData(prev => ({
        ...prev,
        lead_id: leadId,
        client_name: lead.buyer_name,
        client_email: lead.buyer_email,
        client_phone: lead.buyer_phone
      }));
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const canManageAll = user && (user.role === 'admin' || user.user_type === 'admin' || user.user_type === 'gestor');

  const filteredAppointments = appointments.filter(apt => {
    if (!canManageAll && apt.assigned_agent !== user?.email) return false;
    if (filterAgent !== "all" && apt.assigned_agent !== filterAgent) return false;
    return true;
  });

  const getAppointmentsForDate = (date) => {
    return filteredAppointments.filter(apt => 
      isSameDay(parseISO(apt.appointment_date), date)
    );
  };

  const getAppointmentsForDay = (date) => {
    return filteredAppointments.filter(apt => 
      isSameDay(parseISO(apt.appointment_date), date)
    ).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
  };

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800",
    confirmed: "bg-green-100 text-green-800",
    completed: "bg-slate-100 text-slate-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const statusIcons = {
    scheduled: Clock,
    confirmed: CheckCircle2,
    completed: CheckCircle2,
    cancelled: XCircle
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          {canManageAll && (
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por agente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Agentes</SelectItem>
                {activeUsers.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Agendar Visita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Visita</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Imóvel</Label>
                  <Select value={formData.property_id} onValueChange={handlePropertySelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar imóvel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.filter(p => p.status === 'active').map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title} - {p.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Lead/Cliente</Label>
                  <Select value={formData.lead_id} onValueChange={handleLeadSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {opportunities.filter(o => o.status !== 'closed').map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.buyer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Título da Visita</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Visita ao apartamento T2"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Nome do Cliente</Label>
                  <Input
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.client_phone}
                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Data e Hora</Label>
                  <Input
                    required
                    type="datetime-local"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Duração (minutos)</Label>
                  <Select 
                    value={formData.duration_minutes.toString()} 
                    onValueChange={(v) => setFormData({...formData, duration_minutes: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                      <SelectItem value="120">120 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {canManageAll && (
                <div>
                  <Label>Agente Responsável</Label>
                  <Select 
                    value={formData.assigned_agent} 
                    onValueChange={(v) => setFormData({...formData, assigned_agent: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeUsers.map(u => (
                        <SelectItem key={u.email} value={u.email}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Informações adicionais..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "A agendar..." : "Agendar Visita"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              ← Anterior
            </Button>
            <CardTitle>
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </CardTitle>
            <Button variant="outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              Seguinte →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
              <div key={day} className="text-center font-semibold text-slate-700 py-2">
                {day}
              </div>
            ))}
            
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 bg-slate-50 rounded" />
            ))}
            
            {daysInMonth.map(day => {
              const dayAppointments = getAppointmentsForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-24 p-2 border rounded-lg hover:bg-slate-50 transition-colors text-left ${
                    isToday(day) ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                  } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="font-semibold text-slate-900 mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map(apt => (
                      <div
                        key={apt.id}
                        className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-800 truncate"
                      >
                        {format(parseISO(apt.appointment_date), 'HH:mm')} - {apt.client_name}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-slate-600">
                        +{dayAppointments.length - 2} mais
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Visitas - {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getAppointmentsForDay(selectedDate).length === 0 ? (
              <p className="text-slate-500 text-center py-8">Nenhuma visita agendada para este dia</p>
            ) : (
              <div className="space-y-4">
                {getAppointmentsForDay(selectedDate).map(apt => {
                  const StatusIcon = statusIcons[apt.status];
                  const agent = activeUsers.find(u => u.email === apt.assigned_agent);
                  
                  return (
                    <div key={apt.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg text-slate-900">{apt.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(apt.appointment_date), 'HH:mm')} ({apt.duration_minutes}min)
                          </div>
                        </div>
                        <Badge className={statusColors[apt.status]}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {apt.status === 'scheduled' ? 'Agendada' :
                           apt.status === 'confirmed' ? 'Confirmada' :
                           apt.status === 'completed' ? 'Concluída' : 'Cancelada'}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          {apt.property_id && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <Building2 className="w-4 h-4 text-slate-500" />
                              <Link to={`${createPageUrl("PropertyDetails")}?id=${apt.property_id}`} className="hover:text-blue-600">
                                {apt.property_title}
                              </Link>
                            </div>
                          )}
                          {apt.property_address && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              {apt.property_address}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-700">
                            <User className="w-4 h-4 text-slate-500" />
                            {apt.client_name}
                          </div>
                          {apt.client_email && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-4 h-4 text-slate-500" />
                              {apt.client_email}
                            </div>
                          )}
                          {apt.client_phone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-4 h-4 text-slate-500" />
                              {apt.client_phone}
                            </div>
                          )}
                        </div>
                      </div>

                      {apt.notes && (
                        <div className="mt-3 p-3 bg-slate-50 rounded text-sm text-slate-700">
                          {apt.notes}
                        </div>
                      )}

                      {canManageAll && agent && (
                        <div className="mt-3 pt-3 border-t text-sm text-slate-600">
                          Agente: <strong>{agent.full_name}</strong>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        {apt.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({ id: apt.id, data: { status: 'confirmed' } })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Confirmar
                          </Button>
                        )}
                        {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMutation.mutate({ id: apt.id, data: { status: 'completed' } })}
                          >
                            Concluir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm('Cancelar esta visita?')) {
                              updateMutation.mutate({ id: apt.id, data: { status: 'cancelled' } });
                            }
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}