import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, CheckCircle2, Clock, AlertCircle, User, Calendar, 
  Building2, Users, Phone, Mail, FileText, MoreHorizontal,
  Filter, Search, X
} from "lucide-react";
import { format, isAfter, isBefore, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TASK_TYPES = {
  follow_up: { label: "Follow-up", icon: Phone, color: "bg-blue-100 text-blue-800" },
  visit: { label: "Visita", icon: Building2, color: "bg-green-100 text-green-800" },
  call: { label: "Chamada", icon: Phone, color: "bg-purple-100 text-purple-800" },
  email: { label: "Email", icon: Mail, color: "bg-amber-100 text-amber-800" },
  document: { label: "Documento", icon: FileText, color: "bg-slate-100 text-slate-800" },
  negotiation: { label: "Negociação", icon: Users, color: "bg-red-100 text-red-800" },
  other: { label: "Outro", icon: MoreHorizontal, color: "bg-gray-100 text-gray-800" }
};

const PRIORITY_COLORS = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700"
};

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-slate-100 text-slate-700", icon: Clock },
  in_progress: { label: "Em Progresso", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700", icon: X }
};

export default function TaskManager({ user }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTab, setActiveTab] = useState("my_tasks");
  const [filters, setFilters] = useState({ status: "all", priority: "all", type: "all" });
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin' || user?.user_type === 'admin' || user?.user_type === 'gestor';

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => base44.entities.Opportunity.list(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tarefa criada com sucesso");
      setDialogOpen(false);
      setEditingTask(null);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tarefa atualizada");
      setDialogOpen(false);
      setEditingTask(null);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Tarefa eliminada");
    }
  });

  const myTasks = tasks.filter(t => t.assigned_to === user?.email);
  const assignedByMe = tasks.filter(t => t.assigned_by === user?.email && t.assigned_to !== user?.email);
  const teamTasks = isAdmin ? tasks : [];

  const filterTasks = (taskList) => {
    return taskList.filter(task => {
      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      const matchesType = filters.type === "all" || task.task_type === filters.type;
      const matchesSearch = !searchTerm || 
        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.related_lead_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.related_property_title?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesPriority && matchesType && matchesSearch;
    });
  };

  const getTasksForTab = () => {
    switch (activeTab) {
      case "my_tasks": return filterTasks(myTasks);
      case "assigned_by_me": return filterTasks(assignedByMe);
      case "team": return filterTasks(teamTasks);
      default: return [];
    }
  };

  const markAsComplete = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: "completed", completed_date: new Date().toISOString() }
    });
  };

  const getOverdueTasks = () => myTasks.filter(t => 
    t.status !== 'completed' && t.status !== 'cancelled' && 
    t.due_date && isBefore(new Date(t.due_date), new Date())
  );

  const getTodayTasks = () => myTasks.filter(t => 
    t.status !== 'completed' && t.status !== 'cancelled' && 
    t.due_date && isToday(new Date(t.due_date))
  );

  const overdueTasks = getOverdueTasks();
  const todayTasks = getTodayTasks();

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={overdueTasks.length > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Em Atraso</p>
                <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Para Hoje</p>
                <p className="text-2xl font-bold text-amber-600">{todayTasks.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pendentes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {myTasks.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {myTasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestão de Tarefas</CardTitle>
          <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="my_tasks">
                Minhas Tarefas ({myTasks.length})
              </TabsTrigger>
              <TabsTrigger value="assigned_by_me">
                Atribuídas por Mim ({assignedByMe.length})
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="team">
                  Equipa ({teamTasks.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.priority} onValueChange={(v) => setFilters({...filters, priority: v})}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {getTasksForTab().length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhuma tarefa encontrada
                </div>
              ) : (
                getTasksForTab().map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onEdit={() => { setEditingTask(task); setDialogOpen(true); }}
                    onComplete={() => markAsComplete(task)}
                    onDelete={() => deleteTaskMutation.mutate(task.id)}
                    showAssignee={activeTab !== "my_tasks"}
                  />
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        users={allUsers}
        opportunities={opportunities}
        properties={properties}
        currentUser={user}
        onSave={(data) => {
          if (editingTask) {
            updateTaskMutation.mutate({ id: editingTask.id, data });
          } else {
            createTaskMutation.mutate({ ...data, assigned_by: user?.email });
          }
        }}
      />
    </div>
  );
}

function TaskCard({ task, onEdit, onComplete, onDelete, showAssignee }) {
  const TypeIcon = TASK_TYPES[task.task_type]?.icon || MoreHorizontal;
  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Clock;
  const isOverdue = task.due_date && task.status !== 'completed' && 
    isBefore(new Date(task.due_date), new Date());

  return (
    <div className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
      isOverdue ? 'border-red-300 bg-red-50' : 'bg-white'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={TASK_TYPES[task.task_type]?.color}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {TASK_TYPES[task.task_type]?.label}
            </Badge>
            <Badge className={PRIORITY_COLORS[task.priority]}>
              {task.priority === 'urgent' ? '🔥 ' : ''}{task.priority}
            </Badge>
            <Badge className={STATUS_CONFIG[task.status]?.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {STATUS_CONFIG[task.status]?.label}
            </Badge>
          </div>
          
          <h4 className="font-medium text-slate-900 mb-1">{task.title}</h4>
          
          {task.description && (
            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                {isOverdue && " (Atrasada)"}
              </span>
            )}
            {showAssignee && task.assigned_to_name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assigned_to_name}
              </span>
            )}
            {task.related_lead_name && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {task.related_lead_name}
              </span>
            )}
            {task.related_property_title && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {task.related_property_title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {task.status !== 'completed' && (
            <Button size="sm" variant="outline" onClick={onComplete}>
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        </div>
      </div>
    </div>
  );
}

function TaskDialog({ open, onOpenChange, task, users, opportunities, properties, currentUser, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "other",
    priority: "medium",
    status: "pending",
    assigned_to: currentUser?.email || "",
    assigned_to_name: currentUser?.full_name || "",
    due_date: "",
    related_lead_id: "",
    related_lead_name: "",
    related_property_id: "",
    related_property_title: "",
    notes: ""
  });

  React.useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        task_type: task.task_type || "other",
        priority: task.priority || "medium",
        status: task.status || "pending",
        assigned_to: task.assigned_to || "",
        assigned_to_name: task.assigned_to_name || "",
        due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : "",
        related_lead_id: task.related_lead_id || "",
        related_lead_name: task.related_lead_name || "",
        related_property_id: task.related_property_id || "",
        related_property_title: task.related_property_title || "",
        notes: task.notes || ""
      });
    } else {
      setFormData({
        title: "",
        description: "",
        task_type: "other",
        priority: "medium",
        status: "pending",
        assigned_to: currentUser?.email || "",
        assigned_to_name: currentUser?.full_name || "",
        due_date: "",
        related_lead_id: "",
        related_lead_name: "",
        related_property_id: "",
        related_property_title: "",
        notes: ""
      });
    }
  }, [task, currentUser]);

  const handleUserChange = (email) => {
    const selectedUser = users.find(u => u.email === email);
    setFormData({
      ...formData,
      assigned_to: email,
      assigned_to_name: selectedUser?.full_name || selectedUser?.display_name || email
    });
  };

  const handleLeadChange = (id) => {
    const lead = opportunities.find(o => o.id === id);
    setFormData({
      ...formData,
      related_lead_id: id,
      related_lead_name: lead?.buyer_name || ""
    });
  };

  const handlePropertyChange = (id) => {
    const prop = properties.find(p => p.id === id);
    setFormData({
      ...formData,
      related_property_id: id,
      related_property_title: prop?.title || ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Título da tarefa"
              required
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descrição detalhada..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={formData.task_type} onValueChange={(v) => setFormData({...formData, task_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
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
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente 🔥</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Atribuir a</Label>
              <Select value={formData.assigned_to} onValueChange={handleUserChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.email} value={u.email}>
                      {u.display_name || u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Limite</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lead Relacionado</Label>
              <Select value={formData.related_lead_id} onValueChange={handleLeadChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {opportunities.slice(0, 50).map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.buyer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Imóvel Relacionado</Label>
              <Select value={formData.related_property_id} onValueChange={handlePropertyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {properties.slice(0, 50).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {task && (
            <div>
              <Label>Estado</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {task ? "Guardar" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}