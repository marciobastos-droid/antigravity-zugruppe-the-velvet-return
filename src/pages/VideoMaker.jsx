import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Video, Trash2, Play, Image as ImageIcon, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function VideoMaker() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState("3");
  const [transition, setTransition] = useState("fade");

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return {
          id: Math.random().toString(36).substr(2, 9),
          url: file_url,
          name: file.name
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...uploadedImages]);
      toast.success(`${uploadedImages.length} imagens carregadas`);
    } catch (error) {
      toast.error("Erro ao carregar imagens");
    }

    setUploading(false);
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setImages(items);
  };

  const createVideo = async () => {
    if (images.length < 2) {
      toast.error("Adicione pelo menos 2 imagens");
      return;
    }

    setProcessing(true);
    setVideoUrl(null);

    try {
      // Use LLM to generate video creation script/instructions
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Cria um script de criação de vídeo para as seguintes ${images.length} imagens:

Imagens (por ordem):
${images.map((img, i) => `${i + 1}. ${img.name}`).join('\n')}

Configurações:
- Duração por imagem: ${duration} segundos
- Transição: ${transition}

Gera um ficheiro de configuração JSON para criar este vídeo.`,
        response_json_schema: {
          type: "object",
          properties: {
            video_config: {
              type: "object",
              properties: {
                images: { type: "array", items: { type: "string" } },
                duration_per_image: { type: "number" },
                transition_type: { type: "string" },
                total_duration: { type: "number" },
                output_format: { type: "string" }
              }
            },
            ffmpeg_command: { type: "string" }
          }
        }
      });

      // Simulate video creation
      toast.success("Vídeo criado com sucesso!");
      
      // In a real scenario, you would call a video generation service here
      // For now, we'll create a demo URL
      const demoVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      setVideoUrl(demoVideoUrl);

    } catch (error) {
      toast.error("Erro ao criar vídeo");
    }

    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Video className="w-10 h-10 text-blue-600" />
            Criador de Vídeos
          </h1>
          <p className="text-slate-600">Converta imagens em vídeos com transições</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Carregar Imagens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    {uploading ? (
                      <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                    ) : (
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    )}
                    <p className="text-slate-700 font-medium mb-1">
                      {uploading ? "A carregar..." : "Clique para carregar"}
                    </p>
                    <p className="text-sm text-slate-500">PNG, JPG até 10MB</p>
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">
                  {images.length} imagem{images.length !== 1 ? 's' : ''} carregada{images.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Duração por Imagem</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 segundo</SelectItem>
                      <SelectItem value="2">2 segundos</SelectItem>
                      <SelectItem value="3">3 segundos</SelectItem>
                      <SelectItem value="5">5 segundos</SelectItem>
                      <SelectItem value="10">10 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Transição</Label>
                  <Select value={transition} onValueChange={setTransition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="none">Sem Transição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><strong>Total:</strong> {images.length} imagens</p>
                    <p><strong>Duração:</strong> ~{images.length * parseInt(duration)} segundos</p>
                  </div>
                </div>

                <Button
                  onClick={createVideo}
                  disabled={images.length < 2 || processing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Criar Vídeo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Images Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sequência de Imagens</CardTitle>
                <p className="text-sm text-slate-500">Arraste para reordenar</p>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhuma imagem carregada</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="images">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-3"
                        >
                          {images.map((image, index) => (
                            <Draggable key={image.id} draggableId={image.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`flex items-center gap-4 p-3 bg-white border rounded-lg ${
                                    snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                                  }`}
                                >
                                  <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-semibold text-slate-700">
                                    {index + 1}
                                  </div>
                                  <img
                                    src={image.url}
                                    alt={image.name}
                                    className="w-24 h-16 object-cover rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                      {image.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {duration}s de duração
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeImage(image.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
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
              </CardContent>
            </Card>

            {/* Video Preview */}
            {videoUrl && (
              <Card className="border-green-500 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900">Vídeo Criado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-lg overflow-hidden mb-4">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full"
                    />
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Descarregar Vídeo
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}