import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Home, Building2, TrendingUp, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AVAILABLE_PORTALS = [
  { id: "idealista", name: "Idealista", icon: ExternalLink, color: "text-green-600" },
  { id: "imovirtual", name: "Imovirtual", icon: ExternalLink, color: "text-blue-600" },
  { id: "casafari", name: "Casafari", icon: ExternalLink, color: "text-orange-600" },
  { id: "olx", name: "OLX", icon: ExternalLink, color: "text-purple-600" },
  { id: "supercasa", name: "Supercasa", icon: ExternalLink, color: "text-red-600" },
  { id: "custojusto", name: "Custo Justo", icon: ExternalLink, color: "text-yellow-600" }
];

const AVAILABLE_PAGES = [
  { id: "browse", name: "Página Navegar", icon: Building2, description: "Listagem principal de imóveis" },
  { id: "zuhaus", name: "ZuHaus - Residencial", icon: Home, description: "Página dedicada a imóveis residenciais" },
  { id: "zuhandel", name: "ZuHandel - Comercial", icon: Building2, description: "Página dedicada a imóveis comerciais" },
  { id: "homepage_featured", name: "Homepage - Destaque", icon: Home, description: "Imóveis em destaque na página inicial" },
  { id: "investor_section", name: "Secção Investidores", icon: TrendingUp, description: "Página dedicada a investidores" },
  { id: "luxury_collection", name: "Coleção Luxo", icon: FileText, description: "Imóveis de luxo premium" }
];

export default function BulkPublicationDialog({ open, onOpenChange, selectedPropertyIds, properties }) {
  const queryClient = useQueryClient();
  const [selectedPortals, setSelectedPortals] = React.useState([]);
  const [selectedPages, setSelectedPages] = React.useState([]);
  const [mode, setMode] = React.useState("add"); // "add" or "replace"
  
  const selectedPropertiesData = React.useMemo(() => 
    properties.filter(p => selectedPropertyIds.includes(p.id)),
    [properties, selectedPropertyIds]
  );

  const updateMutation = useMutation({
    mutationFn: async ({ portals, pages, mode }) => {
      const updates = selectedPropertiesData.map(property => {
        let newPortals, newPages;
        
        if (mode === "add") {
          // Adicionar aos existentes
          newPortals = [...new Set([...(property.published_portals || []), ...portals])];
          newPages = [...new Set([...(property.published_pages || []), ...pages])];
        } else {
          // Substituir
          newPortals = portals;
          newPages = pages;
        }
        
        return base44.entities.Property.update(property.id, {
          published_portals: newPortals,
          published_pages: newPages
        });
      });
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success(`Publicação atualizada em ${selectedPropertyIds.length} imóveis`);
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
      resetState();
    },
    onError: () => {
      toast.error("Erro ao atualizar publicação");
    }
  });

  const resetState = () => {
    setSelectedPortals([]);
    setSelectedPages([]);
    setMode("add");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const togglePortal = (portalId) => {
    setSelectedPortals(prev => 
      prev.includes(portalId)
        ? prev.filter(p => p !== portalId)
        : [...prev, portalId]
    );
  };

  const togglePage = (pageId) => {
    setSelectedPages(prev => 
      prev.includes(pageId)
        ? prev.filter(p => p !== pageId)
        : [...prev, pageId]
    );
  };

  const handleSubmit = () => {
    if (selectedPortals.length === 0 && selectedPages.length === 0) {
      toast.error("Selecione pelo menos um portal ou página");
      return;
    }
    
    updateMutation.mutate({
      portals: selectedPortals,
      pages: selectedPages,
      mode
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Gestão de Publicação em Massa
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? "imóvel selecionado" : "imóveis selecionados"}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Mode Selection */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <Label className="text-sm font-semibold mb-3 block">Modo de Atualização</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode("add")}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    mode === "add"
                      ? "border-blue-500 bg-white"
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}
                >
                  <p className="font-medium text-slate-900">Adicionar</p>
                  <p className="text-xs text-slate-600 mt-1">Adicionar às publicações existentes</p>
                </button>
                <button
                  onClick={() => setMode("replace")}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    mode === "replace"
                      ? "border-blue-500 bg-white"
                      : "border-slate-200 hover:border-slate-300 bg-white/50"
                  }`}
                >
                  <p className="font-medium text-slate-900">Substituir</p>
                  <p className="text-xs text-slate-600 mt-1">Substituir todas as publicações</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Portais Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Portais Imobiliários</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_PORTALS.map((portal) => {
                const Icon = portal.icon;
                const isSelected = selectedPortals.includes(portal.id);
                
                return (
                  <div
                    key={portal.id}
                    onClick={() => togglePortal(portal.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePortal(portal.id)}
                    />
                    <Icon className={`w-5 h-5 ${isSelected ? portal.color : "text-slate-400"}`} />
                    <span className={`font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                      {portal.name}
                    </span>
                  </div>
                );
              })}
            </div>
            {selectedPortals.length > 0 && (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 mt-3">
                {selectedPortals.length} {selectedPortals.length === 1 ? "portal selecionado" : "portais selecionados"}
              </Badge>
            )}
          </div>

          {/* Pages Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Páginas do Website</Label>
            <div className="space-y-2">
              {AVAILABLE_PAGES.map((page) => {
                const Icon = page.icon;
                const isSelected = selectedPages.includes(page.id);
                
                return (
                  <div
                    key={page.id}
                    onClick={() => togglePage(page.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => togglePage(page.id)}
                      className="mt-0.5"
                    />
                    <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? "text-green-600" : "text-slate-400"}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                        {page.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{page.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedPages.length > 0 && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 mt-3">
                {selectedPages.length} {selectedPages.length === 1 ? "página selecionada" : "páginas selecionadas"}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || (selectedPortals.length === 0 && selectedPages.length === 0)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A atualizar...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {mode === "add" ? "Adicionar a" : "Substituir em"} {selectedPropertyIds.length} Imóveis
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}