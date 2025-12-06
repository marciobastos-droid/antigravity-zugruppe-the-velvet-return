import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, FileText, Tags, Globe, 
  Loader2, Copy, Check, RefreshCw, 
  TrendingUp, ExternalLink, Home
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AIPropertyEnhancer({ open, onOpenChange, property }) {
  const [activeTab, setActiveTab] = React.useState("description");
  const [generatedDescription, setGeneratedDescription] = React.useState("");
  const [suggestedTags, setSuggestedTags] = React.useState([]);
  const [publicationRecommendations, setPublicationRecommendations] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const queryClient = useQueryClient();

  // Reset quando abrir/fechar
  React.useEffect(() => {
    if (open && property) {
      setGeneratedDescription("");
      setSuggestedTags([]);
      setPublicationRecommendations(null);
      setCopied(false);
    }
  }, [open, property]);

  const generateDescriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generatePropertyDescription', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedDescription(data.description);
        toast.success("Descrição gerada com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar descrição");
      }
    },
    onError: (error) => {
      toast.error("Erro ao gerar descrição");
      console.error(error);
    }
  });

  const suggestTagsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('suggestPropertyTags', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setSuggestedTags(data.tags);
        toast.success(`${data.tags.length} etiquetas sugeridas!`);
      } else {
        toast.error(data.error || "Erro ao sugerir etiquetas");
      }
    },
    onError: (error) => {
      toast.error("Erro ao sugerir etiquetas");
      console.error(error);
    }
  });

  const recommendChannelsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('recommendPublicationChannels', {
        propertyId: property.id
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setPublicationRecommendations(data.recommendations);
        toast.success("Recomendações geradas!");
      } else {
        toast.error(data.error || "Erro ao gerar recomendações");
      }
    },
    onError: (error) => {
      toast.error("Erro ao gerar recomendações");
      console.error(error);
    }
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.Property.update(property.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['myProperties'] });
      toast.success("Imóvel atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar imóvel");
    }
  });

  const handleApplyDescription = () => {
    if (generatedDescription) {
      updatePropertyMutation.mutate({ description: generatedDescription });
    }
  };

  const handleApplyTags = () => {
    if (suggestedTags.length > 0) {
      const existingTags = property.tags || [];
      const newTags = [...new Set([...existingTags, ...suggestedTags])];
      updatePropertyMutation.mutate({ tags: newTags });
    }
  };

  const handleApplyPublication = () => {
    if (publicationRecommendations) {
      const recommendedPortals = publicationRecommendations.portals
        .filter(p => p.priority === "alta")
        .map(p => p.id);
      const recommendedPages = publicationRecommendations.pages
        .filter(p => p.priority === "alta" || p.priority === "média")
        .map(p => p.id);
      
      updatePropertyMutation.mutate({
        published_portals: recommendedPortals,
        published_pages: recommendedPages
      });
    }
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(generatedDescription);
    setCopied(true);
    toast.success("Descrição copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const priorityColors = {
    alta: "bg-green-100 text-green-800 border-green-300",
    média: "bg-yellow-100 text-yellow-800 border-yellow-300",
    baixa: "bg-slate-100 text-slate-800 border-slate-300"
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Melhorar Imóvel com IA
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-1">
            {property.title}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description" className="gap-2">
              <FileText className="w-4 h-4" />
              Descrição
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              <Tags className="w-4 h-4" />
              Etiquetas
            </TabsTrigger>
            <TabsTrigger value="publication" className="gap-2">
              <Globe className="w-4 h-4" />
              Publicação
            </TabsTrigger>
          </TabsList>

          {/* TAB: Descrição */}
          <TabsContent value="description" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gerar Descrição Profissional</CardTitle>
                <p className="text-sm text-slate-600">
                  A IA analisa as características do imóvel e as fotos para criar uma descrição atrativa e detalhada.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => generateDescriptionMutation.mutate()}
                  disabled={generateDescriptionMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {generateDescriptionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A gerar descrição...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Descrição
                    </>
                  )}
                </Button>

                {generatedDescription && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Textarea
                        value={generatedDescription}
                        onChange={(e) => setGeneratedDescription(e.target.value)}
                        rows={10}
                        className="font-sans text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyDescription}
                        className="absolute top-2 right-2"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleApplyDescription}
                        disabled={updatePropertyMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {updatePropertyMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Aplicar ao Imóvel
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => generateDescriptionMutation.mutate()}
                        disabled={generateDescriptionMutation.isPending}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Etiquetas */}
          <TabsContent value="tags" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sugerir Etiquetas Relevantes</CardTitle>
                <p className="text-sm text-slate-600">
                  A IA analisa o perfil do imóvel e sugere tags que facilitam a pesquisa e categorização.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => suggestTagsMutation.mutate()}
                  disabled={suggestTagsMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {suggestTagsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar imóvel...
                    </>
                  ) : (
                    <>
                      <Tags className="w-4 h-4 mr-2" />
                      Sugerir Etiquetas
                    </>
                  )}
                </Button>

                {suggestedTags.length > 0 && (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Etiquetas sugeridas ({suggestedTags.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedTags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleApplyTags}
                      disabled={updatePropertyMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {updatePropertyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Adicionar Etiquetas ao Imóvel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Publicação */}
          <TabsContent value="publication" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recomendar Canais de Publicação</CardTitle>
                <p className="text-sm text-slate-600">
                  A IA analisa o perfil do imóvel e recomenda os melhores portais e páginas para maximizar visibilidade.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => recommendChannelsMutation.mutate()}
                  disabled={recommendChannelsMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {recommendChannelsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      A analisar...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Gerar Recomendações
                    </>
                  )}
                </Button>

                {publicationRecommendations && (
                  <div className="space-y-4">
                    {/* Portais */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Portais Recomendados
                      </h4>
                      <div className="space-y-2">
                        {publicationRecommendations.portals.map((portal, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900 capitalize">{portal.id}</span>
                                <Badge className={priorityColors[portal.priority]}>
                                  {portal.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">{portal.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Páginas */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Páginas do Website
                      </h4>
                      <div className="space-y-2">
                        {publicationRecommendations.pages.map((page, idx) => (
                          <div key={idx} className="flex items-start justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900 capitalize">{page.id}</span>
                                <Badge className={priorityColors[page.priority]}>
                                  {page.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600">{page.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleApplyPublication}
                      disabled={updatePropertyMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {updatePropertyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Aplicar Recomendações (Prioridade Alta)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}