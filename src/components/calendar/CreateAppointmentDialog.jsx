import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function CreateAppointmentDialog({ open, onOpenChange, initialDate, propertyId, opportunityId, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    property_id: propertyId || "",
    lead_id: opportunityId || "",
    client_name: "",
    client_email: "",
    client_phone: "",
    assigned_agent: "",
    appointment_date: initialDate ? initialDate.toISOString().slice(0, 16) : "",
    duration_minutes: 60,
    notes: "",
    proposed_time_slots: []
  });
  const [proposingSlots, setProposingSlots] = useState(false);
  const [tempSlot, setTempSlot] = useState({ date_time: "", duration_minutes: 60 });
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(true);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ status: "active" })
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  React.useEffect(() => {
    if (currentUser && !formData.assigned_agent) {
      setFormData(prev => ({ ...prev, assigned_agent: currentUser.email }));
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (opportunityId) {
      const opp = opportunities.find(o => o.id === opportunityId);
      if (opp) {
        setFormData(prev => ({
          ...prev,
          lead_id: opportunityId,
          property_id: opp.property_id || "",
          client_name: opp.buyer_name || "",
          client_email: opp.buyer_email || "",
          client_phone: opp.buyer_phone || "",
          title: `Visita: ${opp.property_title || opp.buyer_name}`
        }));
      }
    }
  }, [opportunityId, opportunities]);

  React.useEffect(() => {
    if (propertyId && properties.length > 0 && !formData.title) {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setFormData(prev => ({
          ...prev,
          property_id: propertyId,
          title: `Visita: ${property.title}`
        }));
      }
    }
  }, [propertyId, properties]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const property = properties.find(p => p.id === data.property_id);
      const opportunity = opportunities.find(o => o.id === data.lead_id);
      
      // Create appointment
      const appointment = await base44.entities.Appointment.create({
        ...data,
        property_title: property?.title,
        property_address: property ? `${property.address}, ${property.city}` : "",
        status: "scheduled"
      });

      // Send notifications and calendar invite
      try {
        await base44.functions.invoke('scheduleVisit', {
          appointmentId: appointment.id,
          clientEmail: data.client_email,
          clientPhone: data.client_phone,
          agentEmail: data.assigned_agent,
          propertyOwnerEmail: property?.created_by,
          sendCalendarInvite: true,
          addToGoogleCalendar: addToGoogleCalendar
        });
      } catch (error) {
        console.error('Error sending notifications:', error);
        toast.warning("Visita criada mas houve erro ao enviar notificações");
      }

      // Update opportunity status if linked
      if (data.lead_id && opportunity) {
        try {
          await base44.entities.Opportunity.update(data.lead_id, {
            status: 'visit_scheduled',
            next_followup_date: new Date(data.appointment_date).toISOString()
          });
        } catch (error) {
          console.error('Error updating opportunity:', error);
        }
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'opportunities'] });
      toast.success("Visita agendada" + (addToGoogleCalendar ? " e adicionada ao Google Calendar!" : "!"));
      
      if (onSuccess) {
        onSuccess();
      }
      
      setTimeout(() => {
        onOpenChange(false);
        setFormData({
          title: "",
          property_id: "",
          lead_id: "",
          client_name: "",
          client_email: "",
          client_phone: "",
          assigned_agent: currentUser?.email || "",
          appointment_date: "",
          duration_minutes: 60,
          notes: ""
        });
        setAddToGoogleCalendar(true);
      }, 150);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Auto-generate title if not provided
    const submitData = { ...formData };
    if (!submitData.title) {
      const property = properties.find(p => p.id === submitData.property_id);
      submitData.title = property 
        ? `Visita: ${property.title}` 
        : `Visita com ${submitData.client_name}`;
    }
    
    createMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agendar Nova Visita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Visita ao imóvel... (gerado automaticamente se vazio)"
              />
            </div>

            <div>
              <Label>Imóvel</Label>
              <Select 
                value={formData.property_id} 
                onValueChange={(v) => {
                  const property = properties.find(p => p.id === v);
                  setFormData({ 
                    ...formData, 
                    property_id: v,
                    title: formData.title || `Visita: ${property?.title}`
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} - {p.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Oportunidade Relacionada</Label>
              <Select value={formData.lead_id} onValueChange={(v) => setFormData({ ...formData, lead_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {opportunities.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.buyer_name} - {o.property_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nome do Cliente *</Label>
              <Input
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                placeholder="+351 912 345 678"
              />
            </div>

            <div>
              <Label>Agente Responsável *</Label>
              <Select 
                value={formData.assigned_agent} 
                onValueChange={(v) => setFormData({ ...formData, assigned_agent: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data e Hora *</Label>
              <Input
                required
                type="datetime-local"
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
              />
            </div>

            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas sobre a visita..."
                rows={3}
              />
            </div>

            <div className="col-span-2 flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Checkbox
                id="addToGoogleCalendar"
                checked={addToGoogleCalendar}
                onCheckedChange={setAddToGoogleCalendar}
              />
              <Label
                htmlFor="addToGoogleCalendar"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4 text-green-600" />
                <span>Adicionar automaticamente ao Google Calendar</span>
              </Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />A agendar...</>
              ) : (
                "Agendar Visita"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}