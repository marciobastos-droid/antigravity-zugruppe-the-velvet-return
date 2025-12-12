import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock, Plus, Check, AlertCircle, Phone, Mail, Calendar,
  MessageSquare, Loader2, Edit, Trash2, Bell, Star, User
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { pt } from "date-fns/locale";

export default function FollowUpAutomation() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterPriority, setFilterPriority] = useState("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    related_to_type: "opportunity",
    related_to_id: "",
    related_to_name: "",
    assigned_to: "",
    due_date: new Date().toISOString().split('T')[0],
    due_time: "10:00",
    priority: "medium",
    type: "call"
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['followUpTasks'],
    queryFn: () => base44.entities.FollowUpTask.list('-due_date')
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list()
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('full_name')
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const dueDateTime = `${data.due_date}T${data.due_time || '10:00'}:00`;
      
      return await base44.entities.FollowUpTask.create({
        ...data,
        due_date: dueDateTime,
        assigned_agent_name: agents.find(a => a.email === data.assigned_to)?.full_name || data.assigned_to
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUpTasks'] });
      toast.success("Follow-up criado");
      resetForm();
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FollowUpTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUpTasks'] });
      toast.success("Follow-up atualizado");
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.FollowUpTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followUpTasks'] });
      toast.success("Follow-up eliminado");
    }
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      related_to_type: "opportunity",
      related_to_id: "",
      related_to_name: "",
      assigned_to: currentUser?.email || "",
      due_date: new Date().toISOString().split('T')[0],
      due_time: "10:00",
      priority: "medium",
      type: "call"
    });
    setEditingTask(null);
    setDialogOpen(false);
  };

  const handleEdit = (task) => {
    const dueDate = new Date(task.due_date);
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      related_to_type: task.related_to_type,
      related_to_id: task.related_to_id || "",
      related_to_name: task.related_to_name || "",
      assigned_to: task.assigned_to,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      due_time: format(dueDate, 'HH:mm'),
      priority: task.priority,
      type: task.type
    });
    setDialogOpen(true);
  };

  const handleComplete = async (task) => {
    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: {
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: currentUser?.email
      }
    });
  };

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const tasksByStatus = {
    overdue: filteredTasks.filter(t => t.status === 'pending' && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))),
    today: filteredTasks.filter(t => t.status === 'pending' && isToday(new Date(t.due_date))),
    tomorrow: filteredTasks.filter(t => t.status === 'pending' && isTomorrow(new Date(t.due_date))),
    upcoming: filteredTasks.filter(t => t.status === 'pending' && !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !isTomorrow(new Date(t.due_date))),
    completed: filteredTasks.filter(t => t.status === 'completed')
  };

  const typeIcons = {
    call: <Phone className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    meeting: <Calendar className="w-4 h-4" />,
    whatsapp: <MessageSquare className="w-4 h-4" />,
    visit: <Calendar className="w-4 h-4" />,
    other: <Clock className="w-4 h-4" />
  };

  const priorityColors = {
    urgent: "bg-red-100 text-red-800 border-red-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-slate-100 text-slate-800 border-slate-300"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-green-600" />
            Follow-ups e Lembretes
          </h2>
          <p className="text-slate-600 mt-1">Gerencie tarefas e lembretes automáticos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Follow-up
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Atrasados</p>
            <p className="text-3xl font-bold text-red-600">{tasksByStatus.overdue.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Hoje</p>
            <p className="text-3xl font-bold text-amber-600">{tasksByStatus.today.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Amanhã</p>
            <p className="text-3xl font-bold text-blue-600">{tasksByStatus.tomorrow.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Completados</p>
            <p className="text-3xl font-bold text-green-600">{tasksByStatus.completed.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks by Category */}
      <div className="space-y-4">
        {/* Overdue */}
        {tasksByStatus.overdue.length > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-900">
                <AlertCircle className="w-5 h-5" />
                Atrasados ({tasksByStatus.overdue.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByStatus.overdue.map(task => (
                <TaskCard key={task.id} task={task} onEdit={handleEdit} onComplete={handleComplete} onDelete={deleteTaskMutation.mutate} typeIcons={typeIcons} priorityColors={priorityColors} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Today */}
        {tasksByStatus.today.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                <Bell className="w-5 h-5" />
                Hoje ({tasksByStatus.today.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByStatus.today.map(task => (
                <TaskCard key={task.id} task={task} onEdit={handleEdit} onComplete={handleComplete} onDelete={deleteTaskMutation.mutate} typeIcons={typeIcons} priorityColors={priorityColors} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tomorrow */}
        {tasksByStatus.tomorrow.length > 0 && (
          <Card className="border-blue-300 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                <Calendar className="w-5 h-5" />
                Amanhã ({tasksByStatus.tomorrow.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByStatus.tomorrow.map(task => (
                <TaskCard key={task.id} task={task} onEdit={handleEdit} onComplete={handleComplete} onDelete={deleteTaskMutation.mutate} typeIcons={typeIcons} priorityColors={priorityColors} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming */}
        {tasksByStatus.upcoming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Próximos ({tasksByStatus.upcoming.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasksByStatus.upcoming.slice(0, 10).map(task => (
                <TaskCard key={task.id} task={task} onEdit={handleEdit} onComplete={handleComplete} onDelete={deleteTaskMutation.mutate} typeIcons={typeIcons} priorityColors={priorityColors} />
              ))}
              {tasksByStatus.upcoming.length > 10 && (
                <p className="text-sm text-slate-500 text-center pt-2">
                  +{tasksByStatus.upcoming.length - 10} mais...
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar' : 'Novo'} Follow-up</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); createTaskMutation.mutate(formData); }} className="space-y-4 mt-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Ligar ao cliente João Silva"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Chamada</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="visit">Visita</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Urgente</SelectItem>
                    <SelectItem value="high">🟠 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Média</SelectItem>
                    <SelectItem value="low">⚪ Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Relacionado com</Label>
              <Select 
                value={formData.related_to_id} 
                onValueChange={(v) => {
                  const opp = opportunities.find(o => o.id === v);
                  setFormData({
                    ...formData,
                    related_to_id: v,
                    related_to_name: opp?.buyer_name || '',
                    related_to_type: 'opportunity'
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma oportunidade..." />
                </SelectTrigger>
                <SelectContent>
                  {opportunities.map(opp => (
                    <SelectItem key={opp.id} value={opp.id}>
                      {opp.buyer_name} - {opp.ref_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => setFormData({...formData, due_time: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Atribuído a</Label>
              <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentUser?.email || ''}>{currentUser?.full_name} (Eu)</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.email}>
                      {agent.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Notas sobre o follow-up..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {editingTask ? 'Atualizar' : 'Criar'} Follow-up
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskCard({ task, onEdit, onComplete, onDelete, typeIcons, priorityColors }) {
  const dueDate = new Date(task.due_date);
  const isOverdue = isPast(dueDate) && !isToday(dueDate);

  return (
    <Card className={`${isOverdue ? 'border-red-300' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {typeIcons[task.type]}
              <h4 className="font-medium text-slate-900">{task.title}</h4>
            </div>
            
            {task.related_to_name && (
              <p className="text-xs text-slate-600 mb-1">
                <User className="w-3 h-3 inline mr-1" />
                {task.related_to_name}
              </p>
            )}

            {task.description && (
              <p className="text-xs text-slate-600 mb-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={priorityColors[task.priority]} variant="outline">
                {task.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {format(dueDate, "dd/MM/yyyy HH:mm", { locale: pt })}
              </Badge>
              {task.assigned_agent_name && (
                <Badge variant="outline" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  {task.assigned_agent_name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            {task.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onComplete(task)}
                className="text-green-600 hover:bg-green-50"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Eliminar este follow-up?')) {
                  onDelete(task.id);
                }
              }}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}