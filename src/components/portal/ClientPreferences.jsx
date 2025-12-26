import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Settings, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ClientPreferences({ userEmail }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  
  const [preferences, setPreferences] = React.useState({
    listing_type: "sale",
    property_types: [],
    locations: [],
    budget_min: "",
    budget_max: "",
    bedrooms_min: "",
    bathrooms_min: "",
    square_feet_min: "",
    desired_amenities: [],
    additional_notes: ""
  });

  const [newLocation, setNewLocation] = React.useState("");
  const [newAmenity, setNewAmenity] = React.useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ['buyerProfile', userEmail],
    queryFn: async () => {
      const profiles = await base44.entities.BuyerProfile.filter({ buyer_email: userEmail });
      return profiles[0] || null;
    },
    enabled: !!userEmail
  });

  React.useEffect(() => {
    if (profile && !editing) {
      setPreferences({
        listing_type: profile.listing_type || "sale",
        property_types: profile.property_types || [],
        locations: profile.locations || [],
        budget_min: profile.budget_min || "",
        budget_max: profile.budget_max || "",
        bedrooms_min: profile.bedrooms_min || "",
        bathrooms_min: profile.bathrooms_min || "",
        square_feet_min: profile.square_feet_min || "",
        desired_amenities: profile.desired_amenities || [],
        additional_notes: profile.additional_notes || ""
      });
    }
  }, [profile, editing]);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data) => {
      if (profile) {
        return await base44.entities.BuyerProfile.update(profile.id, data);
      } else {
        const { data: user } = await base44.auth.me();
        return await base44.entities.BuyerProfile.create({
          buyer_name: user.full_name,
          buyer_email: userEmail,
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success("Preferências atualizadas!");
      setEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar preferências");
    }
  });

  const handleSave = () => {
    updatePreferencesMutation.mutate({
      ...preferences,
      budget_min: preferences.budget_min ? Number(preferences.budget_min) : null,
      budget_max: preferences.budget_max ? Number(preferences.budget_max) : null,
      bedrooms_min: preferences.bedrooms_min ? Number(preferences.bedrooms_min) : null,
      bathrooms_min: preferences.bathrooms_min ? Number(preferences.bathrooms_min) : null,
      square_feet_min: preferences.square_feet_min ? Number(preferences.square_feet_min) : null
    });
  };

  const addLocation = () => {
    if (newLocation.trim() && !preferences.locations.includes(newLocation.trim())) {
      setPreferences({
        ...preferences,
        locations: [...preferences.locations, newLocation.trim()]
      });
      setNewLocation("");
    }
  };

  const removeLocation = (location) => {
    setPreferences({
      ...preferences,
      locations: preferences.locations.filter(l => l !== location)
    });
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !preferences.desired_amenities.includes(newAmenity.trim())) {
      setPreferences({
        ...preferences,
        desired_amenities: [...preferences.desired_amenities, newAmenity.trim()]
      });
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenity) => {
    setPreferences({
      ...preferences,
      desired_amenities: preferences.desired_amenities.filter(a => a !== amenity)
    });
  };

  const togglePropertyType = (type) => {
    setPreferences({
      ...preferences,
      property_types: preferences.property_types.includes(type)
        ? preferences.property_types.filter(t => t !== type)
        : [...preferences.property_types, type]
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              As Minhas Preferências
            </CardTitle>
            <CardDescription>
              Configure os seus critérios de procura para receber recomendações personalizadas
            </CardDescription>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)} variant="outline">
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={updatePreferencesMutation.isPending}
              >
                {updatePreferencesMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar
              </Button>
              <Button 
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Negócio */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Interesse em:</Label>
          <div className="flex gap-3">
            {[
              { value: 'sale', label: 'Compra' },
              { value: 'rent', label: 'Arrendamento' },
              { value: 'both', label: 'Ambos' }
            ].map(option => (
              <Button
                key={option.value}
                type="button"
                variant={preferences.listing_type === option.value ? "default" : "outline"}
                onClick={() => editing && setPreferences({...preferences, listing_type: option.value})}
                disabled={!editing}
                className="flex-1"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tipos de Imóvel */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Tipos de Imóvel:</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'apartment', label: 'Apartamento' },
              { value: 'house', label: 'Moradia' },
              { value: 'land', label: 'Terreno' },
              { value: 'commercial', label: 'Comercial' },
              { value: 'building', label: 'Prédio' }
            ].map(type => (
              <Badge
                key={type.value}
                variant={preferences.property_types.includes(type.value) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  editing ? 'hover:scale-105' : 'cursor-default'
                }`}
                onClick={() => editing && togglePropertyType(type.value)}
              >
                {type.label}
                {preferences.property_types.includes(type.value) && editing && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Orçamento */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Orçamento:</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Mínimo</Label>
              <Input
                type="number"
                value={preferences.budget_min}
                onChange={(e) => setPreferences({...preferences, budget_min: e.target.value})}
                placeholder="100000"
                disabled={!editing}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Máximo</Label>
              <Input
                type="number"
                value={preferences.budget_max}
                onChange={(e) => setPreferences({...preferences, budget_max: e.target.value})}
                placeholder="500000"
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        {/* Localizações */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Localizações Preferidas:</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {preferences.locations.map((location, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1">
                {location}
                {editing && (
                  <button 
                    onClick={() => removeLocation(location)}
                    className="hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
            {preferences.locations.length === 0 && (
              <span className="text-sm text-slate-500">Nenhuma localização definida</span>
            )}
          </div>
          {editing && (
            <div className="flex gap-2">
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ex: Lisboa, Porto..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
              />
              <Button onClick={addLocation} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Características */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-slate-500">Quartos (min)</Label>
            <Input
              type="number"
              value={preferences.bedrooms_min}
              onChange={(e) => setPreferences({...preferences, bedrooms_min: e.target.value})}
              placeholder="2"
              disabled={!editing}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">WC (min)</Label>
            <Input
              type="number"
              value={preferences.bathrooms_min}
              onChange={(e) => setPreferences({...preferences, bathrooms_min: e.target.value})}
              placeholder="1"
              disabled={!editing}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Área (min m²)</Label>
            <Input
              type="number"
              value={preferences.square_feet_min}
              onChange={(e) => setPreferences({...preferences, square_feet_min: e.target.value})}
              placeholder="80"
              disabled={!editing}
            />
          </div>
        </div>

        {/* Comodidades */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Comodidades Desejadas:</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {preferences.desired_amenities.map((amenity, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1">
                {amenity}
                {editing && (
                  <button 
                    onClick={() => removeAmenity(amenity)}
                    className="hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
            {preferences.desired_amenities.length === 0 && (
              <span className="text-sm text-slate-500">Nenhuma comodidade definida</span>
            )}
          </div>
          {editing && (
            <div className="flex gap-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Ex: Piscina, Garagem..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
              />
              <Button onClick={addAmenity} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Notas Adicionais */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Observações:</Label>
          <Textarea
            value={preferences.additional_notes}
            onChange={(e) => setPreferences({...preferences, additional_notes: e.target.value})}
            placeholder="Outras preferências ou requisitos especiais..."
            rows={4}
            disabled={!editing}
          />
        </div>
      </CardContent>
    </Card>
  );
}