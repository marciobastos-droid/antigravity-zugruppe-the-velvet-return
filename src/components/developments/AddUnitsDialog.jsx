import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Check, Search, Home } from "lucide-react";
import { toast } from "sonner";

export default function AddUnitsDialog({ open, onOpenChange, development }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperties, setSelectedProperties] = useState([]);

  const { data: availableProperties = [], isLoading } = useQuery({
    queryKey: ['availablePropertiesForDev'],
    queryFn: async () => {
      const allProps = await base44.entities.Property.list('-created_date');
      return allProps.filter(p => !p.development_id);
    },
    enabled: open
  });

  const filteredProperties = availableProperties.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.title?.toLowerCase().includes(search) ||
      p.ref_id?.toLowerCase().includes(search) ||
      p.city?.toLowerCase().includes(search) ||
      p.address?.toLowerCase().includes(search)
    );
  });

  const addUnitsMutation = useMutation({
    mutationFn: async () => {
      if (selectedProperties.length === 0) {
        throw new Error("Selecione pelo menos um imóvel");
      }

      // Atualizar todos os imóveis selecionados
      await Promise.all(
        selectedProperties.map((propId, index) => {
          const property = availableProperties.find(p => p.id === propId);
          return base44.entities.Property.update(propId, {
            development_id: development.id,
            development_name: development.name,
            unit_number: property?.ref_id || `${development.total_units || 0 + index + 1}`
          });
        })
      );

      // Atualizar contagem de unidades do empreendimento
      const currentTotal = development.total_units || 0;
      const currentAvailable = development.available_units || 0;
      
      await base44.entities.Development.update(development.id, {
        total_units: currentTotal + selectedProperties.length,
        available_units: currentAvailable + selectedProperties.length
      });
    },
    onSuccess: () => {
      toast.success(`${selectedProperties.length} unidades adicionadas ao empreendimento`);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['developments'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      setSelectedProperties([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao adicionar unidades: " + error.message);
    }
  });

  const toggleProperty = (propertyId) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const toggleAll = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(filteredProperties.map(p => p.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Adicionar Unidades a "{development.name}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Unidades atuais:</span>
                <span className="ml-2 font-semibold">{development.total_units || 0}</span>
              </div>
              <div>
                <span className="text-slate-600">A adicionar:</span>
                <span className="ml-2 font-semibold text-blue-600">{selectedProperties.length}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-600">Total após adicionar:</span>
                <span className="ml-2 font-bold text-lg">{(development.total_units || 0) + selectedProperties.length}</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Pesquisar imóveis por título, referência ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {selectedProperties.length} de {filteredProperties.length} imóveis selecionados
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedProperties.length === filteredProperties.length ? 'Desmarcar' : 'Selecionar'} Todos
              </Button>
            </div>
          </div>

          {/* Properties List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum imóvel disponível</p>
                <p className="text-xs mt-1">
                  {searchTerm ? 'Tente ajustar a pesquisa' : 'Todos os imóveis já estão vinculados a empreendimentos'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredProperties.map(property => {
                  const isSelected = selectedProperties.includes(property.id);
                  
                  return (
                    <div
                      key={property.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-2 border-blue-300' 
                          : 'hover:bg-slate-50 border-2 border-transparent'
                      }`}
                      onClick={() => toggleProperty(property.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleProperty(property.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      {property.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Home className="w-6 h-6 text-slate-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {property.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {property.ref_id || property.id.slice(0, 8)}
                          </Badge>
                          {property.bedrooms > 0 && (
                            <span className="text-xs text-slate-600">T{property.bedrooms}</span>
                          )}
                          {property.useful_area > 0 && (
                            <span className="text-xs text-slate-600">{property.useful_area}m²</span>
                          )}
                          <span className="text-xs font-semibold text-green-600">
                            €{property.price?.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {property.city}, {property.state}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => addUnitsMutation.mutate()}
            disabled={selectedProperties.length === 0 || addUnitsMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {addUnitsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A adicionar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Adicionar {selectedProperties.length} Unidade{selectedProperties.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}