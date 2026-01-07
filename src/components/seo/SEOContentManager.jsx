import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Sparkles, TrendingUp, Calendar } from "lucide-react";
import DynamicSEOSuggestions from "./DynamicSEOSuggestions";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Central de gestão de SEO e conteúdo
 * Inclui sugestões dinâmicas, geração de blog posts, e otimização
 */
export default function SEOContentManager() {
  const [generatingBlog, setGeneratingBlog] = React.useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list()
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: async () => {
      try {
        return await base44.entities.BlogPost.list('-published_date', 10);
      } catch {
        return [];
      }
    }
  });

  const generateBlogPost = async () => {
    setGeneratingBlog(true);
    try {
      const response = await base44.functions.invoke('generateWeeklyBlogPost', {});
      
      if (response.data.success) {
        toast.success(`Artigo criado: ${response.data.title}`);
        // Refresh blog posts
        window.location.reload();
      } else {
        throw new Error(response.data.error || 'Erro ao gerar artigo');
      }
    } catch (error) {
      console.error('[SEOContentManager] Error:', error);
      toast.error('Erro ao gerar artigo: ' + error.message);
    } finally {
      setGeneratingBlog(false);
    }
  };

  const activeProperties = properties.filter(p => 
    p.status === 'active' && 
    p.visibility === 'public' &&
    p.published_pages?.length > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Gestão de SEO e Conteúdo</h2>
        <p className="text-slate-600">Otimize a visibilidade do seu website e gere conteúdo automaticamente</p>
      </div>

      <Tabs defaultValue="seo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            SEO Dinâmico
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Geração Automática
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seo" className="mt-6">
          <DynamicSEOSuggestions 
            properties={activeProperties}
            activeFilters={{}}
          />
        </TabsContent>

        <TabsContent value="blog" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Artigos Publicados ({blogPosts.length})
                </span>
                <Button
                  onClick={generateBlogPost}
                  disabled={generatingBlog}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generatingBlog ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                      A gerar...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Artigo com IA
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blogPosts.length > 0 ? (
                <div className="space-y-3">
                  {blogPosts.map((post) => (
                    <div key={post.id} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{post.title}</h3>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {post.meta_description || post.content?.substring(0, 150)}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.published_date).toLocaleDateString('pt-PT')}
                            {post.is_ai_generated && (
                              <>
                                <span>•</span>
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                <span className="text-purple-600">Gerado por IA</span>
                              </>
                            )}
                          </div>
                        </div>
                        {post.featured_image && (
                          <img 
                            src={post.featured_image} 
                            alt={post.title}
                            className="w-20 h-20 object-cover rounded flex-shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum artigo publicado ainda</p>
                  <p className="text-sm mt-1">Clique em "Gerar Artigo" para criar o primeiro</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Geração Automática de Conteúdo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Blog Posts Semanais
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  Artigos automáticos gerados todas as segundas-feiras às 9h sobre o mercado imobiliário
                </p>
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <Calendar className="w-3 h-3" />
                  <span>Próximo artigo: próxima segunda-feira às 9h</span>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Descrições de Imóveis
                </h4>
                <p className="text-sm text-purple-800 mb-3">
                  Ao editar imóveis, pode usar IA para gerar descrições otimizadas baseadas nas características e imagens
                </p>
                <p className="text-xs text-purple-700">
                  Disponível na edição de imóveis → Ferramentas IA
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  SEO Dinâmico
                </h4>
                <p className="text-sm text-green-800">
                  Meta tags e palavras-chave são geradas automaticamente com base nos imóveis e filtros ativos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}