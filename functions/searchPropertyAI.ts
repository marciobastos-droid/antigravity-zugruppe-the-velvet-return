import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL é obrigatório' }, { status: 400 });
    }

    // Fetch the webpage content
    let pageContent = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8'
        }
      });
      pageContent = await response.text();
    } catch (fetchError) {
      return Response.json({ 
        error: 'Não foi possível aceder ao website. Verifique o URL.',
        details: fetchError.message 
      }, { status: 400 });
    }

    // Extract text content and image URLs from HTML
    const textContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000); // Limit for API

    // Extract image URLs
    const imageMatches = pageContent.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    const images = [];
    for (const match of imageMatches) {
      let imgUrl = match[1];
      if (imgUrl && !imgUrl.includes('logo') && !imgUrl.includes('icon') && !imgUrl.includes('avatar')) {
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imgUrl = urlObj.origin + imgUrl;
        }
        if (imgUrl.startsWith('http')) {
          images.push(imgUrl);
        }
      }
    }

    // Also extract from data-src, data-lazy-src attributes (common in lazy loading)
    const lazySrcMatches = pageContent.matchAll(/data-(?:lazy-)?src=["']([^"']+)["']/gi);
    for (const match of lazySrcMatches) {
      let imgUrl = match[1];
      if (imgUrl && !imgUrl.includes('logo') && !imgUrl.includes('icon')) {
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        else if (imgUrl.startsWith('/')) {
          const urlObj = new URL(url);
          imgUrl = urlObj.origin + imgUrl;
        }
        if (imgUrl.startsWith('http') && !images.includes(imgUrl)) {
          images.push(imgUrl);
        }
      }
    }

    // Use Gemini to extract property data
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `És um especialista em extração de dados imobiliários de páginas web portuguesas. 
Analisa o seguinte conteúdo de uma página de um portal imobiliário e extrai TODOS os dados do imóvel.

URL ORIGINAL: ${url}

CONTEÚDO DA PÁGINA:
${textContent}

INSTRUÇÕES IMPORTANTES:
1. Extrai TODOS os dados disponíveis do imóvel
2. PREÇO: Formato português usa ponto como separador de milhares (495.000 € = 495000, 1.200.000€ = 1200000)
3. TIPOLOGIA: T0, T1, T2, T3, T4, T5+ correspondem a 0, 1, 2, 3, 4, 5+ quartos
4. property_type deve ser: "apartment", "house", "land", "building", "farm", "store", "warehouse" ou "office"
5. listing_type: "sale" para venda, "rent" para arrendamento (se preço mensal < 5000€ provavelmente é arrendamento)
6. Extrai a morada completa, cidade e distrito
7. Extrai área útil e bruta se disponíveis
8. Extrai ano de construção, certificado energético, comodidades
9. Se não encontrares informação, deixa o campo vazio ou 0

Responde APENAS com um objeto JSON válido (sem markdown, sem \`\`\`):
{
  "title": "string",
  "description": "string",
  "property_type": "apartment|house|land|building|farm|store|warehouse|office",
  "listing_type": "sale|rent",
  "price": number,
  "bedrooms": number,
  "bathrooms": number,
  "square_feet": number,
  "gross_area": number,
  "address": "string",
  "city": "string",
  "state": "string",
  "zip_code": "string",
  "year_built": number,
  "energy_certificate": "string",
  "amenities": ["string"],
  "external_id": "string"
}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return Response.json({ 
        error: 'Erro na API Gemini',
        details: errorText 
      }, { status: 500 });
    }

    const geminiData = await geminiResponse.json();
    
    // Extract the text response
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean up the response (remove markdown code blocks if present)
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let propertyData;
    try {
      propertyData = JSON.parse(responseText);
    } catch (parseError) {
      return Response.json({ 
        error: 'Não foi possível extrair dados do imóvel',
        rawResponse: responseText.substring(0, 500)
      }, { status: 400 });
    }

    // Add source URL and images
    propertyData.source_url = url;
    propertyData.images = images.slice(0, 20); // Limit to 20 images

    // Validate minimum required fields
    if (!propertyData.title || propertyData.title.length < 3) {
      propertyData.title = `Imóvel em ${propertyData.city || 'Portugal'}`;
    }

    return Response.json({
      success: true,
      property: propertyData,
      imageCount: images.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Erro ao processar pedido',
      stack: error.stack
    }, { status: 500 });
  }
});