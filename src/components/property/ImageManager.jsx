import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Image as ImageIcon, Plus, X, Star, Upload, 
  ChevronLeft, ChevronRight, Loader2, ExternalLink, GripVertical, Sparkles, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function ImageManager({ property, onUpdate, onChange }) {
  const [images, setImages] = useState(property.images || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedImages, setExtractedImages] = useState([]);

  const updateImages = (newImages) => {
    setImages(newImages);
    if (onChange) {
      onChange(newImages);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    updateImages(items);
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    updateImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const removeImage = (index) => {
    updateImages(images.filter((_, i) => i !== index));
  };

  const setMainImage = (index) => {
    if (index === 0) return;
    const items = [...images];
    const [mainImage] = items.splice(index, 1);
    items.unshift(mainImage);
    updateImages(items);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      updateImages([...images, ...newUrls]);
      toast.success(`${files.length} imagens carregadas`);
    } catch (error) {
      toast.error("Erro ao carregar imagens");
    }
    setUploading(false);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await base44.entities.Property.update(property.id, { images });
      onUpdate?.();
      toast.success("Imagens atualizadas");
    } catch (error) {
      toast.error("Erro ao guardar alterações");
    }
    setSaving(false);
  };

  const extractImagesFromSource = async () => {
    if (!property.source_url) {
      toast.error("Imóvel sem link de origem");
      return;
    }

    setExtracting(true);
    setExtractedImages([]);
    
    try {
      const response = await base44.functions.invoke('extractWebsiteImages', {
        url: property.source_url,
        use_ai: true
      });

      const data = response.data;
      
      if (!data.success) {
        toast.error(data.error || "Erro ao extrair imagens");
        return;
      }

      const propertyImages = data.images.filter(img => 
        img.category === 'property' || img.category === 'content'
      );

      setExtractedImages(propertyImages);
      
      if (propertyImages.length === 0) {
        toast.info("Nenhuma imagem de imóvel encontrada");
      } else {
        toast.success(`${propertyImages.length} imagens extraídas!`);
      }
    } catch (error) {
      toast.error("Erro ao extrair imagens: " + (error.message || "Erro desconhecido"));
      console.error(error);
    }
    
    setExtracting(false);
  };

  const addExtractedImages = (selectedUrls) => {
    const newImages = [...images];
    selectedUrls.forEach(url => {
      if (!newImages.includes(url)) {
        newImages.push(url);
      }
    });
    updateImages(newImages);
    setExtractedImages([]);
    toast.success(`${selectedUrls.length} imagens adicionadas`);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Gestão de Imagens</h3>
            <p className="text-sm text-slate-600">
              {images.length} imagens • Arraste para reordenar
            </p>
          </div>
          <Button onClick={saveChanges} disabled={saving} className="bg-blue-600">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A guardar...
              </>
            ) : (
              "Guardar Alterações"
            )}
          </Button>
        </div>

        {/* Extract from Source */}
        {property.source_url && (
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Extrair Imagens do Link de Origem
                </Label>
                <p className="text-xs text-slate-600 mt-1">Extrai automaticamente imagens do anúncio original</p>
              </div>
              <Button 
                onClick={extractImagesFromSource} 
                disabled={extracting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A extrair...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Extrair
                  </>
                )}
              </Button>
            </div>
            <a 
              href={property.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {property.source_url.substring(0, 60)}...
            </a>
          </div>
        )}

        {/* Extracted Images Preview */}
        {extractedImages.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Label className="text-sm font-medium mb-3 block flex items-center justify-between">
              <span>Imagens Extraídas ({extractedImages.length})</span>
              <Button 
                size="sm"
                onClick={() => addExtractedImages(extractedImages.map(img => img.url))}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar Todas
              </Button>
            </Label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {extractedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img.url}
                    alt={`Extraída ${idx + 1}`}
                    className="w-full h-20 object-cover rounded border border-green-300"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addExtractedImages([img.url])}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/70"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  {img.category && (
                    <Badge className="absolute top-1 left-1 text-xs bg-green-600">
                      {img.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Image URL */}
        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Adicionar Imagem por URL</Label>
          <div className="flex gap-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
              onKeyPress={(e) => e.key === 'Enter' && addImageUrl()}
              className="flex-1"
            />
            <Button onClick={addImageUrl} variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>

        {/* Upload Files */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-2 block">Carregar Imagens</Label>
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-600">A carregar...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-600">Clique ou arraste ficheiros</span>
              </>
            )}
          </label>
        </div>

        {/* Images Grid with Drag & Drop */}
        {images.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p>Nenhuma imagem adicionada</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="images" direction="vertical">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {images.map((url, index) => (
                    <Draggable key={url + index} draggableId={url + index} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group relative bg-white border rounded-lg p-2 hover:border-blue-300 transition-all ${
                            snapshot.isDragging ? 'shadow-lg border-blue-500' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Position Badge */}
                            <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold text-slate-700">
                              {index + 1}
                            </div>

                            {/* Image Preview */}
                            <img
                              src={url}
                              alt={`Imagem ${index + 1}`}
                              className="w-12 h-12 object-cover rounded border border-slate-200"
                            />

                            {/* Main Badge */}
                            {index === 0 && (
                              <div className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-500" />
                                Principal
                              </div>
                            )}

                            {/* URL */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-600 truncate">{url}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              </a>
                              
                              {index !== 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setMainImage(index)}
                                  className="text-amber-600 hover:bg-amber-50 h-7 w-7 p-0"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeImage(index)}
                                className="text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {images.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-blue-800">
              <ImageIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">Dicas:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Arraste as imagens para reordenar</li>
                  <li>• A primeira imagem é a imagem principal (capa)</li>
                  <li>• Clique na estrela para definir como principal</li>
                  <li>• Guarde as alterações quando terminar</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}