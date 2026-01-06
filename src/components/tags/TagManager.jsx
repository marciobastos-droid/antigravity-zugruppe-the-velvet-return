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
  document: "Documentos",
  general: "Geral"
};

const CATEGORY_ICONS = {
  contact: "👤",
  property: "🏠",
  opportunity: "💼",
  document: "📄",
  general: "🏷️"
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
    category: "general",
    icon: ""
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
    setFormData({ name: "", color: "#3b82f6", description: "", category: "general", icon: "" });
    setEditingTag(null);
    setDialogOpen(false);
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || "",
      category: tag.category || "general",
      icon: tag.icon || ""
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: VIP, Urgente, Investidor..."
                  />
                </div>

                <div>
                  <Label>Categoria *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">🏷️ Geral</SelectItem>
                      <SelectItem value="contact">👤 Contactos</SelectItem>
                      <SelectItem value="property">🏠 Imóveis</SelectItem>
                      <SelectItem value="opportunity">💼 Oportunidades</SelectItem>
                      <SelectItem value="document">📄 Documentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ícone (opcional)</Label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Ex: 🔥 ⭐ 💎"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <Label>Cor Personalizada *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-105 ${
                        formData.color === color.value ? 'border-slate-900 scale-110 shadow-md' : 'border-slate-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Label className="text-xs text-slate-500 mr-2">Ou escolher:</Label>
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
                    className="flex-1 font-mono"
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

              <div className="pt-2 bg-slate-50 p-3 rounded-lg border">
                <Label className="text-xs text-slate-500 mb-2 block">Pré-visualização</Label>
                <div className="flex gap-2 flex-wrap">
                  <Badge 
                    style={{ 
                      backgroundColor: `${formData.color}20`, 
                      color: formData.color,
                      borderColor: formData.color 
                    }}
                    className="border text-sm"
                  >
                    {formData.icon && <span className="mr-1">{formData.icon}</span>}
                    {formData.name || "Nome da etiqueta"}
                  </Badge>
                  <Badge 
                    style={{ 
                      backgroundColor: formData.color, 
                      color: '#ffffff'
                    }}
                    className="text-sm"
                  >
                    {formData.icon && <span className="mr-1">{formData.icon}</span>}
                    {formData.name || "Sólido"}
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
                <SelectItem value="general">🏷️ Geral</SelectItem>
                <SelectItem value="contact">👤 Contactos</SelectItem>
                <SelectItem value="property">🏠 Imóveis</SelectItem>
                <SelectItem value="opportunity">💼 Oportunidades</SelectItem>
                <SelectItem value="document">📄 Documentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {(searchTerm || categoryFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Filtros ativos:</span>
          {searchTerm && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              "{searchTerm}"
              <button 
                onClick={() => setSearchTerm("")}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          )}
          {categoryFilter !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {CATEGORY_LABELS[categoryFilter]}
              <button 
                onClick={() => setCategoryFilter("all")}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSearchTerm(""); setCategoryFilter("all"); }}
            className="text-slate-500 hover:text-slate-700"
          >
            Limpar todos
          </Button>
        </div>
      )}

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
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
                <span>{CATEGORY_LABELS[category]}</span>
                <Badge variant="secondary" className="ml-auto">{categoryTags.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3">
                {categoryTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 p-3 rounded-xl border-2 bg-white hover:shadow-lg transition-all group"
                    style={{ borderColor: `${tag.color}30` }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: tag.color }}
                      />
                      <Badge
                        style={{
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                          borderColor: `${tag.color}40`
                        }}
                        className="border text-sm"
                      >
                        {tag.icon && <span className="mr-1">{tag.icon}</span>}
                        {tag.name}
                      </Badge>
                    </div>
                    {tag.description && (
                      <span className="text-xs text-slate-500 max-w-[150px] truncate">
                        {tag.description}
                      </span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(tag)}
                        className="h-7 w-7 p-0 hover:bg-blue-50"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      {!tag.is_system && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tag)}
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
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