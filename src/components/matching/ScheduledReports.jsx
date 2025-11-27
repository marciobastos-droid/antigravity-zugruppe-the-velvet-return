import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Calendar, Clock, Mail, Plus, Trash2, Play, Pause,
  RefreshCw, CheckCircle2, AlertCircle, User, Building2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ScheduledReports() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_id: '',
    frequency: 'weekly',
    day_of_week: '1', // Monday
    time: '09:00',
    send_email: true,
    is_active: true,
    min_score: 60
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['clientContacts'],
    queryFn: () => base44.entities.ClientContact.list('-created_date')
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Get scheduled reports from user settings
  const scheduledReports = user?.scheduled_matching_reports || [];

  const updateScheduledReports = async (reports) => {
    await base44.auth.updateMe({ scheduled_matching_reports: reports });
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  const handleAddSchedule = async () => {
    if (!formData.name || !formData.contact_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const contact = contacts.find(c => c.id === formData.contact_id);
    const newSchedule = {
      id: Date.now().toString(),
      ...formData,
      contact_name: contact?.full_name,
      contact_email: contact?.email,
      created_at: new Date().toISOString(),
      last_run: null,
      next_run: calculateNextRun(formData.frequency, formData.day_of_week, formData.time)
    };

    const updatedReports = [...scheduledReports, newSchedule];
    await updateScheduledReports(updatedReports);
    
    toast.success('Relatório agendado criado!');
    setDialogOpen(false);
    resetForm();
  };

  const handleToggleActive = async (id) => {
    const updatedReports = scheduledReports.map(r => 
      r.id === id ? { ...r, is_active: !r.is_active } : r
    );
    await updateScheduledReports(updatedReports);
    toast.success('Estado atualizado');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este agendamento?')) return;
    const updatedReports = scheduledReports.filter(r => r.id !== id);
    await updateScheduledReports(updatedReports);
    toast.success('Agendamento eliminado');
  };

  const handleRunNow = async (schedule) => {
    toast.info(`A gerar relatório para ${schedule.contact_name}...`);
    // Here you would trigger the actual report generation
    // For now, we'll just update the last_run
    const updatedReports = scheduledReports.map(r => 
      r.id === schedule.id ? { 
        ...r, 
        last_run: new Date().toISOString(),
        next_run: calculateNextRun(r.frequency, r.day_of_week, r.time)
      } : r
    );
    await updateScheduledReports(updatedReports);
    toast.success('Relatório gerado!');
  };

  const calculateNextRun = (frequency, dayOfWeek, time) => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    let next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (frequency === 'daily') {
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly') {
      const targetDay = parseInt(dayOfWeek);
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
        daysUntil += 7;
      }
      next.setDate(next.getDate() + daysUntil);
    } else if (frequency === 'monthly') {
      next.setDate(1);
      if (next <= now) next.setMonth(next.getMonth() + 1);
    }

    return next.toISOString();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_id: '',
      frequency: 'weekly',
      day_of_week: '1',
      time: '09:00',
      send_email: true,
      is_active: true,
      min_score: 60
    });
  };

  const frequencyLabels = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal'
  };

  const dayLabels = {
    '0': 'Domingo',
    '1': 'Segunda',
    '2': 'Terça',
    '3': 'Quarta',
    '4': 'Quinta',
    '5': 'Sexta',
    '6': 'Sábado'
  };

  // Filter contacts with requirements
  const eligibleContacts = contacts.filter(c => 
    c.property_requirements && 
    (c.property_requirements.locations?.length || c.property_requirements.budget_max)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Relatórios Agendados</h3>
          <p className="text-sm text-slate-500">
            Configure relatórios automáticos de matching para os seus clientes
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-1" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Relatório Agendado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome do Agendamento *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Relatório Semanal João"
                />
              </div>

              <div>
                <Label>Cliente *</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(v) => setFormData({ ...formData, contact_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleContacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} - {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Apenas clientes com requisitos definidos
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequência</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.frequency === 'weekly' && (
                  <div>
                    <Label>Dia da Semana</Label>
                    <Select
                      value={formData.day_of_week}
                      onValueChange={(v) => setFormData({ ...formData, day_of_week: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dayLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Score Mínimo</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.min_score}
                    onChange={(e) => setFormData({ ...formData, min_score: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Label className="text-sm">Enviar por Email</Label>
                <Switch
                  checked={formData.send_email}
                  onCheckedChange={(v) => setFormData({ ...formData, send_email: v })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleAddSchedule} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  Criar Agendamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Reports List */}
      {scheduledReports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Nenhum agendamento</h3>
            <p className="text-sm text-slate-500">
              Crie agendamentos para enviar relatórios automáticos aos seus clientes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scheduledReports.map((schedule) => (
            <Card key={schedule.id} className={`${schedule.is_active ? 'border-green-200' : 'border-slate-200 opacity-60'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${schedule.is_active ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Calendar className={`w-5 h-5 ${schedule.is_active ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">{schedule.name}</h4>
                        <Badge className={schedule.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                          {schedule.is_active ? 'Ativo' : 'Pausado'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {schedule.contact_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {frequencyLabels[schedule.frequency]} às {schedule.time}
                          {schedule.frequency === 'weekly' && ` (${dayLabels[schedule.day_of_week]})`}
                        </span>
                        {schedule.send_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email ativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        {schedule.last_run && (
                          <span>Último: {format(new Date(schedule.last_run), 'dd/MM HH:mm')}</span>
                        )}
                        {schedule.next_run && schedule.is_active && (
                          <span className="text-indigo-600">
                            Próximo: {format(new Date(schedule.next_run), 'dd/MM HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRunNow(schedule)}
                      className="h-8 w-8 p-0"
                      title="Executar agora"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(schedule.id)}
                      className="h-8 w-8 p-0"
                      title={schedule.is_active ? 'Pausar' : 'Ativar'}
                    >
                      {schedule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}