import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Detect if URL is a listing page or a single property detail page
function detectPageType(url) {
  const listingPatterns = /\/comprar-|\/arrendar-|\/venda\/|\/aluguer\/|\/pesquisa|\/resultados|\/listagem|\/imoveis|lista|search|results|com-publicado|com-preco|com-tamanho|com-fotos|\/shared\?rgid=/i;
  const detailPatterns = /\/imovel\/\d|\/anuncio\/\d|\/propriedade\/\d|\/property\/\d|\/detalhe\/\d|\/ficha\/\d|\?id=\d|\/\d{7,}\/?$/;
  
  // Infocasa shared links are always listing pages
  if (url.includes('infocasa.pt/shared') || url.includes('url.infocasa.pt')) {
    return 'listing';
  }
  
  // Check for listing page patterns first (more specific)
  if (listingPatterns.test(url)) {
    return 'listing';
  }
  
  // Check for detail page patterns
  if (detailPatterns.test(url)) {
    return 'detail';
  }
  
  // Default to listing if contains typical listing URL structure
  if (url.includes('comprar') || url.includes('arrendar')) {
    return 'listing';
  }
  
  return 'detail';
}

// Follow redirects and get final URL
async function followRedirects(url, maxRedirects = 5) {
  let currentUrl = url;
  let redirectCount = 0;
  
  while (redirectCount < maxRedirects) {
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Handle relative URLs
          if (location.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            currentUrl = urlObj.origin + location;
          } else if (!location.startsWith('http')) {
            const urlObj = new URL(currentUrl);
            currentUrl = urlObj.origin + '/' + location;
          } else {
            currentUrl = location;
          }
          redirectCount++;
          continue;
        }
      }
      
      // No more redirects
      break;
    } catch (e) {
      break;
    }
  }
  
  return currentUrl;
}

// Extract all property links from Idealista listing page
function extractPropertyLinks(html, baseUrl) {
  const links = [];
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;
  
  // Idealista specific patterns
  const idealistaPattern = /href=["']([^"']*\/imovel\/\d+[^"']*)["']/gi;
  const matches = html.matchAll(idealistaPattern);
  
  for (const match of matches) {
    let link = match[1];
    if (link.startsWith('/')) {
      link = origin + link;
    } else if (!link.startsWith('http')) {
      link = origin + '/' + link;
    }
    if (!links.includes(link)) {
      links.push(link);
    }
  }
  
  // Generic property link patterns
  const genericPatterns = [
    /href=["']([^"']*\/anuncio\/[^"']+)["']/gi,
    /href=["']([^"']*\/propriedade\/[^"']+)["']/gi,
    /href=["']([^"']*\/property\/[^"']+)["']/gi,
  ];
  
  for (const pattern of genericPatterns) {
    const genericMatches = html.matchAll(pattern);
    for (const match of genericMatches) {
      let link = match[1];
      if (link.startsWith('/')) {
        link = origin + link;
      } else if (!link.startsWith('http')) {
        link = origin + '/' + link;
      }
      if (!links.includes(link)) {
        links.push(link);
      }
    }
  }
  
  return links;
}

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

    const pageType = detectPageType(url);
    
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

    // If it's a listing page, extract multiple properties
    if (pageType === 'listing') {
      // Extract property links from listing page
      const propertyLinks = extractPropertyLinks(pageContent, url);
      
      // Also try to extract property data directly from the listing page HTML
      const textContent = pageContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 30000); // Larger limit for listing pages

      // Use Gemini to extract ALL properties from the listing page
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `És um especialista em extração de dados imobiliários. Esta é uma PÁGINA DE LISTAGEM de um portal imobiliário português.
Extrai TODOS os imóveis listados nesta página.

URL: ${url}

CONTEÚDO DA PÁGINA:
${textContent}

INSTRUÇÕES CRÍTICAS:
1. Esta é uma página de LISTAGEM - extrai TODOS os imóveis que aparecem
2. Cada item da listagem tem: título, preço, quartos, área, localização
3. PREÇO PORTUGUÊS: "875.000 €" = 875000, "1.450.000€" = 1450000 (ponto é separador de milhares!)
4. TIPOLOGIA: "T4" = 4 quartos, "T5" = 5 quartos, "Moradia" = house
5. Se URL contém "comprar" = sale, se contém "arrendar" = rent
6. Extrai o ID do imóvel do link se visível (ex: 34231937)
7. property_type: "apartment" para apartamentos/pisos, "house" para moradias/vivendas
8. Extrai TODOS os imóveis visíveis, não apenas o primeiro

Responde APENAS com JSON válido (sem markdown):
{
  "is_listing_page": true,
  "total_found": number,
  "properties": [
    {
      "title": "string",
      "price": number,
      "bedrooms": number,
      "bathrooms": number,
      "square_feet": number,
      "city": "string",
      "state": "string",
      "address": "string",
      "property_type": "apartment|house",
      "listing_type": "sale|rent",
      "external_id": "string",
      "detail_url": "string"
    }
  ]
}`
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192
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
      let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      responseText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      let listingData;
      try {
        listingData = JSON.parse(responseText);
      } catch (parseError) {
        return Response.json({ 
          error: 'Não foi possível extrair dados da listagem',
          rawResponse: responseText.substring(0, 1000)
        }, { status: 400 });
      }

      // Process each property
      const properties = (listingData.properties || []).map((p, idx) => {
        const urlObj = new URL(url);
        let detailUrl = p.detail_url || '';
        if (detailUrl && !detailUrl.startsWith('http')) {
          detailUrl = urlObj.origin + (detailUrl.startsWith('/') ? '' : '/') + detailUrl;
        }
        
        return {
          ...p,
          source_url: detailUrl || url,
          images: [],
          property_type: p.property_type || 'apartment',
          listing_type: p.listing_type || (url.includes('arrendar') ? 'rent' : 'sale')
        };
      });

      return Response.json({
        success: true,
        is_listing_page: true,
        total_found: listingData.total_found || properties.length,
        properties: properties,
        property_links: propertyLinks.slice(0, 30)
      });
    }

    // Single property detail page (original logic)
    const textContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000);

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

    // Also extract from data-src, data-lazy-src attributes
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

    // Use Gemini to extract single property data
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
    
    let responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
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

    propertyData.source_url = url;
    propertyData.images = images.slice(0, 20);

    if (!propertyData.title || propertyData.title.length < 3) {
      propertyData.title = `Imóvel em ${propertyData.city || 'Portugal'}`;
    }

    return Response.json({
      success: true,
      is_listing_page: false,
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