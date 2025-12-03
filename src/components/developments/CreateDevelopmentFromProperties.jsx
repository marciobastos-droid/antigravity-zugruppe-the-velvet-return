import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Euro, Loader2, Check, Home } from "lucide-react";
import { toast } from "sonner";

export default function CreateDevelopmentFromProperties({ 
  open, 
  onOpenChange, 
  selectedPropertyIds = [],
  onSuccess 
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "under_construction",
    total_units: 0,
    developer_name: "",
    completion_date: ""
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['allProperties'],
    queryFn: () => base44.entities.Property.list('-updated_date'),
  });

  // Filtrar propriedades selecionadas
  const selectedProps = properties.filter(p => selectedPropertyIds.includes(p.id));

  // Auto-preencher dados baseado nos imóveis selecionados
  useEffect(() => {
    if (open && selectedProps.length > 0) {
      const firstProp = selectedProps[0];
      const cities = [...new Set(selectedProps.map(p => p.city).filter(Boolean))];
      const states = [...new Set(selectedProps.map(p => p.state).filter(Boolean))];
      
      setFormData(prev => ({
        ...prev,
        name: prev.name || `Empreendimento ${cities[0] || "Novo"}`,
        total_units: selectedProps.length,
        location: cities.join(", "),
        city: cities[0] || "",
        state: states[0] || ""
      }));
    }
  }, [open, selectedProps.length]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Criar o empreendimento
      const development = await base44.entities.Development.create({
        ...formData,
        total_units: selectedProps.length,
        available_units: selectedProps.filter(p => p.status === 'active').length,
        city: selectedProps[0]?.city || "",
        state: selectedProps[0]?.state || "",
        images: selectedProps[0]?.images || []
      });

      // Atualizar os imóveis para associar ao empreendimento
      await Promise.all(
        selectedPropertyIds.map(propertyId =>
          base44.entities.Property.update(propertyId, {
            development_id: development.id,
            development_name: formData.name
          })
        )
      );

      return development;
    },
    onSuccess: (development) => {
      toast.success(`Empreendimento "${formData.name}" criado com ${selectedProps.length} unidades`);
      queryClient.invalidateQueries({ queryKey: ['developments'] });
      queryClient.invalidateQueries({ queryKey: ['allProperties'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        status: "under_construction",
        total_units: 0,
        developer_name: "",
        completion_date: ""
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Erro ao criar empreendimento: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Insira um nome para o empreendimento");
      return;
    }
    createMutation.mutate();
  };

  // Calcular estatísticas
  const stats = {
    totalValue: selectedProps.reduce((sum, p) => sum + (p.price || 0), 0),
    avgPrice: selectedProps.length > 0 
      ? selectedProps.reduce((sum, p) => sum + (p.price || 0), 0) / selectedProps.length 
      : 0,
    cities: [...new Set(selectedProps.map(p => p.city).filter(Boolean))],
    types: [...new Set(selectedProps.map(p => p.property_type).filter(Boolean))]
  };

  const propertyTypeLabels = {
    house: "Moradia",
    apartment: "Apartamento",
    condo: "Condomínio",
    townhouse: "Casa Geminada",
    land: "Terreno",
    commercial: "Comercial"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Criar Empreendimento a partir de Imóveis
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumo dos imóveis selecionados */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Home className="w-4 h-4" />
              {selectedProps.length} Imóveis Selecionados
            </h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Valor Total:</span>
                <span className="ml-2 font-medium">€{stats.totalValue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Preço Médio:</span>
                <span className="ml-2 font-medium">€{Math.round(stats.avgPrice).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Localização:</span>
                <span className="ml-2">{stats.cities.join(", ") || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500">Tipos:</span>
                <span className="ml-2">{stats.types.map(t => propertyTypeLabels[t] || t).join(", ") || "N/A"}</span>
              </div>
            </div>

            {/* Lista de imóveis */}
            <ScrollArea className="h-32 mt-3 border rounded-lg bg-white">
              <div className="p-2 space-y-1">
                {selectedProps.map(property => (
                  <div key={property.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                    {property.images?.[0] ? (
                      <img src={property.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                        <Home className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{property.title}</p>
                      <p className="text-xs text-slate-500">{property.ref_id} • €{property.price?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Formulário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome do Empreendimento *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Residências do Parque"
                required
              />
            </div>

            <div>
              <Label>Promotor/Construtor</Label>
              <Input
                value={formData.developer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, developer_name: e.target.value }))}
                placeholder="Nome do promotor"
              />
            </div>

            <div>
              <Label>Estado</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Em Planeamento</SelectItem>
                  <SelectItem value="under_construction">Em Construção</SelectItem>
                  <SelectItem value="ready">Pronto</SelectItem>
                  <SelectItem value="sold_out">Esgotado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Conclusão Prevista</Label>
              <Input
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, completion_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Total de Unidades</Label>
              <Input
                type="number"
                value={selectedProps.length}
                disabled
                className="bg-slate-50"
              />
            </div>

            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do empreendimento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || selectedProps.length === 0}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A criar...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Criar Empreendimento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}