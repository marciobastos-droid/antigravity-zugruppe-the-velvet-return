import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Image, Search, Loader2, Upload, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BulkPhotoAssign({ open, onOpenChange, selectedPropertyIds = [] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Sincronizar com selectedPropertyIds quando o dialog abre
  React.useEffect(() => {
    if (open) {
      setSelectedProperties(selectedPropertyIds);
    }
  }, [open, selectedPropertyIds]);

  const { data: properties = [] } = useQuery({
    queryKey: ['allProperties'],
    queryFn: () => base44.entities.Property.list('-updated_date'),
  });

  // Filtrar propriedades pela pesquisa
  const filteredProperties = properties.filter(p => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(searchLower) ||
      p.ref_id?.toLowerCase().includes(searchLower) ||
      p.city?.toLowerCase().includes(searchLower)
    );
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      });
      const uploadedUrls = await Promise.all(uploadPromises);
      setNewImages(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} foto(s) carregada(s)`);
      e.target.value = null;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao carregar fotos: " + (error.message || "Erro desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleProperty = (propertyId) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAll = () => {
    setSelectedProperties(filteredProperties.map(p => p.id));
  };

  const deselectAll = () => {
    setSelectedProperties([]);
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (selectedProperties.length === 0) throw new Error("Selecione pelo menos um imóvel");
      if (newImages.length === 0) throw new Error("Adicione pelo menos uma foto");

      await Promise.all(
        selectedProperties.map(propertyId =>
          base44.entities.Property.update(propertyId, { images: newImages })
        )
      );
    },
    onSuccess: () => {
      toast.success(`Fotos aplicadas a ${selectedProperties.length} imóveis`);
      queryClient.invalidateQueries({ queryKey: ['allProperties'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onOpenChange(false);
      setNewImages([]);
      setSelectedProperties([]);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao aplicar fotos");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Aplicar Fotos a Múltiplos Imóveis
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending || selectedProperties.length === 0 || newImages.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A aplicar...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Aplicar ({selectedProperties.length})
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload de Fotos */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Novas Fotos (substituirão as atuais)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="bulk-photo-upload"
                disabled={uploading}
              />
              <label htmlFor="bulk-photo-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                )}
                <p className="text-sm text-slate-600">
                  {uploading ? "A carregar..." : "Clique para adicionar fotos"}
                </p>
              </label>
            </div>

            {/* Preview das fotos */}
            {newImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {newImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seleção de Imóveis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Selecionar Imóveis ({selectedProperties.length} selecionados)
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Selecionar Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Limpar
                </Button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar imóveis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredProperties.map(property => (
                  <div
                    key={property.id}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer ${
                      selectedProperties.includes(property.id) ? "bg-blue-50" : ""
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleProperty(property.id);
                    }}
                  >
                    <Checkbox
                      checked={selectedProperties.includes(property.id)}
                      onCheckedChange={(checked) => {
                        toggleProperty(property.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {property.images?.[0] ? (
                      <img
                        src={property.images[0]}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                        <Image className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{property.title}</p>
                      <p className="text-xs text-slate-500">
                        {property.ref_id} • {property.city}
                      </p>
                    </div>
                    {property.images?.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {property.images.length} fotos
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Aviso */}
          {selectedProperties.length > 0 && newImages.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Trash2 className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                As fotos atuais de <strong>{selectedProperties.length} imóveis</strong> serão substituídas por <strong>{newImages.length} novas fotos</strong>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || selectedProperties.length === 0 || newImages.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {applyMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A aplicar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Aplicar Fotos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}