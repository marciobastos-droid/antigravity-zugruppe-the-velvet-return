import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, FileText, TrendingUp, Target, Lightbulb, 
  ExternalLink, Copy, CheckCircle, Loader2, BarChart3,
  Globe, Link as LinkIcon, Zap, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SEOAnalytics() {
  const [analyzingKeywords, setAnalyzingKeywords] = React.useState(false);
  const [keywords, setKeywords] = React.useState([]);
  const [blogSuggestions, setBlogSuggestions] = React.useState([]);
  const [generatingBlog, setGeneratingBlog] = React.useState(false);
  const [selectedTopic, setSelectedTopic] = React.useState(null);
  const [blogContent, setBlogContent] = React.useState("");

  // Fetch properties for analysis
  const { data: properties = [] } = useQuery({
    queryKey: ['propertiesForSEO'],
    queryFn: () => base44.entities.Property.filter({ status: 'active' })
  });

  // Analyze keywords based on property portfolio
  const analyzeKeywords = async () => {
    setAnalyzingKeywords(true);
    try {
      // Extract data from properties
      const propertyTypes = [...new Set(properties.map(p => p.property_type))];
      const locations = [...new Set(properties.flatMap(p => [p.city, p.state]))].filter(Boolean);
      const priceRanges = {
        min: Math.min(...properties.map(p => p.price || 0)),
        max: Math.max(...properties.map(p => p.price || 0))
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analisa este portfólio de imóveis e gera uma estratégia de SEO para real estate em Portugal:

Portfólio:
- ${properties.length} imóveis ativos
- Tipos: ${propertyTypes.join(', ')}
- Localizações: ${locations.slice(0, 20).join(', ')}
- Preços: €${priceRanges.min.toLocaleString()} - €${priceRanges.max.toLocaleString()}

Gera:
1. Top 30 palavras-chave relevantes (com volume de pesquisa estimado e dificuldade)
2. Palavras-chave long-tail específicas para nichos
3. Palavras-chave de localização
4. Palavras-chave comerciais (compra, venda, arrendamento)

Para cada palavra-chave, indica:
- Search Volume: low/medium/high
- Difficulty: easy/medium/hard
- Intent: informational/commercial/transactional`,
        response_json_schema: {
          type: "object",
          properties: {
            primary_keywords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  keyword: { type: "string" },
                  volume: { type: "string", enum: ["low", "medium", "high"] },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  intent: { type: "string", enum: ["informational", "commercial", "transactional"] },
                  suggested_use: { type: "string" }
                }
              }
            },
            long_tail_keywords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  keyword: { type: "string" },
                  volume: { type: "string" },
                  difficulty: { type: "string" },
                  suggested_use: { type: "string" }
                }
              }
            }
          }
        }
      });

      setKeywords({
        primary: response.primary_keywords || [],
        longTail: response.long_tail_keywords || []
      });
      toast.success("Análise de palavras-chave concluída!");
    } catch (error) {
      toast.error("Erro ao analisar palavras-chave");
      console.error(error);
    } finally {
      setAnalyzingKeywords(false);
    }
  };

  // Generate blog content suggestions
  const generateBlogSuggestions = async () => {
    setGeneratingBlog(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Baseado neste portfólio imobiliário em Portugal, sugere 15 tópicos de blog altamente otimizados para SEO:

Contexto:
- ${properties.length} imóveis
- Tipos: ${[...new Set(properties.map(p => p.property_type))].join(', ')}
- Principais cidades: ${[...new Set(properties.map(p => p.city))].slice(0, 10).join(', ')}

Cada tópico deve:
1. Ser relevante para o público-alvo (compradores, vendedores, investidores)
2. Ter potencial de tráfego orgânico
3. Responder a perguntas comuns
4. Incorporar palavras-chave long-tail
5. Ser educativo e útil

Para cada tópico, fornece:
- Título SEO-otimizado
- Meta descrição (150-160 caracteres)
- Palavras-chave principais
- Outline do artigo (5-7 secções)
- Estimativa de palavras (800-2000)
- Dificuldade de rankeamento
- Público-alvo`,
        response_json_schema: {
          type: "object",
          properties: {
            blog_topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  meta_description: { type: "string" },
                  keywords: { type: "array", items: { type: "string" } },
                  outline: { type: "array", items: { type: "string" } },
                  estimated_words: { type: "number" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  target_audience: { type: "string" },
                  seo_score: { type: "number" }
                }
              }
            }
          }
        }
      });

      setBlogSuggestions(response.blog_topics || []);
      toast.success(`${response.blog_topics?.length || 0} tópicos gerados!`);
    } catch (error) {
      toast.error("Erro ao gerar sugestões de blog");
      console.error(error);
    } finally {
      setGeneratingBlog(false);
    }
  };

  // Generate full blog content
  const generateFullBlogContent = async (topic) => {
    setSelectedTopic(topic);
    setBlogContent("");
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Escreve um artigo de blog completo e otimizado para SEO:

Título: ${topic.title}
Palavras-chave: ${topic.keywords.join(', ')}
Outline: ${topic.outline.join('\n')}
Público-alvo: ${topic.target_audience}
Palavras estimadas: ${topic.estimated_words}

O artigo deve:
1. Ser informativo e profissional
2. Incluir introdução cativante
3. Desenvolver todas as secções do outline
4. Usar palavras-chave naturalmente
5. Incluir CTAs para contacto
6. Terminar com conclusão forte
7. Ser escrito em português de Portugal
8. Usar markdown para formatação (títulos, listas, bold)

Formato: Artigo completo em markdown pronto para publicar.`
      });

      setBlogContent(response);
      toast.success("Artigo gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar artigo");
      console.error(error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const volumeColors = {
    low: "bg-yellow-100 text-yellow-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-green-100 text-green-800"
  };

  const difficultyColors = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800"
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-600" />
            SEO Analytics & Content Strategy
          </CardTitle>
          <CardDescription>
            Análise de palavras-chave e sugestões de conteúdo para melhorar o ranking nos motores de busca
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={analyzeKeywords} disabled={analyzingKeywords}>
              {analyzingKeywords ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analisar Palavras-Chave
                </>
              )}
            </Button>
            <Button onClick={generateBlogSuggestions} disabled={generatingBlog} variant="outline">
              {generatingBlog ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Sugerir Tópicos de Blog
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="keywords" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keywords">
            <Target className="w-4 h-4 mr-2" />
            Palavras-Chave
          </TabsTrigger>
          <TabsTrigger value="blog">
            <FileText className="w-4 h-4 mr-2" />
            Sugestões de Blog
          </TabsTrigger>
          <TabsTrigger value="technical">
            <Zap className="w-4 h-4 mr-2" />
            SEO Técnico
          </TabsTrigger>
        </TabsList>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4 mt-4">
          {keywords.primary?.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Palavras-Chave Principais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {keywords.primary.map((kw, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">{kw.keyword}</h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(kw.keyword)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-slate-600">{kw.suggested_use}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={volumeColors[kw.volume]}>{kw.volume}</Badge>
                            <Badge className={difficultyColors[kw.difficulty]}>{kw.difficulty}</Badge>
                            <Badge variant="outline">{kw.intent}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {keywords.longTail?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Long-Tail Keywords</CardTitle>
                    <CardDescription>Palavras-chave específicas com menos concorrência</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-3">
                      {keywords.longTail.map((kw, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900">{kw.keyword}</span>
                            <div className="flex gap-1">
                              <Badge className={volumeColors[kw.volume]} className="text-xs">{kw.volume}</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={() => copyToClipboard(kw.keyword)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600">{kw.suggested_use}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Clique em "Analisar Palavras-Chave" para começar</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Blog Suggestions Tab */}
        <TabsContent value="blog" className="space-y-4 mt-4">
          {blogSuggestions.length > 0 ? (
            <div className="space-y-4">
              {blogSuggestions.map((topic, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{topic.title}</CardTitle>
                        <p className="text-sm text-slate-600">{topic.meta_description}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={difficultyColors[topic.difficulty]}>
                          {topic.difficulty}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          {topic.seo_score}/100
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Palavras-Chave:</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {topic.keywords.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Outline:</h5>
                      <ol className="space-y-1 text-sm text-slate-600">
                        {topic.outline.map((section, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 font-semibold">{i + 1}.</span>
                            <span>{section}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">Público-alvo:</span> {topic.target_audience}
                        <span className="ml-4 font-medium">Palavras:</span> {topic.estimated_words}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => generateFullBlogContent(topic)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Gerar Artigo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Blog Content Generator Dialog */}
              {selectedTopic && (
                <Card className="border-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Artigo Gerado: {selectedTopic.title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(blogContent)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {blogContent ? (
                      <Textarea
                        value={blogContent}
                        onChange={(e) => setBlogContent(e.target.value)}
                        className="min-h-[600px] font-mono text-sm"
                      />
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Clique em "Sugerir Tópicos de Blog" para gerar ideias de conteúdo</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Technical SEO Tab */}
        <TabsContent value="technical" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                URLs Importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">Sitemap.xml</span>
                  <a 
                    href="/api/functions/generateSitemap" 
                    target="_blank"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    Ver Sitemap <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-sm text-slate-600">
                  Atualizado automaticamente com todos os imóveis ativos publicados
                </p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(window.location.origin + '/api/functions/generateSitemap')}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copiar URL
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">Robots.txt</span>
                  <a 
                    href="/api/functions/generateRobotsTxt" 
                    target="_blank"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    Ver Robots.txt <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-sm text-slate-600">
                  Configuração para crawlers dos motores de busca
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Estatísticas do Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {properties.length}
                  </div>
                  <div className="text-sm text-slate-600">Imóveis Ativos</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {properties.filter(p => p.published_pages?.includes('zugruppe')).length}
                  </div>
                  <div className="text-sm text-slate-600">Publicados Website</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {[...new Set(properties.map(p => p.city))].length}
                  </div>
                  <div className="text-sm text-slate-600">Cidades</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <div className="text-3xl font-bold text-amber-600 mb-1">
                    {properties.filter(p => p.featured).length}
                  </div>
                  <div className="text-sm text-slate-600">Em Destaque</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recomendações SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 mb-1">Meta Tags Implementadas</p>
                  <p className="text-sm text-green-700">Todas as páginas de imóveis têm meta descrições e títulos otimizados</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 mb-1">Structured Data (Schema.org)</p>
                  <p className="text-sm text-green-700">Dados estruturados implementados para todos os imóveis</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 mb-1">Sitemap Dinâmico</p>
                  <p className="text-sm text-green-700">Sitemap XML atualizado automaticamente com novos imóveis</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-1">Sugestão: URLs SEO-Friendly</p>
                  <p className="text-sm text-blue-700">Considere implementar URLs amigáveis como /imoveis/apartamento-t3-lisboa-123</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-1">Sugestão: Blog de Conteúdo</p>
                  <p className="text-sm text-blue-700">Publique artigos regularmente usando as sugestões geradas pela IA</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}