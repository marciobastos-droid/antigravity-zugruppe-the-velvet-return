import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Play, Image as ImageIcon, Loader2, Download, Volume2, Languages, Youtube } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function VideoMaker() {
  const [images, setImages] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [videoUrl, setVideoUrl] = React.useState(null);
  const [videoBlob, setVideoBlob] = React.useState(null);
  const [duration, setDuration] = React.useState("3");
  const [transition, setTransition] = React.useState("fade");
  const [voiceoverEnabled, setVoiceoverEnabled] = React.useState(false);
  const [voiceoverScript, setVoiceoverScript] = React.useState("");
  const [voiceoverTone, setVoiceoverTone] = React.useState("professional");
  const [voiceoverLanguage, setVoiceoverLanguage] = React.useState("pt");
  const [generatingVoiceover, setGeneratingVoiceover] = React.useState(false);
  const [generatedAudioText, setGeneratedAudioText] = React.useState("");
  const [youtubeDialogOpen, setYoutubeDialogOpen] = React.useState(false);
  const [youtubeTitle, setYoutubeTitle] = React.useState("");
  const [youtubeDescription, setYoutubeDescription] = React.useState("");
  const [youtubePrivacy, setYoutubePrivacy] = React.useState("private");
  const [uploadingToYoutube, setUploadingToYoutube] = React.useState(false);
  const [youtubeResult, setYoutubeResult] = React.useState(null);
  const canvasRef = React.useRef(null);

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

  const generateVoiceoverScript = async () => {
    if (images.length === 0) {
      toast.error("Adicione imagens primeiro");
      return;
    }

    setGeneratingVoiceover(true);

    try {
      const toneInstructions = {
        professional: "tom profissional e confiante, vocabulário técnico apropriado",
        enthusiastic: "tom entusiasmado e energético, linguagem positiva e motivadora",
        luxury: "tom exclusivo e sofisticado, vocabulário premium e elegante",
        warm: "tom caloroso e acolhedor, linguagem pessoal e emotiva"
      };

      const languageNames = {
        pt: "português de Portugal",
        en: "inglês",
        es: "espanhol",
        fr: "francês"
      };

      const script = await base44.integrations.Core.InvokeLLM({
        prompt: `Cria um script COMPLETO de narração (voice-over) para vídeo imobiliário em ${languageNames[voiceoverLanguage]}.

DETALHES DO VÍDEO:
- ${images.length} imagens de imóvel
- Duração por imagem: ${duration} segundos
- Duração total estimada: ${images.length * parseInt(duration)} segundos

TOM DE VOZ: ${toneInstructions[voiceoverTone]}

INSTRUÇÕES CRÍTICAS:
1. Script com ${Math.floor(images.length * parseInt(duration) * 2.5)} a ${Math.floor(images.length * parseInt(duration) * 3)} palavras
2. Divido em ${images.length} segmentos (um por imagem)
3. Cada segmento marca o que descrever naquela imagem
4. Usa pausas naturais [...] entre segmentos
5. Linguagem fluida e natural para narração
6. Destaca características premium do imóvel
7. Cria desejo e urgência subtilmente
8. Termina com call-to-action forte

FORMATO DO SCRIPT:
[IMAGEM 1 - Exterior/Fachada]
[Texto natural de narração para esta imagem]
[...]

[IMAGEM 2 - Sala]
[Texto natural de narração]
[...]

(continuar para todas as ${images.length} imagens)

[FINAL]
[Call-to-action forte]

IMPORTANTE: 
- Escreve como se fosse ser LIDO EM VOZ ALTA
- Evita texto complicado ou difícil de pronunciar
- Usa ritmo adequado para ${duration}s por imagem
- Tom ${voiceoverTone}

Retorna APENAS o script completo de narração.`
      });

      setGeneratedAudioText(script);
      setVoiceoverScript(script);
      toast.success("Script de voice-over gerado!");
    } catch (error) {
      toast.error("Erro ao gerar script");
      console.error(error);
    }

    setGeneratingVoiceover(false);
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
    setVideoBlob(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const fps = 30;
      const frameDuration = 1000 / fps;
      const imageDurationMs = parseInt(duration) * 1000;
      const framesPerImage = Math.floor(imageDurationMs / frameDuration);
      
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 5000000
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setVideoBlob(blob);
        setProcessing(false);
        toast.success("Vídeo criado com sucesso!");
      };

      recorder.start();

      // Render frames
      for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => {
            console.error("Erro ao carregar imagem:", e);
            reject(new Error("Falha ao carregar imagem"));
          };
          img.src = images[imgIndex].url;
        });

        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        for (let frame = 0; frame < framesPerImage; frame++) {
          let opacity = 1;

          if (transition === 'fade') {
            const fadeFrames = fps * 0.5;
            if (frame < fadeFrames) {
              opacity = frame / fadeFrames;
            } else if (frame > framesPerImage - fadeFrames && imgIndex < images.length - 1) {
              opacity = (framesPerImage - frame) / fadeFrames;
            }
          }

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
          ctx.globalAlpha = 1;

          await new Promise(resolve => setTimeout(resolve, frameDuration));
        }
      }

      setTimeout(() => {
        recorder.stop();
      }, 500);

    } catch (error) {
      toast.error("Erro ao criar vídeo: " + error.message);
      console.error(error);
      setProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!videoBlob) {
      toast.error("Nenhum vídeo para descarregar");
      return;
    }

    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Vídeo descarregado!");
  };

  const openYoutubeDialog = () => {
    setYoutubeTitle(`Imóvel - ${new Date().toLocaleDateString('pt-PT')}`);
    setYoutubeDescription(generatedAudioText || "Vídeo de apresentação de imóvel criado com ZuGruppe.");
    setYoutubeResult(null);
    setYoutubeDialogOpen(true);
  };

  const uploadToYoutube = async () => {
    if (!videoBlob) {
      toast.error("Nenhum vídeo para publicar");
      return;
    }

    setUploadingToYoutube(true);
    setYoutubeResult(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const videoBase64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
      });

      const response = await base44.functions.invoke('uploadToYoutube', {
        videoBase64: videoBase64,
        title: youtubeTitle,
        description: youtubeDescription,
        privacyStatus: youtubePrivacy
      });
      
      if (response.data.error) {
        throw new Error(response.data.details || response.data.error);
      }

      setYoutubeResult(response.data);
      toast.success("Vídeo publicado no YouTube!");
    } catch (error) {
      console.error('YouTube upload error:', error);
      toast.error("Erro ao publicar no YouTube: " + (error.message || "Erro desconhecido"));
    }

    setUploadingToYoutube(false);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
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

        <Card className="border-purple-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-purple-600" />
              Voice-Over com IA
              <Badge className="bg-purple-100 text-purple-800">Novo</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Idioma
              </Label>
              <Select value={voiceoverLanguage} onValueChange={setVoiceoverLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">🇵🇹 Português</SelectItem>
                  <SelectItem value="en">🇬🇧 Inglês</SelectItem>
                  <SelectItem value="es">🇪🇸 Espanhol</SelectItem>
                  <SelectItem value="fr">🇫🇷 Francês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tom da Narração</Label>
              <Select value={voiceoverTone} onValueChange={setVoiceoverTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">🎯 Profissional</SelectItem>
                  <SelectItem value="enthusiastic">⚡ Entusiasmado</SelectItem>
                  <SelectItem value="luxury">💎 Luxo</SelectItem>
                  <SelectItem value="warm">❤️ Caloroso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generateVoiceoverScript}
              disabled={generatingVoiceover || images.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {generatingVoiceover ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  IA a gerar script...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Gerar Script de Narração
                </>
              )}
            </Button>

            {generatedAudioText && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-900 mb-2">✨ Script Gerado</p>
                <div className="bg-white rounded p-2 max-h-40 overflow-y-auto">
                  <p className="text-xs text-slate-700 whitespace-pre-line">
                    {generatedAudioText.substring(0, 200)}...
                  </p>
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  Use um serviço de text-to-speech para criar o áudio
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
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

        {generatedAudioText && (
          <Card className="border-purple-500">
            <CardHeader>
              <CardTitle className="text-lg text-purple-900">Script de Narração Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generatedAudioText}
                onChange={(e) => setGeneratedAudioText(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="O script será gerado aqui..."
              />
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedAudioText);
                    toast.success("Script copiado!");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Copiar Script
                </Button>
                <Button
                  onClick={generateVoiceoverScript}
                  variant="outline"
                  disabled={generatingVoiceover}
                  className="flex-1"
                >
                  Regenerar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="flex gap-2">
                <Button 
                  onClick={downloadVideo}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descarregar
                </Button>
                <Button 
                  onClick={openYoutubeDialog}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Youtube className="w-4 h-4 mr-2" />
                  YouTube
                </Button>
              </div>
              {generatedAudioText && (
                <p className="text-xs text-green-800 mt-3 text-center">
                  💡 Use o script gerado com um serviço de text-to-speech para adicionar áudio
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* YouTube Upload Dialog */}
        <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-600" />
                Publicar no YouTube
              </DialogTitle>
            </DialogHeader>
            
            {youtubeResult ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-800 font-medium mb-2">✅ Vídeo publicado com sucesso!</p>
                  <a 
                    href={youtubeResult.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {youtubeResult.videoUrl}
                  </a>
                </div>
                <Button 
                  onClick={() => setYoutubeDialogOpen(false)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Título do Vídeo</Label>
                  <Input
                    value={youtubeTitle}
                    onChange={(e) => setYoutubeTitle(e.target.value)}
                    placeholder="Título do vídeo..."
                  />
                </div>
                
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={youtubeDescription}
                    onChange={(e) => setYoutubeDescription(e.target.value)}
                    rows={4}
                    placeholder="Descrição do vídeo..."
                  />
                </div>
                
                <div>
                  <Label>Privacidade</Label>
                  <Select value={youtubePrivacy} onValueChange={setYoutubePrivacy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">🔒 Privado</SelectItem>
                      <SelectItem value="unlisted">🔗 Não listado</SelectItem>
                      <SelectItem value="public">🌐 Público</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setYoutubeDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={uploadToYoutube}
                    disabled={uploadingToYoutube || !youtubeTitle}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {uploadingToYoutube ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        A publicar...
                      </>
                    ) : (
                      <>
                        <Youtube className="w-4 h-4 mr-2" />
                        Publicar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}