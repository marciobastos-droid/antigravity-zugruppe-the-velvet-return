import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X, ZoomIn, GripVertical, Save } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";

export default function DevelopmentImageGallery({ images = [], developmentId, onImagesReordered }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const [zoomImage, setZoomImage] = React.useState(null);
  const [isReordering, setIsReordering] = React.useState(false);
  const [reorderedImages, setReorderedImages] = React.useState(images);
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    setReorderedImages(images);
    setHasChanges(false);
  }, [images]);

  React.useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleZoom = (image, index) => {
    setZoomImage({ url: image, index });
    setZoomOpen(true);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(reorderedImages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setReorderedImages(items);
    setHasChanges(true);
  };

  const saveReorder = async () => {
    if (onImagesReordered) {
      await onImagesReordered(reorderedImages);
      setHasChanges(false);
      setIsReordering(false);
      toast.success("Ordem das imagens atualizada");
    }
  };

  const cancelReorder = () => {
    setReorderedImages(images);
    setHasChanges(false);
    setIsReordering(false);
  };

  if (!images || images.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma imagem disponível</p>
      </div>
    );
  }

  if (isReordering) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900">Reordenar Imagens</h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelReorder}>
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={saveReorder} 
              disabled={!hasChanges}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Ordem
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="images">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {reorderedImages.map((image, index) => (
                  <Draggable key={`${image}-${index}`} draggableId={`${image}-${index}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-3 p-3 bg-white border-2 rounded-lg transition-all ${
                          snapshot.isDragging ? "border-blue-500 shadow-lg" : "border-slate-200"
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5 text-slate-400" />
                        </div>
                        <img
                          src={image}
                          alt={`Imagem ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border border-slate-300"
                          loading="lazy"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">Imagem {index + 1}</p>
                          <p className="text-xs text-slate-500 truncate max-w-md">{image}</p>
                        </div>
                        {index === 0 && (
                          <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            Principal
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{images.length} imagens</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsReordering(true)}
          className="text-blue-600"
        >
          <GripVertical className="w-4 h-4 mr-2" />
          Reordenar
        </Button>
      </div>

      {/* Main Carousel */}
      <div className="relative group">
        <div className="overflow-hidden rounded-xl" ref={emblaRef}>
          <div className="flex">
            {reorderedImages.map((image, index) => (
              <div key={index} className="flex-[0_0_100%] min-w-0">
                <div 
                  className="relative aspect-video bg-slate-100 cursor-pointer"
                  onClick={() => handleZoom(image, index)}
                >
                  <img
                    src={image}
                    alt={`Imagem ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-3 rounded-full">
                      <ZoomIn className="w-6 h-6 text-slate-900" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
          {reorderedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === index
                  ? "border-blue-600 ring-2 ring-blue-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <img
                src={image}
                alt={`Miniatura ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Dialog */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-7xl p-0 bg-black/95">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-6 h-6" />
            </Button>

            {zoomImage && (
              <div className="relative min-h-[70vh] max-h-[90vh] flex items-center justify-center p-8">
                <img
                  src={zoomImage.url}
                  alt={`Imagem ${zoomImage.index + 1}`}
                  className="max-w-full max-h-full object-contain"
                />

                {/* Navigation in zoom */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const prevIndex = (zoomImage.index - 1 + images.length) % images.length;
                        setZoomImage({ url: reorderedImages[prevIndex], index: prevIndex });
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const nextIndex = (zoomImage.index + 1) % images.length;
                        setZoomImage({ url: reorderedImages[nextIndex], index: nextIndex });
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </Button>
                  </>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                  {zoomImage.index + 1} / {images.length}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}