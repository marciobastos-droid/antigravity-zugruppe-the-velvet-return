import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, Trash2, Star, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const defaultWeights = {
  location: 30,
  price: 25,
  bedrooms: 15,
  bathrooms: 10,
  area: 15,
  property_type: 10,
  listing_type: 15,
  amenities: 10
};

const criteriaLabels = {
  location: "Localização",
  price: "Preço",
  bedrooms: "Quartos",
  bathrooms: "Casas de Banho",
  area: "Área",
  property_type: "Tipo de Imóvel",
  listing_type: "Tipo de Negócio",
  amenities: "Comodidades"
};

export default function MatchingWeightsConfig({ 
  open, 
  onOpenChange,
  onSelectWeights 
}) {
  const queryClient = useQueryClient();
  const [editingWeights, setEditingWeights] = React.useState(null);
  const [formData, setFormData] = React.useState({
    name: "",
    weights: defaultWeights,
    is_default: false
  });

  const { data: weightProfiles = [] } = useQuery({
    queryKey: ['matchingWeights'],
    queryFn: () => base44.entities.MatchingWeights.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MatchingWeights.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchingWeights'] });
      toast.success("Perfil de ponderação criado!");
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MatchingWeights.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchingWeights'] });
      toast.success("Perfil atualizado!");
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MatchingWeights.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchingWeights'] });
      toast.success("Perfil eliminado");
    }
  });

  const resetForm = () => {
    setEditingWeights(null);
    setFormData({
      name: "",
      weights: defaultWeights,
      is_default: false
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingWeights) {
      updateMutation.mutate({ id: editingWeights.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateWeight = (criterion, value) => {
    setFormData({
      ...formData,
      weights: {
        ...formData.weights,
        [criterion]: value[0]
      }
    });
  };

  const totalWeight = Object.values(formData.weights).reduce((sum, w) => sum + w, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração de Ponderação de Matching
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome do Perfil *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Foco em Localização"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Total: {totalWeight} pontos
                </p>
                <p className="text-xs text-blue-700">
                  {totalWeight === 100 ? '✓ Ponderação equilibrada' : 
                   totalWeight > 100 ? '⚠️ Acima de 100 pontos' : 
                   '⚠️ Abaixo de 100 pontos'}
                </p>
              </div>

              {Object.entries(formData.weights).map(([criterion, weight]) => (
                <div key={criterion}>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm">{criteriaLabels[criterion]}</Label>
                    <span className="text-sm font-semibold text-slate-700">{weight}</span>
                  </div>
                  <Slider
                    value={[weight]}
                    onValueChange={(v) => updateWeight(criterion, v)}
                    max={50}
                    step={5}
                    className="mb-2"
                  />
                </div>
              ))}

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Switch
                  id="default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
                />
                <Label htmlFor="default" className="cursor-pointer">
                  <Star className="w-4 h-4 inline mr-1 text-amber-600" />
                  Perfil padrão
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  {editingWeights ? "Cancelar" : "Limpar"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setFormData({...formData, weights: defaultWeights})}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Resetar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingWeights ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </div>

          {/* Profiles List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900">
                Perfis Guardados ({weightProfiles.length})
              </h4>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {weightProfiles.map(profile => (
                <Card key={profile.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-slate-900">{profile.name}</h5>
                          {profile.is_default && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                              <Star className="w-3 h-3 fill-amber-500" />
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (onSelectWeights) {
                              onSelectWeights(profile);
                            }
                          }}
                          className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingWeights(profile);
                            setFormData({
                              name: profile.name,
                              weights: profile.weights,
                              is_default: profile.is_default
                            });
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(profile.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-2">
                      {Object.entries(profile.weights).map(([criterion, weight]) => (
                        <div key={criterion} className="flex justify-between text-slate-600">
                          <span>{criteriaLabels[criterion]}:</span>
                          <span className="font-semibold">{weight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {weightProfiles.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Settings className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Nenhum perfil criado</p>
                  <p className="text-xs mt-1">Use os pesos padrão</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}