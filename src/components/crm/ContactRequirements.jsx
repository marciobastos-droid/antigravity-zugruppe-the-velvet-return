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
  Edit, Save, X, Plus, Sparkles, Target, Loader2, Wand2, Car, Sun, Calendar
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
  const [autoLoadedText, setAutoLoadedText] = React.useState(false);

  // Sync requirements state when contact changes or when editing starts
  React.useEffect(() => {
    if (contact?.property_requirements) {
      setRequirements(contact.property_requirements);
    }
  }, [contact?.id, contact?.property_requirements]);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date')
  });

  // Buscar oportunidades ligadas ao contacto para extrair texto
  const { data: linkedOpportunities = [] } = useQuery({
    queryKey: ['linkedOpportunities', contact?.id, contact?.email],
    queryFn: async () => {
      if (!contact) return [];
      const allOpps = await base44.entities.Opportunity.list();
      return allOpps.filter(o => 
        o.contact_id === contact.id || 
        o.buyer_email === contact.email ||
        (contact.linked_opportunity_ids || []).includes(o.id)
      );
    },
    enabled: !!contact
  });

  const allCities = [...new Set(properties.filter(p => p.status === 'active').map(p => p.city).filter(Boolean))].sort();

  // Extrair texto das oportunidades para pré-preencher a IA
  const getLeadText = React.useCallback(() => {
    if (linkedOpportunities.length === 0) return "";
    
    const texts = linkedOpportunities.map(opp => {
      const parts = [];
      if (opp.message) parts.push(opp.message);
      if (opp.property_type_interest) parts.push(`Interesse: ${opp.property_type_interest}`);
      if (opp.budget) parts.push(`Orçamento: €${opp.budget}`);
      if (opp.location) parts.push(`Localização: ${opp.location}`);
      if (opp.quick_notes?.length > 0) {
        parts.push(...opp.quick_notes.map(n => n.text));
      }
      return parts.join('\n');
    }).filter(Boolean);
    
    return texts.join('\n\n---\n\n');
  }, [linkedOpportunities]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (!contact?.id) {
        throw new Error("Contact ID is missing");
      }
      console.log('Saving requirements for contact:', contact.id, data);
      const result = await base44.entities.ClientContact.update(contact.id, { property_requirements: data });
      console.log('Save result:', result);
      return { data, result };
    },
    onSuccess: async ({ data: savedRequirements }) => {
      console.log('Requirements saved successfully:', savedRequirements);
      toast.success("Requisitos atualizados");
      setRequirements(savedRequirements);
      setEditing(false);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      
      // Call onUpdate callback if provided
      if (onUpdate) {
        try {
          const updatedContacts = await base44.entities.ClientContact.filter({ id: contact.id });
          if (updatedContacts.length > 0) {
            onUpdate(updatedContacts[0]);
          }
        } catch (fetchErr) {
          console.error('Error fetching updated contact:', fetchErr);
        }
      }
    },
    onError: (error) => {
      console.error('Error saving requirements:', error);
      toast.error("Erro ao guardar requisitos: " + (error.message || "Erro desconhecido"));
    }
  });

  const handleSave = async () => {
    // Criar cópia limpa dos requisitos, removendo valores undefined
    const cleanRequirements = {};
    Object.keys(requirements).forEach(key => {
      const value = requirements[key];
      // Keep arrays even if empty, but filter out undefined/null/empty strings
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleanRequirements[key] = value;
        }
      } else if (value !== undefined && value !== null && value !== "") {
        cleanRequirements[key] = value;
      }
    });
    
    console.log('handleSave called, cleanRequirements:', cleanRequirements);
    
    if (!contact?.id) {
      console.error('No contact ID available');
      toast.error("Erro: contacto não identificado");
      return;
    }
    
    try {
      await updateMutation.mutateAsync(cleanRequirements);
    } catch (error) {
      console.error('handleSave error:', error);
    }
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
      <Card className="border-blue-200 bg-blue-50/30 max-h-[70vh] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Requisitos do Cliente
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  const newShowState = !showAiInput;
                  setShowAiInput(newShowState);
                  // Auto-carregar texto da lead quando abrir
                  if (newShowState && !autoLoadedText && linkedOpportunities.length > 0) {
                    const leadText = getLeadText();
                    if (leadText) {
                      setAiText(leadText);
                      setAutoLoadedText(true);
                    }
                  }
                }}
                className="text-purple-600 hover:bg-purple-50"
              >
                <Wand2 className="w-4 h-4 mr-1" />
                IA {linkedOpportunities.length > 0 && `(${linkedOpportunities.length})`}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto flex-1">
          {/* AI Text Input */}
          {showAiInput && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-700">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium text-sm">Extrair requisitos com IA</span>
                </div>
                {linkedOpportunities.length > 0 && !aiText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAiText(getLeadText())}
                    className="text-purple-600 hover:bg-purple-100 text-xs h-7"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Usar texto da lead ({linkedOpportunities.length})
                  </Button>
                )}
              </div>
              <Textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Cole aqui o texto do cliente (email, mensagem, notas...) e a IA extrairá automaticamente os requisitos de imóvel..."
                rows={4}
                className="bg-white"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleAiExtract} 
                  disabled={aiLoading || !aiText.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Extrair Requisitos
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setShowAiInput(false); setAiText(""); }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
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
                value={requirements.budget_min ?? ""}
                onChange={(e) => setRequirements(prev => ({...prev, budget_min: e.target.value !== "" ? Number(e.target.value) : null}))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Orçamento Máx (€)</Label>
              <Input
                type="number"
                value={requirements.budget_max ?? ""}
                onChange={(e) => setRequirements(prev => ({...prev, budget_max: e.target.value !== "" ? Number(e.target.value) : null}))}
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
                value={requirements.bedrooms_min ?? ""}
                onChange={(e) => setRequirements(prev => ({...prev, bedrooms_min: e.target.value !== "" ? Number(e.target.value) : null}))}
              />
            </div>
            <div>
              <Label>Quartos Máx</Label>
              <Input
                type="number"
                value={requirements.bedrooms_max ?? ""}
                onChange={(e) => setRequirements(prev => ({...prev, bedrooms_max: e.target.value !== "" ? Number(e.target.value) : null}))}
              />
            </div>
          </div>

          {/* Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Área Mín (m²)</Label>
              <Input
                type="number"
                value={requirements.area_min ?? ""}
                onChange={(e) => setRequirements(prev => ({...prev, area_min: e.target.value !== "" ? Number(e.target.value) : null}))}
              />
            </div>
            <div>
              <Label>Área Máx (m²)</Label>
              <Input
                type="number"
                value={requirements.area_max ?? ""}
                onChange={(e) => setRequirements(prev => ({...prev, area_max: e.target.value !== "" ? Number(e.target.value) : null}))}
              />
            </div>
          </div>

          {/* Bathrooms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Casas de Banho Mín</Label>
              <Input
                type="number"
                value={requirements.bathrooms_min ?? ""}
                onChange={(e) => setRequirements(prev => ({...prev, bathrooms_min: e.target.value !== "" ? Number(e.target.value) : null}))}
              />
            </div>
          </div>

          {/* Garage */}
          <div>
            <Label>Garagem</Label>
            <Select 
              value={requirements.garage || ""} 
              onValueChange={(v) => setRequirements({...requirements, garage: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Indiferente</SelectItem>
                <SelectItem value="required">Obrigatório</SelectItem>
                <SelectItem value="not_required">Não necessário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sun Exposure */}
          <div>
            <Label className="mb-2 block">Exposição Solar</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "north", label: "Norte" },
                { key: "south", label: "Sul" },
                { key: "east", label: "Nascente" },
                { key: "west", label: "Poente" }
              ].map(({ key, label }) => (
                <Badge
                  key={key}
                  variant={(requirements.sun_exposure || []).includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const current = requirements.sun_exposure || [];
                    setRequirements({
                      ...requirements,
                      sun_exposure: current.includes(key) 
                        ? current.filter(s => s !== key)
                        : [...current, key]
                    });
                  }}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Máx. Construção</Label>
              <Input
                type="date"
                value={requirements.max_construction_date || ""}
                onChange={(e) => setRequirements({...requirements, max_construction_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Data Máx. Conclusão</Label>
              <Input
                type="date"
                value={requirements.max_completion_date || ""}
                onChange={(e) => setRequirements({...requirements, max_completion_date: e.target.value})}
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

          {req.bathrooms_min && (
            <div className="bg-white rounded-lg p-2 border border-green-100">
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Bath className="w-3 h-3" /> Casas de Banho
              </div>
              <div className="font-medium text-sm">
                {req.bathrooms_min}+
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

        {/* Garage & Sun Exposure */}
        {(req.garage || req.sun_exposure?.length > 0) && (
          <div className="grid grid-cols-2 gap-2">
            {req.garage && req.garage !== "any" && (
              <div className="bg-white rounded-lg p-2 border border-green-100">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Car className="w-3 h-3" /> Garagem
                </div>
                <div className="font-medium text-sm">
                  {req.garage === 'required' ? '✅ Obrigatório' : '❌ Não necessário'}
                </div>
              </div>
            )}
            {req.sun_exposure?.length > 0 && (
              <div className="bg-white rounded-lg p-2 border border-green-100">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Exposição Solar
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {req.sun_exposure.map(exp => (
                    <Badge key={exp} variant="outline" className="text-xs">
                      {exp === 'north' ? 'Norte' : exp === 'south' ? 'Sul' : exp === 'east' ? 'Nascente' : 'Poente'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        {(req.max_construction_date || req.max_completion_date) && (
          <div className="grid grid-cols-2 gap-2">
            {req.max_construction_date && (
              <div className="bg-white rounded-lg p-2 border border-green-100">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data Máx. Construção
                </div>
                <div className="font-medium text-sm">{req.max_construction_date}</div>
              </div>
            )}
            {req.max_completion_date && (
              <div className="bg-white rounded-lg p-2 border border-green-100">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data Máx. Conclusão
                </div>
                <div className="font-medium text-sm">{req.max_completion_date}</div>
              </div>
            )}
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