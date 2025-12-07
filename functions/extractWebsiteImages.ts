import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, use_ai = false } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL é obrigatória' }, { status: 400 });
    }

    // Fetch webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return Response.json({ 
        error: `Erro ao aceder à página: ${response.status} ${response.statusText}` 
      }, { status: 400 });
    }

    const html = await response.text();
    const baseUrl = new URL(url);

    // Extract all image URLs from HTML
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const bgImageRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
    const images = [];
    const seenUrls = new Set();

    // Extract from img tags
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const imgUrl = match[1];
      try {
        const absoluteUrl = new URL(imgUrl, baseUrl.origin).href;
        if (!seenUrls.has(absoluteUrl) && 
            (absoluteUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || !absoluteUrl.includes('?'))) {
          seenUrls.add(absoluteUrl);
          
          // Extract alt text and dimensions if available
          const imgTag = match[0];
          const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
          const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
          const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
          
          images.push({
            url: absoluteUrl,
            alt: altMatch ? altMatch[1] : '',
            width: widthMatch ? parseInt(widthMatch[1]) : null,
            height: heightMatch ? parseInt(heightMatch[1]) : null,
            type: 'img_tag'
          });
        }
      } catch (e) {
        // Skip invalid URLs
      }
    }

    // Extract from background-image CSS
    while ((match = bgImageRegex.exec(html)) !== null) {
      const imgUrl = match[1];
      try {
        const absoluteUrl = new URL(imgUrl, baseUrl.origin).href;
        if (!seenUrls.has(absoluteUrl) && absoluteUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          seenUrls.add(absoluteUrl);
          images.push({
            url: absoluteUrl,
            alt: '',
            width: null,
            height: null,
            type: 'background'
          });
        }
      } catch (e) {
        // Skip invalid URLs
      }
    }

    // Extract from Open Graph and meta tags
    const ogImageRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
    const twitterImageRegex = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;

    while ((match = ogImageRegex.exec(html)) !== null) {
      const imgUrl = match[1];
      try {
        const absoluteUrl = new URL(imgUrl, baseUrl.origin).href;
        if (!seenUrls.has(absoluteUrl)) {
          seenUrls.add(absoluteUrl);
          images.push({
            url: absoluteUrl,
            alt: 'Open Graph Image',
            width: null,
            height: null,
            type: 'meta'
          });
        }
      } catch (e) {}
    }

    while ((match = twitterImageRegex.exec(html)) !== null) {
      const imgUrl = match[1];
      try {
        const absoluteUrl = new URL(imgUrl, baseUrl.origin).href;
        if (!seenUrls.has(absoluteUrl)) {
          seenUrls.add(absoluteUrl);
          images.push({
            url: absoluteUrl,
            alt: 'Twitter Card Image',
            width: null,
            height: null,
            type: 'meta'
          });
        }
      } catch (e) {}
    }

    // Filter out common tracking pixels and small images
    const filteredImages = images.filter(img => {
      const url = img.url.toLowerCase();
      // Skip tracking pixels and analytics
      if (url.includes('tracking') || url.includes('pixel') || 
          url.includes('analytics') || url.includes('beacon')) {
        return false;
      }
      // Skip very small images (likely icons or bullets)
      if (img.width && img.height && (img.width < 50 || img.height < 50)) {
        return false;
      }
      return true;
    });

    // If AI analysis requested, categorize images
    let categorizedImages = filteredImages;
    if (use_ai && filteredImages.length > 0) {
      try {
        const imageList = filteredImages.slice(0, 20).map((img, idx) => 
          `${idx + 1}. URL: ${img.url}\n   Alt: ${img.alt || 'N/A'}\n   Tipo: ${img.type}`
        ).join('\n\n');

        const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Analisa esta lista de imagens extraídas de um website e classifica cada uma como:
- "property" (imagem de imóvel/propriedade)
- "logo" (logotipo ou branding)
- "icon" (ícone pequeno)
- "banner" (banner publicitário)
- "content" (conteúdo geral)
- "irrelevant" (irrelevante ou não útil)

Lista de imagens:
${imageList}

Retorna um array com a classificação de cada imagem pelo número.`,
          response_json_schema: {
            type: "object",
            properties: {
              classifications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "number" },
                    category: { type: "string" },
                    relevance_score: { type: "number" }
                  }
                }
              }
            }
          }
        });

        if (aiResponse?.classifications) {
          categorizedImages = filteredImages.map((img, idx) => {
            const classification = aiResponse.classifications.find(c => c.index === idx + 1);
            return {
              ...img,
              category: classification?.category || 'content',
              relevance_score: classification?.relevance_score || 5
            };
          });

          // Sort by relevance
          categorizedImages.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        }
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
      }
    }

    return Response.json({
      success: true,
      url: url,
      total_images: categorizedImages.length,
      images: categorizedImages,
      analyzed_with_ai: use_ai
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ 
      error: error.message || 'Erro ao extrair imagens' 
    }, { status: 500 });
  }
});