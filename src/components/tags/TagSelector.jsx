import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, Plus, X, Check } from "lucide-react";

export default function TagSelector({ 
  selectedTags = [], 
  onTagsChange, 
  category = "all",
  placeholder = "Adicionar etiquetas..."
}) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => base44.entities.Tag.list('name')
  });

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
            {filteredTags.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-2">Nenhuma etiqueta encontrada</p>
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
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}