import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Search, Building2, MapPin, Euro, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PropertyLinker({ open, onOpenChange, opportunity }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [autoLinking, setAutoLinking] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
  });

  const linkPropertiesMutation = useMutation({
    mutationFn: async (propertyIds) => {
      const existingProps = opportunity.associated_properties || [];
      const newProps = propertyIds.map(id => {
        const prop = properties.find(p => p.id === id);
        return {
          property_id: id,
          property_title: prop?.title,
          added_date: new Date().toISOString(),
          status: 'interested'
        };
      });

      // Merge with existing, avoiding duplicates
      const allProps = [...existingProps];
      newProps.forEach(newProp => {
        if (!allProps.some(p => p.property_id === newProp.property_id)) {
          allProps.push(newProp);
        }
      });

      return await base44.entities.Opportunity.update(opportunity.id, {
        associated_properties: allProps
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success("Imóveis associados!");
      setSelectedProperties([]);
      onOpenChange(false);
    }
  });

  const autoLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('syncCRMData', {
        action: 'auto_link_properties',
        data: { opportunity_id: opportunity.id }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success(`${data.properties_linked} imóveis associados automaticamente!`);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao associar automaticamente");
    }
  });

  const filteredProperties = properties.filter(p => {
    if (!searchTerm) return p.status === 'active';
    const search = searchTerm.toLowerCase();
    return (
      p.status === 'active' &&
      (p.title?.toLowerCase().includes(search) ||
       p.city?.toLowerCase().includes(search) ||
       p.ref_id?.toLowerCase().includes(search))
    );
  });

  const alreadyLinked = (opportunity.associated_properties || []).map(p => p.property_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Associar Imóveis à Oportunidade
          </DialogTitle>
          <p className="text-sm text-slate-600">
            {opportunity.buyer_name} - {opportunity.ref_id}
          </p>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar imóveis..."
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => autoLinkMutation.mutate()}
              disabled={autoLinkMutation.isPending}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {autoLinkMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Auto-Match
            </Button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProperties.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum imóvel encontrado</p>
              </div>
            ) : (
              filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className={`p-3 border rounded-lg hover:bg-slate-50 transition-colors ${
                    alreadyLinked.includes(property.id) ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedProperties.includes(property.id) || alreadyLinked.includes(property.id)}
                      onCheckedChange={(checked) => {
                        if (alreadyLinked.includes(property.id)) return; // Already linked, can't uncheck
                        if (checked) {
                          setSelectedProperties([...selectedProperties, property.id]);
                        } else {
                          setSelectedProperties(selectedProperties.filter(id => id !== property.id));
                        }
                      }}
                      disabled={alreadyLinked.includes(property.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">{property.title}</h4>
                          {property.ref_id && (
                            <p className="text-xs text-slate-500 font-mono">{property.ref_id}</p>
                          )}
                        </div>
                        {alreadyLinked.includes(property.id) && (
                          <Badge className="bg-green-100 text-green-800">
                            Já Associado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {property.city}
                        </div>
                        <div className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          {property.price?.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {property.bedrooms}Q · {property.useful_area || property.square_feet}m²
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => linkPropertiesMutation.mutate(selectedProperties)}
              disabled={selectedProperties.length === 0 || linkPropertiesMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {linkPropertiesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Associar {selectedProperties.length} Imóveis
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}