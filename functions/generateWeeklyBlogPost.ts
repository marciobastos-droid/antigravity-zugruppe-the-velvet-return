import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Gera um artigo de blog semanal sobre o mercado imobiliário usando IA
 * Analisa tendências de preços, novos imóveis, e cria conteúdo relevante
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validar autenticação admin (função de scheduled task)
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[generateWeeklyBlogPost] Starting weekly blog generation');

    // Buscar dados dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentProperties = await base44.asServiceRole.entities.Property.filter({
      created_date: { $gte: thirtyDaysAgo.toISOString() }
    });

    const allProperties = await base44.asServiceRole.entities.Property.list();
    
    console.log('[generateWeeklyBlogPost] Found', recentProperties.length, 'new properties in last 30 days');

    // Análise de mercado
    const marketAnalysis = analyzeMarketTrends(allProperties, recentProperties);
    
    // Gerar conteúdo do blog com IA
    const prompt = `Você é um especialista em mercado imobiliário português. Crie um artigo de blog semanal interessante e informativo.

DADOS DO MERCADO:
- Total de imóveis ativos: ${allProperties.length}
- Novos imóveis (últimos 30 dias): ${recentProperties.length}
- Preço médio: €${marketAnalysis.avgPrice.toLocaleString()}
- Cidades mais ativas: ${marketAnalysis.topCities.join(', ')}
- Tipos de imóvel mais procurados: ${marketAnalysis.topTypes.join(', ')}
- Tendência de preços: ${marketAnalysis.priceTrend}

CRIE UM ARTIGO QUE:
1. Tenha um título cativante e otimizado para SEO
2. Analise as tendências do mercado atual
3. Dê dicas práticas para compradores ou vendedores
4. Mencione oportunidades ou insights interessantes
5. Seja escrito em português de Portugal
6. Tenha entre 500-800 palavras
7. Inclua uma meta description para SEO (max 160 caracteres)
8. Sugira 5-7 tags/palavras-chave relevantes

Formato: artigo profissional mas acessível, com tom confiável e informativo.`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true, // Buscar dados atuais do mercado
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          meta_description: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" }
          },
          category: {
            type: "string",
            enum: ["market_trends", "buyer_tips", "seller_tips", "investment", "local_market"]
          }
        }
      }
    });

    console.log('[generateWeeklyBlogPost] Blog post generated:', response.title);

    // Criar o blog post
    const blogPost = await base44.asServiceRole.entities.BlogPost.create({
      title: response.title,
      content: response.content,
      slug: generateSlug(response.title),
      meta_description: response.meta_description,
      tags: response.tags || [],
      category: response.category || 'market_trends',
      status: 'published',
      author: 'ZuConnect',
      author_email: 'info@zuconnect.pt',
      featured_image: selectFeaturedImage(recentProperties),
      published_date: new Date().toISOString(),
      is_ai_generated: true,
      market_data: marketAnalysis
    });

    console.log('[generateWeeklyBlogPost] Blog post created with ID:', blogPost.id);

    return Response.json({
      success: true,
      blog_post_id: blogPost.id,
      title: response.title,
      slug: blogPost.slug,
      market_analysis: marketAnalysis
    });

  } catch (error) {
    console.error('[generateWeeklyBlogPost] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Analisa tendências de mercado
 */
function analyzeMarketTrends(allProperties, recentProperties) {
  const active = allProperties.filter(p => p.status === 'active');
  
  // Preços
  const prices = active.map(p => p.price || 0).filter(p => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  
  const recentPrices = recentProperties.map(p => p.price || 0).filter(p => p > 0);
  const recentAvgPrice = recentPrices.length > 0 ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length : 0;
  
  const priceTrend = recentAvgPrice > avgPrice ? 'subida' : recentAvgPrice < avgPrice ? 'descida' : 'estável';
  
  // Cidades mais ativas
  const cityCounts = {};
  recentProperties.forEach(p => {
    if (p.city) cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
  });
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city]) => city);
  
  // Tipos mais comuns
  const typeCounts = {};
  recentProperties.forEach(p => {
    if (p.property_type) typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
  });
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);
  
  return {
    avgPrice: Math.round(avgPrice),
    recentAvgPrice: Math.round(recentAvgPrice),
    priceTrend,
    topCities,
    topTypes,
    totalActive: active.length,
    newListings: recentProperties.length,
    priceChange: recentAvgPrice && avgPrice ? ((recentAvgPrice - avgPrice) / avgPrice * 100).toFixed(1) : 0
  };
}

/**
 * Gera slug a partir do título
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Seleciona imagem destacada para o blog
 */
function selectFeaturedImage(properties) {
  // Pegar imagem de um imóvel destacado recente
  const featured = properties.find(p => p.featured && p.images?.length > 0);
  if (featured) return featured.images[0];
  
  // Ou primeira imagem disponível
  const withImage = properties.find(p => p.images?.length > 0);
  return withImage?.images[0] || null;
}