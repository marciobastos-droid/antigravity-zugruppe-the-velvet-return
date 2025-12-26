import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AISEOOptimizer({ property, onUpdate }) {
  const [seoData, setSeoData] = React.useState(null);
  const [copiedSection, setCopiedSection] = React.useState(null);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generateSEOTagsAndKeywords', {
        propertyId: property.id
      });
      return data;
    },
    onSuccess: (result) => {
      if (result.success) {
        setSeoData(result.seo_data);
        toast.success('Tags e keywords SEO geradas!', {
          description: 'Reveja as sugestões abaixo'
        });
      }
    },
    onError: (error) => {
      toast.error('Erro ao gerar SEO', {
        description: error.message
      });
    }
  });

  const applyTagsMutation = useMutation({
    mutationFn: async () => {
      if (!seoData) return;
      
      await base44.entities.Property.update(property.id, {
        tags: [...new Set([...(property.tags || []), ...seoData.tags])]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['properties']);
      onUpdate?.();
      toast.success('Tags aplicadas ao imóvel!');
    }
  });

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
    toast.success('Copiado!');
  };

  return (
    <div className="space-y-4">
      {!seoData ? (
        <div className="text-center py-6">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-4">
            Gere tags inteligentes, meta títulos e keywords otimizadas para SEO e anúncios
          </p>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A analisar imóvel...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Gerar SEO & Keywords
              </>
            )}
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="tags" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="meta">Meta SEO</TabsTrigger>
            <TabsTrigger value="ads">Anúncios</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tags Sugeridas ({seoData.tags?.length})</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => applyTagsMutation.mutate()}
                    disabled={applyTagsMutation.isPending}
                  >
                    {applyTagsMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    Aplicar ao Imóvel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {seoData.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meta" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Meta Title</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(seoData.meta_title, 'meta_title')}
                  >
                    {copiedSection === 'meta_title' ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                  {seoData.meta_title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {seoData.meta_title?.length} caracteres (ideal: 50-60)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Meta Description</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(seoData.meta_description, 'meta_description')}
                  >
                    {copiedSection === 'meta_description' ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border">
                  {seoData.meta_description}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {seoData.meta_description?.length} caracteres (ideal: 150-160)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Keywords para Google/Facebook Ads</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(seoData.ad_keywords?.join(', '), 'ad_keywords')}
                  >
                    {copiedSection === 'ad_keywords' ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {seoData.ad_keywords?.map((keyword, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 border-blue-200">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  💡 Use estas keywords em campanhas Google Ads e Facebook Ads para melhor segmentação
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Hashtags para Redes Sociais</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(seoData.social_hashtags?.join(' '), 'social_hashtags')}
                  >
                    {copiedSection === 'social_hashtags' ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {seoData.social_hashtags?.map((hashtag, idx) => (
                    <Badge key={idx} className="text-xs bg-purple-600">
                      {hashtag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  📱 Copie e cole diretamente nas suas publicações de Instagram, Facebook e LinkedIn
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {seoData && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSeoData(null);
              generateMutation.mutate();
            }}
            disabled={generateMutation.isPending}
            className="flex-1"
          >
            Gerar Novamente
          </Button>
        </div>
      )}
    </div>
  );
}