import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2, Clock, Search, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SavedSearchManager({ 
  searchType, 
  currentFilters,
  currentSortBy,
  currentSortOrder,
  currentFilterLogic,
  onApplySearch,
  compact = false
}) {
  const queryClient = useQueryClient();
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [searchName, setSearchName] = React.useState("");
  const [searchDescription, setSearchDescription] = React.useState("");

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['savedSearches', user?.email, searchType],
    queryFn: async () => {
      if (!user) return [];
      const searches = await base44.entities.SavedSearch.filter({
        user_email: user.email,
        search_type: searchType
      });
      return searches.sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) {
          return a.is_favorite ? -1 : 1;
        }
        return (b.usage_count || 0) - (a.usage_count || 0);
      });
    },
    enabled: !!user
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedSearch.create(data),
    onSuccess: () => {
      toast.success("Busca guardada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
      setSaveDialogOpen(false);
      setSearchName("");
      setSearchDescription("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSearch.delete(id),
    onSuccess: () => {
      toast.success("Busca eliminada");
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => 
      base44.entities.SavedSearch.update(id, { is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    }
  });

  const applySearchMutation = useMutation({
    mutationFn: async (search) => {
      await base44.entities.SavedSearch.update(search.id, {
        usage_count: (search.usage_count || 0) + 1,
        last_used_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedSearches'] });
    }
  });

  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      toast.error("Introduza um nome para a busca");
      return;
    }

    saveMutation.mutate({
      name: searchName,
      description: searchDescription,
      search_type: searchType,
      filters: currentFilters,
      filter_logic: currentFilterLogic,
      sort_by: currentSortBy,
      sort_order: currentSortOrder,
      user_email: user.email
    });
  };

  const handleApplySearch = (search) => {
    onApplySearch({
      filters: search.filters,
      filterLogic: search.filter_logic,
      sortBy: search.sort_by,
      sortOrder: search.sort_order
    });
    applySearchMutation.mutate(search);
    toast.success(`Busca "${search.name}" aplicada`);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {savedSearches.slice(0, 3).map((search) => (
          <Badge
            key={search.id}
            variant="outline"
            className="cursor-pointer hover:bg-slate-100"
            onClick={() => handleApplySearch(search)}
          >
            {search.is_favorite && <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" />}
            {search.name}
          </Badge>
        ))}
        {savedSearches.length > 3 && (
          <Badge variant="secondary">+{savedSearches.length - 3}</Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bookmark className="w-4 h-4" />
          Buscas Guardadas
        </CardTitle>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Star className="w-4 h-4 mr-1" />
              Guardar Atual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Guardar Busca Personalizada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome da Busca *</Label>
                <Input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Ex: T2 Lisboa até 300k"
                />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={searchDescription}
                  onChange={(e) => setSearchDescription(e.target.value)}
                  placeholder="Detalhes sobre esta busca..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSaveDialogOpen(false)} 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveSearch} 
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {savedSearches.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma busca guardada</p>
            <p className="text-xs mt-1">Configure os filtros e guarde para acesso rápido</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors group"
              >
                <button
                  onClick={() => toggleFavoriteMutation.mutate({ 
                    id: search.id, 
                    is_favorite: !search.is_favorite 
                  })}
                  className="mt-0.5"
                >
                  <Star 
                    className={`w-4 h-4 ${
                      search.is_favorite 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-slate-300 hover:text-amber-400'
                    }`} 
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 
                        className="font-medium text-slate-900 cursor-pointer hover:text-blue-600"
                        onClick={() => handleApplySearch(search)}
                      >
                        {search.name}
                      </h4>
                      {search.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{search.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        {search.usage_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Usada {search.usage_count}x
                          </span>
                        )}
                        {search.last_used_date && (
                          <span>
                            · {format(new Date(search.last_used_date), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (window.confirm(`Eliminar busca "${search.name}"?`)) {
                          deleteMutation.mutate(search.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}