import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Home } from "lucide-react";
import { toast } from "sonner";

export default function EditUnitDialog({ open, onOpenChange, unit, development }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    unit_number: "",
    title: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    useful_area: "",
    gross_area: "",
    status: "active",
    availability_status: "available",
    floor: "",
    orientation: "",
    balcony_area: "",
    parking_spaces: "",
    storage_room: false,
    internal_notes: ""
  });

  useEffect(() => {
    if (unit && open) {
      // Extrair andar das notas internas se existir
      const floorFromNotes = unit.internal_notes?.match(/Andar:\s*(\d+)/)?.[1] || "";
      
      setFormData({
        unit_number: unit.unit_number || "",
        title: unit.title || "",
        price: unit.price || "",
        bedrooms: unit.bedrooms || "",
        bathrooms: unit.bathrooms || "",
        useful_area: unit.useful_area || "",
        gross_area: unit.gross_area || "",
        status: unit.status || "active",
        availability_status: unit.availability_status || "available",
        floor: floorFromNotes,
        orientation: unit.sun_exposure || "",
        balcony_area: "",
        parking_spaces: unit.garage || "",
        storage_room: unit.amenities?.includes("Arrecadação") || false,
        internal_notes: unit.internal_notes || ""
      });
    }
  }, [unit, open]);

  const updateUnitMutation = useMutation({
    mutationFn: async () => {
      if (!unit?.id) return;

      // Construir notas internas com informações adicionais
      const notesArray = [];
      if (formData.floor) notesArray.push(`Andar: ${formData.floor}`);
      if (formData.balcony_area) notesArray.push(`Área varanda: ${formData.balcony_area}m²`);
      if (formData.internal_notes) notesArray.push(formData.internal_notes);

      // Atualizar amenities se storage_room mudou
      let amenities = unit.amenities || [];
      if (formData.storage_room && !amenities.includes("Arrecadação")) {
        amenities = [...amenities, "Arrecadação"];
      } else if (!formData.storage_room) {
        amenities = amenities.filter(a => a !== "Arrecadação");
      }

      const updateData = {
        unit_number: formData.unit_number || undefined,
        title: formData.title,
        price: formData.price ? Number(formData.price) : undefined,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        useful_area: formData.useful_area ? Number(formData.useful_area) : undefined,
        gross_area: formData.gross_area ? Number(formData.gross_area) : undefined,
        status: formData.status,
        availability_status: formData.availability_status,
        sun_exposure: formData.orientation || undefined,
        garage: formData.parking_spaces || undefined,
        amenities: amenities.length > 0 ? amenities : undefined,
        internal_notes: notesArray.join(' | ') || undefined
      };

      await base44.entities.Property.update(unit.id, updateData);

      // Recalcular disponibilidade do empreendimento
      const allUnits = await base44.entities.Property.filter({ development_id: development.id });
      const availableCount = allUnits.filter(u => 
        u.availability_status === 'available' && u.status === 'active'
      ).length;

      await base44.entities.Development.update(development.id, {
        available_units: availableCount
      });
    },
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['developments'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar unidade: " + error.message);
    }
  });

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-600" />
            Editar Unidade - {unit.ref_id || unit.id.slice(0, 8)}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{development.name}</Badge>
            {unit.unit_number && (
              <Badge className="bg-blue-100 text-blue-800">
                Unidade: {unit.unit_number}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); updateUnitMutation.mutate(); }} className="space-y-4 mt-4">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Número da Unidade/Fração</Label>
              <Input
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                placeholder="Ex: A1, 1º Dto, Lote 5"
              />
            </div>
            <div>
              <Label>Andar</Label>
              <Input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({...formData, floor: e.target.value})}
                placeholder="Ex: 3"
              />
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Apartamento T2 em..."
            />
          </div>

          {/* Pricing & Status */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Preço (€)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="250000"
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="rented">Arrendado</SelectItem>
                  <SelectItem value="off_market">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disponibilidade</Label>
              <Select 
                value={formData.availability_status} 
                onValueChange={(v) => setFormData({...formData, availability_status: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="rented">Arrendado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label>Quartos</Label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                placeholder="2"
              />
            </div>
            <div>
              <Label>WC</Label>
              <Input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                placeholder="2"
              />
            </div>
            <div>
              <Label>Área Útil (m²)</Label>
              <Input
                type="number"
                value={formData.useful_area}
                onChange={(e) => setFormData({...formData, useful_area: e.target.value})}
                placeholder="100"
              />
            </div>
            <div>
              <Label>Área Bruta (m²)</Label>
              <Input
                type="number"
                value={formData.gross_area}
                onChange={(e) => setFormData({...formData, gross_area: e.target.value})}
                placeholder="120"
              />
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Exposição Solar</Label>
              <Select 
                value={formData.orientation} 
                onValueChange={(v) => setFormData({...formData, orientation: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="north">Norte</SelectItem>
                  <SelectItem value="south">Sul</SelectItem>
                  <SelectItem value="east">Nascente</SelectItem>
                  <SelectItem value="west">Poente</SelectItem>
                  <SelectItem value="north_south">Norte/Sul</SelectItem>
                  <SelectItem value="east_west">Nascente/Poente</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Área Varanda (m²)</Label>
              <Input
                type="number"
                value={formData.balcony_area}
                onChange={(e) => setFormData({...formData, balcony_area: e.target.value})}
                placeholder="10"
              />
            </div>
            <div>
              <Label>Lugares de Garagem</Label>
              <Select 
                value={formData.parking_spaces} 
                onValueChange={(v) => setFormData({...formData, parking_spaces: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem garagem</SelectItem>
                  <SelectItem value="1">1 lugar</SelectItem>
                  <SelectItem value="2">2 lugares</SelectItem>
                  <SelectItem value="3">3 lugares</SelectItem>
                  <SelectItem value="4+">4+ lugares</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Storage Room */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="storage_room"
              checked={formData.storage_room}
              onCheckedChange={(checked) => setFormData({...formData, storage_room: checked})}
            />
            <Label htmlFor="storage_room" className="cursor-pointer">
              Arrecadação
            </Label>
          </div>

          {/* Internal Notes */}
          <div>
            <Label>Notas Internas</Label>
            <Textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
              placeholder="Notas sobre esta unidade específica..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateUnitMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateUnitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}