import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Home, MapPin, Euro, Bed, Bath, Square, 
  Edit, Save, X, Plus, Sparkles, Target, Loader2, Wand2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const propertyTypeLabels = {
  apartment: "Apartamento",
  house: "Moradia",
  townhouse: "Casa Geminada",
  condo: "Condomínio",
  land: "Terreno",
  commercial: "Comercial",
  building: "Prédio"
};

export default function ContactRequirements({ contact, onUpdate }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [requirements, setRequirements] = React.useState(contact?.property_requirements || {});
  const [newLocation, setNewLocation] = React.useState("");
  const [aiText, setAiText] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [showAiInput, setShowAiInput] = React.useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  const allCities = [...new Set(properties.filter(p => p.status === 'active').map(p => p.city).filter(Boolean))].sort();

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientContact.update(contact.id, { property_requirements: data }),
    onSuccess: () => {
      toast.success("Requisitos atualizados");
      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      setEditing(false);
      if (onUpdate) onUpdate();
    }
  });

  const handleSave = () => {
    updateMutation.mutate(requirements);
  };

  const addLocation = () => {
    if (newLocation.trim()) {
      setRequirements(prev => ({
        ...prev,
        locations: [...(prev.locations || []), newLocation.trim()]
      }));
      setNewLocation("");
    }
  };

  const removeLocation = (loc) => {
    setRequirements(prev => ({
      ...prev,
      locations: (prev.locations || []).filter(l => l !== loc)
    }));
  };

  const togglePropertyType = (type) => {
    setRequirements(prev => ({
      ...prev,
      property_types: (prev.property_types || []).includes(type)
        ? (prev.property_types || []).filter(t => t !== type)
        : [...(prev.property_types || []), type]
    }));
  };

  const handleAiExtract = async () => {
    if (!aiText.trim()) {
      toast.error("Cole o texto do cliente para extrair requisitos");
      return;
    }

    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa o seguinte texto de um cliente interessado em imóveis e extrai os requisitos de pesquisa.

TEXTO DO CLIENTE:
${aiText}

INSTRUÇÕES:
- Extrai todos os requisitos de imóvel mencionados
- Identifica orçamento mínimo e máximo
- Identifica localizações/cidades de interesse
- Identifica tipos de imóvel (apartment, house, townhouse, condo, land, commercial, building)
- Identifica número de quartos mínimo e máximo
- Identifica área mínima e máxima em m²
- Identifica se é compra (sale), arrendamento (rent) ou ambos (both)
- Identifica casas de banho mínimas
- Extrai notas adicionais relevantes`,
        response_json_schema: {
          type: "object",
          properties: {
            listing_type: { type: "string", enum: ["sale", "rent", "both"] },
            budget_min: { type: "number" },
            budget_max: { type: "number" },
            locations: { type: "array", items: { type: "string" } },
            property_types: { type: "array", items: { type: "string" } },
            bedrooms_min: { type: "number" },
            bedrooms_max: { type: "number" },
            bathrooms_min: { type: "number" },
            area_min: { type: "number" },
            area_max: { type: "number" },
            additional_notes: { type: "string" }
          }
        }
      });

      // Merge with existing requirements, preferring AI values if they exist
      const newReqs = { ...requirements };
      if (result.listing_type) newReqs.listing_type = result.listing_type;
      if (result.budget_min > 0) newReqs.budget_min = result.budget_min;
      if (result.budget_max > 0) newReqs.budget_max = result.budget_max;
      if (result.locations?.length > 0) {
        newReqs.locations = [...new Set([...(requirements.locations || []), ...result.locations])];
      }
      if (result.property_types?.length > 0) {
        newReqs.property_types = [...new Set([...(requirements.property_types || []), ...result.property_types])];
      }
      if (result.bedrooms_min > 0) newReqs.bedrooms_min = result.bedrooms_min;
      if (result.bedrooms_max > 0) newReqs.bedrooms_max = result.bedrooms_max;
      if (result.bathrooms_min > 0) newReqs.bathrooms_min = result.bathrooms_min;
      if (result.area_min > 0) newReqs.area_min = result.area_min;
      if (result.area_max > 0) newReqs.area_max = result.area_max;
      if (result.additional_notes) {
        newReqs.additional_notes = requirements.additional_notes 
          ? `${requirements.additional_notes}\n${result.additional_notes}`
          : result.additional_notes;
      }

      setRequirements(newReqs);
      setShowAiInput(false);
      setAiText("");
      toast.success("Requisitos extraídos com IA!");
    } catch (error) {
      toast.error("Erro ao extrair requisitos");
    }
    setAiLoading(false);
  };

  const req = contact?.property_requirements || {};
  const hasRequirements = req.listing_type || req.locations?.length || req.budget_min || req.budget_max || req.property_types?.length;

  if (!editing && !hasRequirements) {
    return (
      <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
        <CardContent className="p-6 text-center">
          <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-medium text-slate-700 mb-1">Sem requisitos definidos</h4>
          <p className="text-sm text-slate-500 mb-4">Defina os requisitos de imóvel do cliente para facilitar o matching</p>
          <Button onClick={() => setEditing(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Definir Requisitos
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Requisitos do Cliente
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Listing Type */}
          <div>
            <Label>Tipo de Negócio</Label>
            <Select 
              value={requirements.listing_type || ""} 
              onValueChange={(v) => setRequirements({...requirements, listing_type: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Compra</SelectItem>
                <SelectItem value="rent">Arrendamento</SelectItem>
                <SelectItem value="both">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property Types */}
          <div>
            <Label className="mb-2 block">Tipos de Imóvel</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(propertyTypeLabels).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={(requirements.property_types || []).includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => togglePropertyType(key)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <Label className="mb-2 block">Localizações</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(requirements.locations || []).map(loc => (
                <Badge key={loc} variant="secondary" className="gap-1">
                  {loc}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeLocation(loc)} />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newLocation} onValueChange={setNewLocation}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Adicionar cidade..." />
                </SelectTrigger>
                <SelectContent>
                  {allCities.filter(c => !(requirements.locations || []).includes(c)).map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={addLocation} disabled={!newLocation}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Orçamento Mín (€)</Label>
              <Input
                type="number"
                value={requirements.budget_min || ""}
                onChange={(e) => setRequirements({...requirements, budget_min: e.target.value ? Number(e.target.value) : null})}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Orçamento Máx (€)</Label>
              <Input
                type="number"
                value={requirements.budget_max || ""}
                onChange={(e) => setRequirements({...requirements, budget_max: e.target.value ? Number(e.target.value) : null})}
                placeholder="Sem limite"
              />
            </div>
          </div>

          {/* Bedrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quartos Mín</Label>
              <Input
                type="number"
                value={requirements.bedrooms_min || ""}
                onChange={(e) => setRequirements({...requirements, bedrooms_min: e.target.value ? Number(e.target.value) : null})}
              />
            </div>
            <div>
              <Label>Quartos Máx</Label>
              <Input
                type="number"
                value={requirements.bedrooms_max || ""}
                onChange={(e) => setRequirements({...requirements, bedrooms_max: e.target.value ? Number(e.target.value) : null})}
              />
            </div>
          </div>

          {/* Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Área Mín (m²)</Label>
              <Input
                type="number"
                value={requirements.area_min || ""}
                onChange={(e) => setRequirements({...requirements, area_min: e.target.value ? Number(e.target.value) : null})}
              />
            </div>
            <div>
              <Label>Área Máx (m²)</Label>
              <Input
                type="number"
                value={requirements.area_max || ""}
                onChange={(e) => setRequirements({...requirements, area_max: e.target.value ? Number(e.target.value) : null})}
              />
            </div>
          </div>

          {/* Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Casas de Banho Mín</Label>
              <Input
                type="number"
                value={requirements.bathrooms_min || ""}
                onChange={(e) => setRequirements({...requirements, bathrooms_min: e.target.value ? Number(e.target.value) : null})}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notas Adicionais</Label>
            <Textarea
              value={requirements.additional_notes || ""}
              onChange={(e) => setRequirements({...requirements, additional_notes: e.target.value})}
              placeholder="Preferências específicas, exclusões, etc..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // View mode
  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            Requisitos do Cliente
          </span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {req.listing_type && (
            <div className="bg-white rounded-lg p-2 border border-green-100">
              <div className="text-xs text-slate-500">Negócio</div>
              <div className="font-medium text-sm">
                {req.listing_type === 'sale' ? '🏷️ Compra' : req.listing_type === 'rent' ? '🔑 Arrendamento' : '🏷️🔑 Ambos'}
              </div>
            </div>
          )}
          
          {(req.budget_min || req.budget_max) && (
            <div className="bg-white rounded-lg p-2 border border-green-100">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Euro className="w-3 h-3" /> Orçamento
              </div>
              <div className="font-medium text-sm">
                {req.budget_min ? `€${(req.budget_min / 1000).toFixed(0)}k` : '€0'} - {req.budget_max ? `€${(req.budget_max / 1000).toFixed(0)}k` : '∞'}
              </div>
            </div>
          )}

          {(req.bedrooms_min || req.bedrooms_max) && (
            <div className="bg-white rounded-lg p-2 border border-green-100">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Bed className="w-3 h-3" /> Quartos
              </div>
              <div className="font-medium text-sm">
                T{req.bedrooms_min || 0}{req.bedrooms_max ? ` - T${req.bedrooms_max}` : '+'}
              </div>
            </div>
          )}

          {(req.area_min || req.area_max) && (
            <div className="bg-white rounded-lg p-2 border border-green-100">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Square className="w-3 h-3" /> Área
              </div>
              <div className="font-medium text-sm">
                {req.area_min || 0}m² - {req.area_max ? `${req.area_max}m²` : '∞'}
              </div>
            </div>
          )}
        </div>

        {/* Locations */}
        {req.locations?.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Localizações
            </div>
            <div className="flex flex-wrap gap-1">
              {req.locations.map(loc => (
                <Badge key={loc} variant="secondary" className="text-xs bg-green-100 text-green-800">
                  {loc}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Property Types */}
        {req.property_types?.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Home className="w-3 h-3" /> Tipos de Imóvel
            </div>
            <div className="flex flex-wrap gap-1">
              {req.property_types.map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                  {propertyTypeLabels[type] || type}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {req.additional_notes && (
          <div className="bg-white rounded-lg p-2 border border-green-100 text-sm text-slate-600">
            📝 {req.additional_notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}