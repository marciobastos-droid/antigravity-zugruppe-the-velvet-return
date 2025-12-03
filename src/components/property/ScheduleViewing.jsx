import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarDays, Clock, Loader2, Check, Sparkles, 
  ChevronLeft, ChevronRight, AlertCircle, MapPin, User
} from "lucide-react";
import { format, addDays, setHours, setMinutes, isSameDay, isAfter, isBefore, addMinutes } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "14:00", "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00", "17:30", "18:00"
];

export default function ScheduleViewing({ property, agentEmail, agentName }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [selectedTime, setSelectedTime] = React.useState(null);
  const [step, setStep] = React.useState(1); // 1: Date/Time, 2: Details, 3: Confirmation
  const [loadingAI, setLoadingAI] = React.useState(false);
  const [suggestedSlots, setSuggestedSlots] = React.useState([]);
  const [contactInfo, setContactInfo] = React.useState({
    name: "",
    email: "",
    phone: "",
    notes: ""
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch agent's calendar events
  const { data: calendarData, isLoading: loadingCalendar } = useQuery({
    queryKey: ['agentCalendar', agentEmail],
    queryFn: async () => {
      const timeMin = new Date().toISOString();
      const timeMax = addDays(new Date(), 14).toISOString();
      const response = await base44.functions.invoke('googleCalendar', {
        action: 'list',
        timeMin,
        timeMax
      });
      return response.data;
    },
    enabled: open,
  });

  // Pre-fill user data
  React.useEffect(() => {
    if (user && open) {
      setContactInfo(prev => ({
        ...prev,
        name: prev.name || user.full_name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || ""
      }));
    }
  }, [user, open]);

  // Get busy times from calendar
  const getBusySlots = (date) => {
    if (!calendarData?.events) return [];
    
    return calendarData.events
      .filter(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date);
        return isSameDay(eventStart, date);
      })
      .map(event => ({
        start: new Date(event.start?.dateTime || event.start?.date),
        end: new Date(event.end?.dateTime || event.end?.date),
        title: event.summary
      }));
  };

  // Check if a time slot is available
  const isSlotAvailable = (date, timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const slotStart = setMinutes(setHours(date, hours), minutes);
    const slotEnd = addMinutes(slotStart, 60); // 1 hour viewing
    
    // Must be in the future
    if (isBefore(slotStart, new Date())) return false;
    
    const busySlots = getBusySlots(date);
    
    return !busySlots.some(busy => 
      (isAfter(slotStart, busy.start) && isBefore(slotStart, busy.end)) ||
      (isAfter(slotEnd, busy.start) && isBefore(slotEnd, busy.end)) ||
      (isBefore(slotStart, busy.start) && isAfter(slotEnd, busy.end))
    );
  };

  // AI-powered slot suggestions
  const getSuggestedSlots = async () => {
    setLoadingAI(true);
    
    try {
      const busyEvents = calendarData?.events || [];
      const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1));
      
      const availableSlots = [];
      next7Days.forEach(date => {
        TIME_SLOTS.forEach(time => {
          if (isSlotAvailable(date, time)) {
            availableSlots.push({ date, time });
          }
        });
      });

      // Use AI to suggest optimal times
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa os seguintes horários disponíveis e sugere os 3 melhores para uma visita a um imóvel.

HORÁRIOS DISPONÍVEIS:
${availableSlots.slice(0, 30).map(s => `- ${format(s.date, 'EEEE, dd/MM', { locale: pt })} às ${s.time}`).join('\n')}

CRITÉRIOS DE SELEÇÃO:
1. Preferir horários entre 10:00-12:00 e 15:00-17:00 (melhor iluminação natural)
2. Evitar início e fim do dia
3. Distribuir por diferentes dias para flexibilidade
4. Preferir dias de semana para menor tráfego

Retorna exatamente 3 sugestões com justificação curta.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  time: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result?.suggestions) {
        const mappedSuggestions = result.suggestions.map(s => {
          const matchingSlot = availableSlots.find(slot => 
            format(slot.date, 'EEEE, dd/MM', { locale: pt }).toLowerCase().includes(s.date.toLowerCase()) ||
            s.date.includes(format(slot.date, 'dd/MM'))
          );
          return {
            ...s,
            dateObj: matchingSlot?.date || addDays(new Date(), 1),
            time: s.time || matchingSlot?.time || "10:00"
          };
        });
        setSuggestedSlots(mappedSuggestions);
      }
    } catch (error) {
      console.error("AI suggestion error:", error);
      // Fallback: suggest first 3 available slots
      const fallbackSlots = [];
      for (let i = 1; i <= 7 && fallbackSlots.length < 3; i++) {
        const date = addDays(new Date(), i);
        for (const time of ["10:30", "15:00", "16:30"]) {
          if (isSlotAvailable(date, time) && fallbackSlots.length < 3) {
            fallbackSlots.push({
              dateObj: date,
              time,
              reason: "Horário com boa disponibilidade"
            });
          }
        }
      }
      setSuggestedSlots(fallbackSlots);
    }
    
    setLoadingAI(false);
  };

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endDateTime = addMinutes(startDateTime, 60);

      // Create calendar event
      const calendarResponse = await base44.functions.invoke('googleCalendar', {
        action: 'create',
        eventData: {
          title: `Visita: ${property.title}`,
          description: `Visita ao imóvel ${property.ref_id || ''}\n\nCliente: ${contactInfo.name}\nEmail: ${contactInfo.email}\nTelefone: ${contactInfo.phone}\n\nNotas: ${contactInfo.notes || 'Sem notas'}`,
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          location: `${property.address || ''}, ${property.city}, ${property.state}`,
          attendees: [contactInfo.email, agentEmail].filter(Boolean)
        }
      });

      // Create Appointment entity
      const { data: refData } = await base44.functions.invoke('generateRefId', { entity_type: 'Opportunity' });
      
      await base44.entities.Appointment.create({
        title: `Visita: ${property.title}`,
        property_id: property.id,
        property_title: property.title,
        property_address: `${property.address || ''}, ${property.city}`,
        client_name: contactInfo.name,
        client_email: contactInfo.email,
        client_phone: contactInfo.phone,
        assigned_agent: agentEmail || property.created_by,
        appointment_date: startDateTime.toISOString(),
        duration_minutes: 60,
        status: 'scheduled',
        notes: contactInfo.notes
      });

      // Send confirmation email
      await base44.integrations.Core.SendEmail({
        to: contactInfo.email,
        subject: `Confirmação de Visita - ${property.title}`,
        body: `
Olá ${contactInfo.name},

A sua visita ao imóvel "${property.title}" está confirmada!

📅 Data: ${format(startDateTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: pt })}
🕐 Hora: ${selectedTime}
📍 Local: ${property.address || property.city}, ${property.state}

${agentName ? `O agente ${agentName} estará à sua espera.` : ''}

Se precisar de remarcar, por favor contacte-nos.

Cumprimentos,
Equipa Zugruppe
        `.trim()
      });

      return calendarResponse;
    },
    onSuccess: () => {
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Visita agendada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao agendar visita: " + error.message);
    }
  });

  const handleSelectSuggestion = (suggestion) => {
    setSelectedDate(suggestion.dateObj);
    setSelectedTime(suggestion.time);
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Selecione data e hora");
      return;
    }
    if (!contactInfo.name || !contactInfo.email) {
      toast.error("Preencha nome e email");
      return;
    }
    createAppointmentMutation.mutate();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setSuggestedSlots([]);
    setContactInfo({ name: user?.full_name || "", email: user?.email || "", phone: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
          <CalendarDays className="w-4 h-4 mr-2" />
          Agendar Visita
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-500" />
            Agendar Visita ao Imóvel
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 my-4">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-1 rounded ${step > s ? 'bg-amber-500' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Date & Time */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Property Summary */}
            <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
              {property.images?.[0] && (
                <img src={property.images[0]} alt="" className="w-20 h-16 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 truncate">{property.title}</h4>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {property.city}, {property.state}
                </p>
                <p className="text-sm font-semibold text-amber-600">€{property.price?.toLocaleString()}</p>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Horários Sugeridos pela IA
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getSuggestedSlots}
                  disabled={loadingAI || loadingCalendar}
                >
                  {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : "Obter Sugestões"}
                </Button>
              </div>

              {suggestedSlots.length > 0 ? (
                <div className="grid gap-2">
                  {suggestedSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(slot)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedDate && isSameDay(selectedDate, slot.dateObj) && selectedTime === slot.time
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-900">
                            {format(slot.dateObj, "EEEE, dd 'de' MMMM", { locale: pt })}
                          </span>
                          <span className="ml-2 text-amber-600 font-semibold">{slot.time}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Recomendado
                        </Badge>
                      </div>
                      {slot.reason && (
                        <p className="text-xs text-slate-500 mt-1">{slot.reason}</p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  Clique em "Obter Sugestões" para ver horários recomendados
                </div>
              )}
            </div>

            {/* Manual Selection */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-900 mb-3">Ou escolha manualmente:</h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Calendar */}
                <div>
                  <Label className="mb-2 block">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarDays className="w-4 h-4 mr-2" />
                        {selectedDate 
                          ? format(selectedDate, "dd 'de' MMMM", { locale: pt })
                          : "Selecionar data"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => 
                          isBefore(date, new Date()) || 
                          isAfter(date, addDays(new Date(), 30))
                        }
                        locale={pt}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Slots */}
                <div>
                  <Label className="mb-2 block">Hora</Label>
                  <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto p-1">
                    {TIME_SLOTS.map((time) => {
                      const available = selectedDate ? isSlotAvailable(selectedDate, time) : true;
                      return (
                        <button
                          key={time}
                          onClick={() => available && setSelectedTime(time)}
                          disabled={!available}
                          className={`py-2 px-1 text-xs rounded transition-all ${
                            selectedTime === time
                              ? 'bg-amber-500 text-white'
                              : available
                                ? 'bg-slate-100 hover:bg-amber-100 text-slate-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed line-through'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedDate || !selectedTime}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Contact Details */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Selected Time Summary */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900">
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: pt })}
                  </p>
                  <p className="text-amber-700">às {selectedTime}</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="visit-name">Nome Completo *</Label>
                <Input
                  id="visit-name"
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                  placeholder="O seu nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="visit-email">Email *</Label>
                <Input
                  id="visit-email"
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="visit-phone">Telefone</Label>
                <Input
                  id="visit-phone"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>
              <div>
                <Label htmlFor="visit-notes">Notas Adicionais</Label>
                <Textarea
                  id="visit-notes"
                  value={contactInfo.notes}
                  onChange={(e) => setContactInfo({ ...contactInfo, notes: e.target.value })}
                  placeholder="Alguma questão ou pedido especial?"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createAppointmentMutation.isPending || !contactInfo.name || !contactInfo.email}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {createAppointmentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A agendar...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Visita
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="text-center py-8 space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Visita Agendada!</h3>
              <p className="text-slate-600">
                Enviámos um email de confirmação para <strong>{contactInfo.email}</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg text-left max-w-sm mx-auto">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: pt })}
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-500" />
                  {selectedTime}
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  {property.city}, {property.state}
                </div>
              </div>
            </div>

            <Button onClick={() => setOpen(false)} className="bg-amber-500 hover:bg-amber-600">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}