import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, Image, Video, FileText, Trash2, Loader2, 
  CheckCircle2, X, GripVertical, Eye, Download, FolderOpen,
  Camera, Map, Layout, Sparkles, Star, Tag, Wand2, ImagePlus
} from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FILE_CATEGORIES = {
  photos: { label: "Fotos", icon: Camera, accept: "image/*", color: "bg-blue-100 text-blue-700" },
  videos: { label: "Vídeos", icon: Video, accept: "video/*", color: "bg-purple-100 text-purple-700" },
  floorplans: { label: "Plantas", icon: Layout, accept: "image/*,application/pdf", color: "bg-green-100 text-green-700" },
  documents: { label: "Documentos", icon: FileText, accept: ".pdf,.doc,.docx", color: "bg-amber-100 text-amber-700" }
};

export default function PropertyMediaUploader({ property, onUpdate }) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState({});
  const [selectedCategory, setSelectedCategory] = React.useState("photos");
  const [media, setMedia] = React.useState({
    photos: property?.images || [],
    videos: property?.videos || [],
    floorplans: property?.floorplans || [],
    documents: property?.documents || []
  });
  const [imageAnalysis, setImageAnalysis] = React.useState({});
  const [analyzingImages, setAnalyzingImages] = React.useState(false);
  const [heroSuggestion, setHeroSuggestion] = React.useState(null);

  React.useEffect(() => {
    setMedia({
      photos: property?.images || [],
      videos: property?.videos || [],
      floorplans: property?.floorplans || [],
      documents: property?.documents || []
    });
  }, [property]);

  const analyzeImages = async () => {
    if (!media.photos || media.photos.length === 0) {
      toast.error("Sem fotos para analisar");
      return;
    }

    setAnalyzingImages(true);
    try {
      const analysisPromises = media.photos.map(async (url, index) => {
        const prompt = `Analisa esta imagem de imóvel e retorna um objeto JSON com:
{
  "room_type": "tipo de divisão em português (cozinha, sala, quarto, casa de banho, fachada, exterior, jardim, varanda, escritório, garagem, outro)",
  "quality_score": "pontuação de 0-10 da qualidade da foto (iluminação, composição, nitidez)",
  "is_hero_candidate": "true se esta foto é boa para ser a foto de capa (boa qualidade, mostra bem o imóvel)",
  "tags": ["array de 2-4 tags descritivas em português"],
  "enhancement_suggestions": "sugestões breves de melhorias se necessário"
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: [url],
          response_json_schema: {
            type: "object",
            properties: {
              room_type: { type: "string" },
              quality_score: { type: "number" },
              is_hero_candidate: { type: "boolean" },
              tags: { type: "array", items: { type: "string" } },
              enhancement_suggestions: { type: "string" }
            }
          }
        });

        return { url, index, ...result };
      });

      const results = await Promise.all(analysisPromises);
      
      const analysisMap = {};
      results.forEach(result => {
        analysisMap[result.url] = result;
      });
      
      setImageAnalysis(analysisMap);

      // Suggest hero image
      const heroCandidates = results
        .filter(r => r.is_hero_candidate && r.quality_score >= 7)
        .sort((a, b) => b.quality_score - a.quality_score);
      
      if (heroCandidates.length > 0) {
        setHeroSuggestion(heroCandidates[0].index);
        toast.success(`IA analisou ${results.length} fotos e sugeriu foto de capa!`);
      } else {
        toast.success(`IA analisou ${results.length} fotos!`);
      }
    } catch (error) {
      console.error("Error analyzing images:", error);
      toast.error("Erro ao analisar imagens");
    }
    setAnalyzingImages(false);
  };

  const applyHeroSuggestion = async () => {
    if (heroSuggestion === null) return;

    const photos = [...media.photos];
    const [heroImage] = photos.splice(heroSuggestion, 1);
    photos.unshift(heroImage);

    const updatedMedia = { ...media, photos };
    setMedia(updatedMedia);

    try {
      await onUpdate?.(property.id, { images: photos });
      toast.success("Foto de capa aplicada!");
      setHeroSuggestion(null);
    } catch (error) {
      toast.error("Erro ao aplicar foto de capa");
    }
  };

  const organizePhotosByRoom = async () => {
    if (!media.photos || media.photos.length === 0 || Object.keys(imageAnalysis).length === 0) {
      toast.error("Analise as fotos primeiro");
      return;
    }

    // Sort photos by room type priority
    const roomPriority = {
      'fachada': 1,
      'sala': 2,
      'cozinha': 3,
      'quarto': 4,
      'casa de banho': 5,
      'exterior': 6,
      'jardim': 7,
      'varanda': 8,
      'escritório': 9,
      'garagem': 10,
      'outro': 11
    };

    const sortedPhotos = [...media.photos].sort((a, b) => {
      const analysisA = imageAnalysis[a];
      const analysisB = imageAnalysis[b];
      
      if (!analysisA || !analysisB) return 0;
      
      const priorityA = roomPriority[analysisA.room_type] || 99;
      const priorityB = roomPriority[analysisB.room_type] || 99;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // If same room type, sort by quality
      return (analysisB.quality_score || 0) - (analysisA.quality_score || 0);
    });

    const updatedMedia = { ...media, photos: sortedPhotos };
    setMedia(updatedMedia);

    try {
      await onUpdate?.(property.id, { images: sortedPhotos });
      toast.success("Fotos organizadas por divisão!");
    } catch (error) {
      toast.error("Erro ao organizar fotos");
    }
  };

  const handleFileSelect = async (e, category) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const newFiles = [];
    const progress = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progress[file.name] = 0;
      setUploadProgress({ ...progress });

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          progress[file.name] = Math.min(progress[file.name] + 20, 90);
          setUploadProgress({ ...progress });
        }, 200);

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        clearInterval(progressInterval);
        progress[file.name] = 100;
        setUploadProgress({ ...progress });

        newFiles.push(file_url);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Erro ao carregar ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      const updatedMedia = {
        ...media,
        [category]: [...media[category], ...newFiles]
      };
      setMedia(updatedMedia);

      // Update property
      const updateData = {};
      if (category === 'photos') updateData.images = updatedMedia.photos;
      else if (category === 'videos') updateData.videos = updatedMedia.videos;
      else if (category === 'floorplans') updateData.floorplans = updatedMedia.floorplans;
      else if (category === 'documents') updateData.documents = updatedMedia.documents;

      try {
        await onUpdate?.(property.id, updateData);
        toast.success(`${newFiles.length} ficheiro(s) carregado(s)!`);
      } catch (error) {
        toast.error("Erro ao guardar ficheiros");
      }
    }

    setUploading(false);
    setUploadProgress({});
    e.target.value = '';
  };

  const removeFile = async (category, index) => {
    const updatedCategory = [...media[category]];
    updatedCategory.splice(index, 1);
    
    const updatedMedia = { ...media, [category]: updatedCategory };
    setMedia(updatedMedia);

    const updateData = {};
    if (category === 'photos') updateData.images = updatedCategory;
    else if (category === 'videos') updateData.videos = updatedCategory;
    else if (category === 'floorplans') updateData.floorplans = updatedCategory;
    else if (category === 'documents') updateData.documents = updatedCategory;

    try {
      await onUpdate?.(property.id, updateData);
      toast.success("Ficheiro removido");
    } catch (error) {
      toast.error("Erro ao remover ficheiro");
    }
  };

  const handleDragEnd = async (result, category) => {
    if (!result.destination) return;

    const items = Array.from(media[category]);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedMedia = { ...media, [category]: items };
    setMedia(updatedMedia);

    const updateData = {};
    if (category === 'photos') updateData.images = items;
    else if (category === 'videos') updateData.videos = items;
    else if (category === 'floorplans') updateData.floorplans = items;
    else if (category === 'documents') updateData.documents = items;

    try {
      await onUpdate?.(property.id, updateData);
    } catch (error) {
      toast.error("Erro ao reordenar");
    }
  };

  const getFileType = (url) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'document';
  };

  const CategoryConfig = FILE_CATEGORIES[selectedCategory];

  return (
    <div className="space-y-4">
      {/* AI Tools */}
      {selectedCategory === 'photos' && media.photos?.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Ferramentas IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={analyzeImages}
                disabled={analyzingImages}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {analyzingImages ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    A analisar...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 mr-1" />
                    Analisar Fotos
                  </>
                )}
              </Button>
              
              {Object.keys(imageAnalysis).length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={organizePhotosByRoom}
                  >
                    <Layout className="w-3 h-3 mr-1" />
                    Organizar por Divisão
                  </Button>
                  
                  {heroSuggestion !== null && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={applyHeroSuggestion}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Aplicar Foto de Capa Sugerida
                    </Button>
                  )}
                </>
              )}
            </div>

            {Object.keys(imageAnalysis).length > 0 && (
              <div className="text-xs text-purple-700">
                ✨ {Object.keys(imageAnalysis).length} fotos analisadas
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.entries(FILE_CATEGORIES).map(([key, config]) => {
          const Icon = config.icon;
          const count = media[key]?.length || 0;
          return (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(key)}
              className="flex-shrink-0"
            >
              <Icon className="w-4 h-4 mr-1" />
              {config.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Upload Zone */}
      <div className="relative">
        <input
          type="file"
          multiple
          accept={CategoryConfig.accept}
          onChange={(e) => handleFileSelect(e, selectedCategory)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uploading ? 'border-purple-300 bg-purple-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50'
        }`}>
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="w-8 h-8 mx-auto text-purple-600 animate-spin" />
              <p className="text-sm text-purple-600">A carregar ficheiros...</p>
              {Object.entries(uploadProgress).map(([name, progress]) => (
                <div key={name} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="truncate max-w-[200px]">{name}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600">
                Arraste ficheiros ou clique para carregar
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {CategoryConfig.label}: {CategoryConfig.accept}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Files Grid */}
      {media[selectedCategory]?.length > 0 && (
        <DragDropContext onDragEnd={(result) => handleDragEnd(result, selectedCategory)}>
          <Droppable droppableId={selectedCategory} direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-3 gap-2"
              >
                {media[selectedCategory].map((url, index) => {
                  const fileType = getFileType(url);
                  return (
                    <Draggable key={url} draggableId={url} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative group aspect-square rounded-lg overflow-hidden border ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-purple-500' : ''
                          }`}
                        >
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-1 left-1 z-10 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                          >
                            <GripVertical className="w-3 h-3 text-white" />
                          </div>

                          {/* Preview */}
                          {fileType === 'image' ? (
                            <img
                              src={url}
                              alt={`Media ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : fileType === 'video' ? (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                              <Video className="w-8 h-8 text-white" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                              <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                          )}

                          {/* Index Badge & AI Tags */}
                          <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                            {index === 0 && selectedCategory === 'photos' && (
                              <Badge className="bg-amber-500 text-xs">
                                Capa
                              </Badge>
                            )}
                            {heroSuggestion === index && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className="bg-purple-500 text-xs cursor-help">
                                      <Star className="w-2 h-2 mr-0.5" />
                                      IA
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Sugerida pela IA como foto de capa</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          
                          {/* AI Analysis Info */}
                          {imageAnalysis[url] && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-wrap gap-1">
                                      <Badge className="bg-black/70 text-white text-xs">
                                        {imageAnalysis[url].room_type}
                                      </Badge>
                                      <Badge className="bg-black/70 text-white text-xs">
                                        ★ {imageAnalysis[url].quality_score}/10
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1 text-xs">
                                      <p><strong>Divisão:</strong> {imageAnalysis[url].room_type}</p>
                                      <p><strong>Qualidade:</strong> {imageAnalysis[url].quality_score}/10</p>
                                      {imageAnalysis[url].tags && (
                                        <p><strong>Tags:</strong> {imageAnalysis[url].tags.join(', ')}</p>
                                      )}
                                      {imageAnalysis[url].enhancement_suggestions && (
                                        <p><strong>Melhorias:</strong> {imageAnalysis[url].enhancement_suggestions}</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}

                          {/* Actions Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white rounded-full hover:bg-slate-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="w-4 h-4 text-slate-700" />
                            </a>
                            <button
                              onClick={() => removeFile(selectedCategory, index)}
                              className="p-2 bg-red-500 rounded-full hover:bg-red-600"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Empty State */}
      {(!media[selectedCategory] || media[selectedCategory].length === 0) && !uploading && (
        <div className="text-center py-8 text-slate-500">
          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum ficheiro em {CategoryConfig.label}</p>
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {Object.entries(FILE_CATEGORIES).map(([key, config]) => {
          const count = media[key]?.length || 0;
          if (count === 0) return null;
          return (
            <Badge key={key} className={config.color}>
              {count} {config.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}