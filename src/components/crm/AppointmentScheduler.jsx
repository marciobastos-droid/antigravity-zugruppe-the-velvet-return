import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarPlus, Clock, MapPin, User, Phone, Mail,
  CheckCircle2, XCircle, Calendar as CalendarIcon, Edit, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AppointmentScheduler() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingAppointment, setEditingAppointment] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("week");

  const [formData, setFormData] = React.useState({
    title: "",
    property_id: "",
    property_title: "",
    property_address: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    appointment_date: "",
    duration_minutes: 60,
    notes: "",
    status: "scheduled"
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date')
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      toast.success("Visita agendada");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      toast.success("Visita atualizada");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => {
      toast.success("Visita eliminada");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      property_id: "",
      property_title: "",
      property_address: "",
      client_name: "",
      client_email: "",
      client_phone: "",
      appointment_date: "",
      duration_minutes: 60,
      notes: "",
      status: "scheduled"
    });
    setEditingAppointment(null);
    setDialogOpen(false);
  };

  const handleEdit = (appt) => {
    setEditingAppointment(appt);
    setFormData({
      title: appt.title || "",
      property_id: appt.property_id || "",
      property_title: appt.property_title || "",
      property_address: appt.property_address || "",
      client_name: appt.client_name || "",
      client_email: appt.client_email || "",
      client_phone: appt.client_phone || "",
      appointment_date: appt.appointment_date ? new Date(appt.appointment_date).toISOString().slice(0, 16) : "",
      duration_minutes: appt.duration_minutes || 60,
      notes: appt.notes || "",
      status: appt.status || "scheduled"
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      assigned_agent: user?.email,
      appointment_date: new Date(formData.appointment_date).toISOString()
    };

    if (editingAppointment) {
      updateMutation.mutate({ id: editingAppointment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePropertySelect = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setFormData({
        ...formData,
        property_id: propertyId,
        property_title: property.title,
        property_address: `${property.address}, ${property.city}`
      });
    }
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        client_name: client.full_name,
        client_email: client.email,
        client_phone: client.phone
      });
    }
  };

  const handleStatusChange = (apptId, newStatus) => {
    updateMutation.mutate({ id: apptId, data: { status: newStatus } });
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAppointmentsForDate = (date) => {
    return appointments.filter(appt => 
      appt.appointment_date && isSameDay(new Date(appt.appointment_date), date)
    );
  };

  const statusColors = {
    scheduled: "bg-blue-100 text-blue-800 border-blue-300",
    confirmed: "bg-green-100 text-green-800 border-green-300",
    completed: "bg-slate-100 text-slate-600 border-slate-300",
    cancelled: "bg-red-100 text-red-800 border-red-300"
  };

  const statusLabels = {
    scheduled: "Agendada",
    confirmed: "Confirmada",
    completed: "Concluída",
    cancelled: "Cancelada"
  };

  const upcomingAppointments = appointments
    .filter(a => new Date(a.appointment_date) >= new Date() && a.status !== 'cancelled')
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Agendamento de Visitas</h2>
          <p className="text-slate-600">{appointments.filter(a => a.status !== 'cancelled').length} visitas agendadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Nova Visita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAppointment ? "Editar Visita" : "Agendar Nova Visita"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Título da Visita *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Visita apartamento T3"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Imóvel</Label>
                  <Select onValueChange={handlePropertySelect} value={formData.property_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um imóvel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.slice(0, 20).map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>
                          {prop.title?.substring(0, 40)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cliente</Label>
                  <Select onValueChange={handleClientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Morada</Label>
                <Input
                  value={formData.property_address}
                  onChange={(e) => setFormData({...formData, property_address: e.target.value})}
                  placeholder="Morada do imóvel"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Nome do Cliente</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.client_phone}
                    onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                    placeholder="+351 912 345 678"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Data e Hora *</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Duração (minutos)</Label>
                  <Select 
                    value={String(formData.duration_minutes)} 
                    onValueChange={(v) => setFormData({...formData, duration_minutes: Number(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas sobre a visita..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {editingAppointment ? "Atualizar" : "Agendar Visita"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {appointments.filter(a => isToday(new Date(a.appointment_date)) && a.status !== 'cancelled').length}
            </div>
            <div className="text-sm text-slate-600">Hoje</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">
              {appointments.filter(a => isTomorrow(new Date(a.appointment_date)) && a.status !== 'cancelled').length}
            </div>
            <div className="text-sm text-slate-600">Amanhã</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {appointments.filter(a => a.status === 'confirmed').length}
            </div>
            <div className="text-sm text-slate-600">Confirmadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-600">
              {appointments.filter(a => a.status === 'completed').length}
            </div>
            <div className="text-sm text-slate-600">Concluídas</div>
          </CardContent>
        </Card>
      </div>

      {/* Week View */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Calendário Semanal</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              >
                ← Semana Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Hoje
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              >
                Próxima Semana →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDate(day);
              const isCurrentDay = isToday(day);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[150px] border rounded-lg p-2 ${isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
                >
                  <div className={`text-sm font-medium mb-2 ${isCurrentDay ? 'text-blue-700' : 'text-slate-600'}`}>
                    <div>{format(day, 'EEE', { locale: ptBR })}</div>
                    <div className="text-lg">{format(day, 'd')}</div>
                  </div>
                  
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appt) => (
                      <div 
                        key={appt.id}
                        onClick={() => handleEdit(appt)}
                        className={`text-xs p-1 rounded cursor-pointer truncate ${statusColors[appt.status]}`}
                      >
                        <div className="font-medium truncate">{format(new Date(appt.appointment_date), 'HH:mm')}</div>
                        <div className="truncate">{appt.title}</div>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-slate-500 text-center">
                        +{dayAppointments.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Visitas</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma visita agendada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[60px]">
                      <div className="text-2xl font-bold text-slate-900">
                        {format(new Date(appt.appointment_date), 'd')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {format(new Date(appt.appointment_date), 'MMM', { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-slate-900">{appt.title}</h4>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(appt.appointment_date), 'HH:mm')}
                        </span>
                        {appt.client_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {appt.client_name}
                          </span>
                        )}
                        {appt.property_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {appt.property_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[appt.status]}>
                      {statusLabels[appt.status]}
                    </Badge>
                    
                    <Select 
                      value={appt.status}
                      onValueChange={(v) => handleStatusChange(appt.id, v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendada</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={() => handleEdit(appt)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (window.confirm('Eliminar esta visita?')) {
                          deleteMutation.mutate(appt.id);
                        }
                      }}
                      className="text-red-600 hover:bg-red-50"
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
    </div>
  );
}