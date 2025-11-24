import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Bug, Lightbulb, Wrench, StickyNote, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function DevelopmentNotes() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState(null);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    type: "note",
    priority: "medium",
    status: "pending"
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['developmentNotes'],
    queryFn: () => base44.entities.DevelopmentNote.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DevelopmentNote.create(data),
    onSuccess: () => {
      toast.success("Nota criada!");
      queryClient.invalidateQueries({ queryKey: ['developmentNotes'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DevelopmentNote.update(id, data),
    onSuccess: () => {
      toast.success("Nota atualizada!");
      queryClient.invalidateQueries({ queryKey: ['developmentNotes'] });
      setDialogOpen(false);
      setEditingNote(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DevelopmentNote.delete(id),
    onSuccess: () => {
      toast.success("Nota eliminada!");
      queryClient.invalidateQueries({ queryKey: ['developmentNotes'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      description: note.description,
      type: note.type,
      priority: note.priority,
      status: note.status
    });
    setDialogOpen(true);
  };

  const handleStatusChange = (noteId, newStatus) => {
    updateMutation.mutate({ id: noteId, data: { status: newStatus } });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "note",
      priority: "medium",
      status: "pending"
    });
    setEditingNote(null);
  };

  const filteredNotes = notes.filter(note => {
    const matchesType = typeFilter === "all" || note.type === typeFilter;
    const matchesStatus = statusFilter === "all" || note.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const typeIcons = {
    bug: <Bug className="w-4 h-4" />,
    feature: <Lightbulb className="w-4 h-4" />,
    improvement: <Wrench className="w-4 h-4" />,
    note: <StickyNote className="w-4 h-4" />
  };

  const typeLabels = {
    bug: "Bug",
    feature: "Nova Funcionalidade",
    improvement: "Melhoria",
    note: "Nota"
  };

  const typeColors = {
    bug: "bg-red-100 text-red-800",
    feature: "bg-blue-100 text-blue-800",
    improvement: "bg-green-100 text-green-800",
    note: "bg-yellow-100 text-yellow-800"
  };

  const priorityColors = {
    low: "bg-slate-100 text-slate-800",
    medium: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800"
  };

  const statusIcons = {
    pending: <Clock className="w-4 h-4" />,
    in_progress: <AlertCircle className="w-4 h-4" />,
    completed: <CheckCircle2 className="w-4 h-4" />
  };

  const statusLabels = {
    pending: "Pendente",
    in_progress: "Em Progresso",
    completed: "Concluído"
  };

  const statusColors = {
    pending: "bg-slate-100 text-slate-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800"
  };

  const stats = {
    total: notes.length,
    pending: notes.filter(n => n.status === 'pending').length,
    inProgress: notes.filter(n => n.status === 'in_progress').length,
    completed: notes.filter(n => n.status === 'completed').length
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Notas & Sugestões de Desenvolvimento</h2>
              <p className="text-slate-600">Gerir ideias, bugs e melhorias para a plataforma</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Nota
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingNote ? "Editar Nota" : "Nova Nota"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label>Título *</Label>
                    <Input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Ex: Corrigir bug no filtro..."
                    />
                  </div>

                  <div>
                    <Label>Descrição *</Label>
                    <Textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descreva em detalhe..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bug">🐛 Bug</SelectItem>
                          <SelectItem value="feature">💡 Funcionalidade</SelectItem>
                          <SelectItem value="improvement">🔧 Melhoria</SelectItem>
                          <SelectItem value="note">📝 Nota</SelectItem>
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
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Estado</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_progress">Em Progresso</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingNote ? "Atualizar Nota" : "Criar Nota"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Pendentes</p>
              <p className="text-2xl font-bold text-slate-700">{stats.pending}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 mb-1">Em Progresso</p>
              <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-1">Concluídos</p>
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-sm mb-2 block">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="bug">Bugs</SelectItem>
                  <SelectItem value="feature">Funcionalidades</SelectItem>
                  <SelectItem value="improvement">Melhorias</SelectItem>
                  <SelectItem value="note">Notas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <StickyNote className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma nota encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <Card key={note.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={typeColors[note.type]}>
                            {typeIcons[note.type]}
                            <span className="ml-1">{typeLabels[note.type]}</span>
                          </Badge>
                          <Badge className={priorityColors[note.priority]}>
                            {note.priority === 'high' ? '🔴' : note.priority === 'medium' ? '🟠' : '🟢'} 
                            {note.priority === 'high' ? 'Alta' : note.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                          <Badge className={statusColors[note.status]}>
                            {statusIcons[note.status]}
                            <span className="ml-1">{statusLabels[note.status]}</span>
                          </Badge>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{note.title}</h3>
                        <p className="text-slate-700 mb-3 whitespace-pre-line">{note.description}</p>
                        <div className="text-xs text-slate-500">
                          Criado por {note.created_by} em {new Date(note.created_date).toLocaleDateString('pt-PT')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Select
                          value={note.status}
                          onValueChange={(value) => handleStatusChange(note.id, value)}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(note)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Eliminar esta nota?")) {
                              deleteMutation.mutate(note.id);
                            }
                          }}
                          className="text-red-600 hover:bg-red-50"
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
        </CardContent>
      </Card>
    </div>
  );
}