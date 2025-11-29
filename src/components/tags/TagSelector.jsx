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
  allowCreate = true
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

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
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    createTagMutation.mutate({
      name: searchTerm.trim(),
      color: randomColor,
      category: category === "all" ? "general" : category
    });
  };

  const filteredTags = allTags.filter(tag => {
    const matchesCategory = category === "all" || tag.category === category || tag.category === "general";
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
        <PopoverContent className="w-64 p-2" align="start">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar etiquetas..."
            className="h-8 mb-2"
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                    isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
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
                  {isSelected && <Check className="w-4 h-4 text-green-600" />}
                </button>
              );
            })}
            
            {/* Create new tag option */}
            {allowCreate && searchTerm.trim() && !allTags.some(t => t.name.toLowerCase() === searchTerm.toLowerCase()) && (
              <button
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="text-sm">Criar "{searchTerm}"</span>
              </button>
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