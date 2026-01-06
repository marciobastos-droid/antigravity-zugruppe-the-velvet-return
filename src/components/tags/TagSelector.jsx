import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, Plus, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", 
  "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", 
  "#a855f7", "#ec4899"
];

export default function TagSelector({ 
  selectedTags = [], 
  onTagsChange, 
  category = "all",
  placeholder = "Adicionar etiquetas...",
  allowCreate = true,
  showColorPicker = false
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [selectedColor, setSelectedColor] = React.useState(PRESET_COLORS[8]); // Blue default

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => base44.entities.Tag.list('name')
  });

  const createTagMutation = useMutation({
    mutationFn: (tagData) => base44.entities.Tag.create(tagData),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onTagsChange([...selectedTags, newTag.name]);
      setSearchTerm("");
      setIsCreating(false);
      toast.success(`Etiqueta "${newTag.name}" criada`);
    },
    onError: () => {
      toast.error("Erro ao criar etiqueta");
      setIsCreating(false);
    }
  });

  const handleCreateTag = () => {
    if (!searchTerm.trim()) return;
    setIsCreating(true);
    createTagMutation.mutate({
      name: searchTerm.trim(),
      color: selectedColor,
      category: category === "all" ? (categoryFilter === "all" ? "general" : categoryFilter) : category
    });
  };

  const filteredTags = allTags.filter(tag => {
    // Se category prop está definida (não "all"), filtrar por ela
    const matchesCategory = category === "all" 
      ? (categoryFilter === "all" || tag.category === categoryFilter || tag.category === "general")
      : (tag.category === category || tag.category === "general");
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category
  const groupedTags = React.useMemo(() => {
    const groups = {};
    filteredTags.forEach(tag => {
      const cat = tag.category || "general";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tag);
    });
    return groups;
  }, [filteredTags]);

  const toggleTag = (tagName) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const removeTag = (tagName) => {
    onTagsChange(selectedTags.filter(t => t !== tagName));
  };

  const getTagColor = (tagName) => {
    const tag = allTags.find(t => t.name === tagName);
    return tag?.color || "#6b7280";
  };

  return (
    <div className="space-y-2">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tagName) => {
            const color = getTagColor(tagName);
            return (
              <Badge
                key={tagName}
                style={{
                  backgroundColor: `${color}20`,
                  color: color,
                  borderColor: color
                }}
                className="border pr-1"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tagName}
                <button
                  onClick={() => removeTag(tagName)}
                  className="ml-1 hover:bg-black/10 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Tag Selector Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="w-3 h-3 mr-1" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar etiquetas..."
              className="h-8"
            />
            
            {/* Category Filter - Only show if category prop is "all" */}
            {category === "all" && (
              <div className="flex gap-1 pb-2 border-b overflow-x-auto">
                <Button
                  variant={categoryFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                  className="h-7 text-xs flex-shrink-0"
                >
                  Todas
                </Button>
                <Button
                  variant={categoryFilter === "general" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCategoryFilter("general")}
                  className="h-7 text-xs flex-shrink-0"
                >
                  Geral
                </Button>
                <Button
                  variant={categoryFilter === "contact" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCategoryFilter("contact")}
                  className="h-7 text-xs flex-shrink-0"
                >
                  Contactos
                </Button>
                <Button
                  variant={categoryFilter === "property" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCategoryFilter("property")}
                  className="h-7 text-xs flex-shrink-0"
                >
                  Imóveis
                </Button>
                <Button
                  variant={categoryFilter === "opportunity" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCategoryFilter("opportunity")}
                  className="h-7 text-xs flex-shrink-0"
                >
                  Oportunidades
                </Button>
              </div>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto mt-2 space-y-2">
            {/* Show tags grouped by category if multiple categories */}
            {Object.keys(groupedTags).length > 1 && categoryFilter === "all" ? (
              Object.entries(groupedTags).map(([cat, catTags]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-slate-500 mb-1 px-2">
                    {cat === "general" ? "Geral" : cat === "contact" ? "Contactos" : cat === "property" ? "Imóveis" : cat === "opportunity" ? "Oportunidades" : cat}
                  </p>
                  <div className="space-y-1">
                    {catTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.name)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                            isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm font-medium" style={{ color: tag.color }}>
                              {tag.icon && <span className="mr-1">{tag.icon}</span>}
                              {tag.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-green-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm font-medium" style={{ color: tag.color }}>
                        {tag.icon && <span className="mr-1">{tag.icon}</span>}
                        {tag.name}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-green-600" />}
                  </button>
                );
              })
            )}
            
            {/* Create new tag option */}
            {allowCreate && searchTerm.trim() && !allTags.some(t => t.name.toLowerCase() === searchTerm.toLowerCase()) && (
              <div className="pt-2 border-t space-y-2">
                {showColorPicker && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Escolher cor:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            selectedColor === color ? 'border-slate-900 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleCreateTag}
                  disabled={isCreating}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: selectedColor }}
                      />
                      <Plus className="w-4 h-4" />
                    </>
                  )}
                  <span className="text-sm">Criar "{searchTerm}"</span>
                </button>
              </div>
            )}
            
            {filteredTags.length === 0 && !searchTerm && (
              <p className="text-sm text-slate-500 text-center py-2">Nenhuma etiqueta encontrada</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}