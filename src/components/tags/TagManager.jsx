import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Tag, Palette, Search } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Lima", value: "#84cc16" },
  { name: "Verde", value: "#22c55e" },
  { name: "Esmeralda", value: "#10b981" },
  { name: "Ciano", value: "#06b6d4" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Índigo", value: "#6366f1" },
  { name: "Violeta", value: "#8b5cf6" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cinza", value: "#6b7280" },
];

const CATEGORY_LABELS = {
  contact: "Contactos",
  property: "Imóveis",
  opportunity: "Oportunidades",
  general: "Geral"
};

export default function TagManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [formData, setFormData] = React.useState({
    name: "",
    color: "#3b82f6",
    description: "",
    category: "general"
  });

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => base44.entities.Tag.list('name')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tag.create(data),
    onSuccess: () => {
      toast.success("Etiqueta criada");
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tag.update(id, data),
    onSuccess: () => {
      toast.success("Etiqueta atualizada");
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tag.delete(id),
    onSuccess: () => {
      toast.success("Etiqueta eliminada");
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    }
  });

  const resetForm = () => {
    setFormData({ name: "", color: "#3b82f6", description: "", category: "general" });
    setEditingTag(null);
    setDialogOpen(false);
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || "",
      category: tag.category || "general"
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (tag) => {
    if (window.confirm(`Eliminar a etiqueta "${tag.name}"?`)) {
      deleteMutation.mutate(tag.id);
    }
  };

  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || tag.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedTags = filteredTags.reduce((acc, tag) => {
    const cat = tag.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Etiquetas</h2>
          <p className="text-slate-600">{tags.length} etiquetas registadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Nova Etiqueta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? "Editar Etiqueta" : "Nova Etiqueta"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: VIP, Urgente, Investidor..."
                />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="contact">Contactos</SelectItem>
                    <SelectItem value="property">Imóveis</SelectItem>
                    <SelectItem value="opportunity">Oportunidades</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color.value ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da etiqueta..."
                />
              </div>

              <div className="pt-2">
                <Label>Pré-visualização</Label>
                <div className="mt-2">
                  <Badge 
                    style={{ 
                      backgroundColor: `${formData.color}20`, 
                      color: formData.color,
                      borderColor: formData.color 
                    }}
                    className="border"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {formData.name || "Nome da etiqueta"}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {editingTag ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar etiquetas..."
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="contact">Contactos</SelectItem>
                <SelectItem value="property">Imóveis</SelectItem>
                <SelectItem value="opportunity">Oportunidades</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tags by Category */}
      {Object.keys(groupedTags).length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Tag className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma etiqueta encontrada</h3>
            <p className="text-slate-600">Crie a primeira etiqueta para começar</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedTags).map(([category, categoryTags]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-5 h-5" />
                {CATEGORY_LABELS[category]} ({categoryTags.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {categoryTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-white hover:shadow-md transition-shadow group"
                  >
                    <Badge
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: tag.color
                      }}
                      className="border"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag.name}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tag)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(tag)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}