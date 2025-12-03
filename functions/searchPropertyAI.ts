import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Supported portals configuration
const SUPPORTED_PORTALS = {
  // Portais Genéricos
  idealista: { domain: 'idealista.pt', name: 'Idealista', type: 'generic' },
  imovirtual: { domain: 'imovirtual.com', name: 'Imovirtual', type: 'generic' },
  infocasa: { domain: 'infocasa.pt', name: 'Infocasa', type: 'generic' },
  supercasa: { domain: 'supercasa.pt', name: 'Supercasa', type: 'generic' },
  casasapo: { domain: 'casa.sapo.pt', name: 'Casa SAPO', type: 'generic' },
  custojusto: { domain: 'custojusto.pt', name: 'CustoJusto', type: 'generic' },
  olx: { domain: 'olx.pt', name: 'OLX', type: 'generic' },
  
  // Portais Internacionais
  kyero: { domain: 'kyero.com', name: 'Kyero', type: 'international' },
  green_acres: { domain: 'green-acres.', name: 'Green Acres', type: 'international' },
  quatru: { domain: 'quatru.pt', name: 'Quatru', type: 'international' },
  imovelweb: { domain: 'imovelweb.com', name: 'ImovelWeb', type: 'international' },
  
  // Redes Imobiliárias
  remax: { domain: 'remax.pt', name: 'RE/MAX', type: 'network' },
  era: { domain: 'era.pt', name: 'ERA', type: 'network' },
  century21: { domain: 'century21.pt', name: 'Century 21', type: 'network' },
  kw: { domain: 'kwportugal.pt', name: 'Keller Williams', type: 'network' },
  coldwell: { domain: 'coldwellbanker.pt', name: 'Coldwell Banker', type: 'network' },
  luximos: { domain: 'luximos.pt', name: 'Luximos', type: 'network' },
  jll: { domain: 'jll.pt', name: 'JLL', type: 'network' },
  
  // Outros
  bpiexpressoimobiliario: { domain: 'bpiexpressoimobiliario.pt', name: 'BPI Imobiliário', type: 'bank' }
};

// Detect portal from URL
function detectPortal(url) {
  const urlLower = url.toLowerCase();
  for (const [key, portal] of Object.entries(SUPPORTED_PORTALS)) {
    if (urlLower.includes(portal.domain)) {
      return { key, ...portal };
    }
  }
  return { key: 'unknown', domain: new URL(url).hostname, name: 'Portal Desconhecido' };
}

// Detect if URL is a listing page or a single property detail page
function detectPageType(url) {
  const urlLower = url.toLowerCase();
  
  // Portal-specific detection
  
  // Infocasa shared links are always listing pages
  if (url.includes('infocasa.pt/shared') || url.includes('url.infocasa.pt')) {
    return 'listing';
  }
  
  // Kyero specific patterns
  if (urlLower.includes('kyero.com')) {
    if (/\/property\/\d|\/\d{6,}/.test(url)) return 'detail';
    return 'listing';
  }
  
  // RE/MAX specific patterns
  if (urlLower.includes('remax.pt')) {
    if (/\/imoveis\/[a-z0-9-]+\/\d+|\/property\/\d/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // ERA specific patterns
  if (urlLower.includes('era.pt')) {
    if (/\/imovel\/\d|\/property\/\d|\/pt\/imoveis\/[^\/]+$/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // Century 21 specific patterns
  if (urlLower.includes('century21.pt')) {
    if (/\/imovel\/|\/property\/|\/comprar\/[^\/]+\/[^\/]+\/\d+/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // Luximos specific patterns
  if (urlLower.includes('luximos.pt')) {
    if (/\/imovel\/|\/property\/|\/pt\/[^\/]+\/[^\/]+\/\d+/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // JLL specific patterns
  if (urlLower.includes('jll.pt')) {
    if (/\/imovel\/|\/property\/|\/propriedade\/|\/[^\/]+\/\d{5,}/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // Supercasa specific patterns
  if (urlLower.includes('supercasa.pt')) {
    if (/\/imovel\/\d|\/d\/\d/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // Casa SAPO specific patterns
  if (urlLower.includes('casa.sapo.pt')) {
    if (/\/imovel\/\d|\/detalhe\/\d/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // Green Acres specific patterns
  if (urlLower.includes('green-acres.')) {
    if (/\/property\/|\/propriete\/|\/immobilie\/|\/\d{5,}\.htm/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // Quatru specific patterns
  if (urlLower.includes('quatru.pt')) {
    if (/\/imovel\/|\/property\/|\/anuncio\/\d/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // ImovelWeb specific patterns
  if (urlLower.includes('imovelweb.com')) {
    if (/\/propriedades\/.*\d{8,}/.test(urlLower)) return 'detail';
    return 'listing';
  }
  
  // Generic patterns
  const listingPatterns = /\/comprar-|\/arrendar-|\/venda\/|\/aluguer\/|\/pesquisa|\/resultados|\/listagem|\/imoveis|lista|search|results|com-publicado|com-preco|com-tamanho|com-fotos|\/for-sale|\/to-rent|\/a-venda|\/para-alugar|\/properties|\/listings/i;
  const detailPatterns = /\/imovel\/\d|\/anuncio\/\d|\/propriedade\/\d|\/property\/\d|\/detalhe\/\d|\/ficha\/\d|\?id=\d|\/\d{7,}\/?$|\/detail\/|\/listing\/\d/;
  
  if (listingPatterns.test(url)) {
    return 'listing';
  }
  
  if (detailPatterns.test(url)) {
    return 'detail';
  }
  
  if (url.includes('comprar') || url.includes('arrendar') || url.includes('for-sale') || url.includes('to-rent')) {
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

// Extract all property links from listing page
function extractPropertyLinks(html, baseUrl) {
  const links = [];
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;
  const urlLower = baseUrl.toLowerCase();
  
  // Portal-specific link extraction patterns
  const portalPatterns = {
    idealista: [/href=["']([^"']*\/imovel\/\d+[^"']*)["']/gi],
    infocasa: [/href=["']([^"']*infocasa\.pt\/shared\?rgid=[^"']+)["']/gi],
    remax: [
      /href=["']([^"']*\/imoveis\/[a-z0-9-]+\/\d+[^"']*)["']/gi,
      /href=["']([^"']*remax\.pt\/[^"']*imovel[^"']*)["']/gi
    ],
    era: [
      /href=["']([^"']*era\.pt\/[^"']*imovel[^"']*)["']/gi,
      /href=["']([^"']*\/pt\/imoveis\/[^"']+)["']/gi
    ],
    century21: [
      /href=["']([^"']*century21\.pt\/[^"']*imovel[^"']*)["']/gi,
      /href=["']([^"']*\/comprar\/[^"']+\/\d+[^"']*)["']/gi
    ],
    supercasa: [
      /href=["']([^"']*\/imovel\/\d+[^"']*)["']/gi,
      /href=["']([^"']*\/d\/\d+[^"']*)["']/gi
    ],
    casasapo: [
      /href=["']([^"']*casa\.sapo\.pt\/[^"']*imovel[^"']*)["']/gi,
      /href=["']([^"']*\/detalhe\/\d+[^"']*)["']/gi
    ],
    kyero: [
      /href=["']([^"']*\/property\/\d+[^"']*)["']/gi,
      /href=["']([^"']*kyero\.com\/[^"']*\/\d{6,}[^"']*)["']/gi
    ],
    green_acres: [
      /href=["']([^"']*\/property\/[^"']+)["']/gi,
      /href=["']([^"']*\/\d{5,}\.htm[^"']*)["']/gi
    ],
    quatru: [
      /href=["']([^"']*quatru\.pt\/[^"']*imovel[^"']*)["']/gi,
      /href=["']([^"']*\/anuncio\/\d+[^"']*)["']/gi
    ],
    luximos: [
      /href=["']([^"']*luximos\.pt\/[^"']*imovel[^"']*)["']/gi,
      /href=["']([^"']*\/property\/[^"']+)["']/gi
    ],
    jll: [
      /href=["']([^"']*jll\.pt\/[^"']*propriedade[^"']*)["']/gi,
      /href=["']([^"']*\/property\/[^"']+)["']/gi
    ]
  };
  
  // Detect which portal and use specific patterns
  let patterns = [];
  for (const [portal, portalDomain] of Object.entries(SUPPORTED_PORTALS)) {
    if (urlLower.includes(portalDomain.domain)) {
      patterns = portalPatterns[portal] || [];
      break;
    }
  }
  
  // Add generic patterns
  patterns.push(
    /href=["']([^"']*\/anuncio\/[^"']+)["']/gi,
    /href=["']([^"']*\/propriedade\/[^"']+)["']/gi,
    /href=["']([^"']*\/property\/[^"']+)["']/gi,
    /href=["']([^"']*\/imovel\/[^"']+)["']/gi
  );
  
  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let link = match[1];
      if (link.startsWith('//')) {
        link = 'https:' + link;
      } else if (link.startsWith('/')) {
        link = origin + link;
      } else if (!link.startsWith('http')) {
        link = origin + '/' + link;
      }
      // Avoid duplicates and navigation links
      if (!links.includes(link) && !link.includes('#') && !link.includes('javascript:')) {
        links.push(link);
      }
    }
  }
  
  return [...new Set(links)]; // Remove any remaining duplicates
}

// Extract images from HTML with portal-specific patterns
function extractImages(html, baseUrl) {
  const images = [];
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;
  
  // Standard img src
  const imgPatterns = [
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
    /data-src=["']([^"']+)["']/gi,
    /data-lazy-src=["']([^"']+)["']/gi,
    /data-original=["']([^"']+)["']/gi,
    /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi
  ];
  
  // Portal-specific image patterns
  const portalImagePatterns = [
    // Kyero uses data-flickity-lazyload
    /data-flickity-lazyload=["']([^"']+)["']/gi,
    // RE/MAX uses data-bg
    /data-bg=["']([^"']+)["']/gi,
    // Century21 uses data-image
    /data-image=["']([^"']+)["']/gi,
    // Green Acres uses data-zoom-image
    /data-zoom-image=["']([^"']+)["']/gi
  ];
  
  const allPatterns = [...imgPatterns, ...portalImagePatterns];
  
  for (const pattern of allPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let imgUrl = match[1];
      
      // Skip icons, logos, placeholders
      if (!imgUrl || 
          imgUrl.includes('logo') || 
          imgUrl.includes('icon') || 
          imgUrl.includes('avatar') ||
          imgUrl.includes('placeholder') ||
          imgUrl.includes('loading') ||
          imgUrl.includes('spinner') ||
          imgUrl.length < 20) {
        continue;
      }
      
      // Normalize URL
      if (imgUrl.startsWith('//')) {
        imgUrl = 'https:' + imgUrl;
      } else if (imgUrl.startsWith('/')) {
        imgUrl = origin + imgUrl;
      } else if (!imgUrl.startsWith('http')) {
        imgUrl = origin + '/' + imgUrl;
      }
      
      // Filter to likely property images
      if (imgUrl.startsWith('http') && !images.includes(imgUrl)) {
        // Check for image extensions or known CDN patterns
        if (/\.(jpg|jpeg|png|webp)/i.test(imgUrl) || 
            imgUrl.includes('cloudinary') ||
            imgUrl.includes('imgix') ||
            imgUrl.includes('amazonaws') ||
            imgUrl.includes('cdn') ||
            imgUrl.includes('media') ||
            imgUrl.includes('images') ||
            imgUrl.includes('photos') ||
            imgUrl.includes('fotos')) {
          images.push(imgUrl);
        }
      }
    }
  }
  
  return [...new Set(images)].slice(0, 30); // Dedupe and limit
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { url } = await req.json();

    if (!url) {
      return Response.json({ success: false, error: 'URL é obrigatório' });
    }

    // Handle short URLs (url.infocasa.pt) - follow redirects to get real URL
    if (url.includes('url.infocasa.pt')) {
      try {
        const finalUrl = await followRedirects(url);
        console.log(`Redirect: ${url} -> ${finalUrl}`);
        url = finalUrl;
      } catch (e) {
        console.log('Could not follow redirect:', e.message);
      }
    }

    const pageType = detectPageType(url);
    console.log(`Page type detected: ${pageType} for URL: ${url}`);
    
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
        success: false,
        error: 'Não foi possível aceder ao website. Verifique o URL.',
        details: fetchError.message 
      });
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

      // Detect portal for better extraction hints
      const portal = detectPortal(url);
      
      // Use Gemini to extract ALL properties from the listing page
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `És um especialista em extração de dados imobiliários. Esta é uma PÁGINA DE LISTAGEM do portal "${portal.name}" (${portal.domain}).
Extrai TODOS os imóveis listados nesta página.

URL: ${url}

CONTEÚDO DA PÁGINA:
${textContent}

INSTRUÇÕES CRÍTICAS PARA ${portal.name.toUpperCase()}:
1. Esta é uma página de LISTAGEM - extrai TODOS os imóveis que aparecem
2. Cada item da listagem tem: título, preço, quartos, área, localização

PREÇOS PORTUGUESES (MUITO IMPORTANTE):
- "875.000 €" = 875000 (ponto é separador de MILHARES, não decimais!)
- "1.450.000€" = 1450000
- "800 000 €" = 800000 (espaço também é separador de milhares)
- "€875,000" = 875000 (formato internacional)
- Preço mensal < 5000€ = arrendamento

TIPOLOGIA PORTUGUESA:
- "T0" = 0 quartos (estúdio)
- "T1", "T2", "T3", "T4", "T5" = 1, 2, 3, 4, 5 quartos
- "V3", "V4", "V5" = moradia com 3, 4, 5 quartos
- "Moradia" = house
- "Apartamento", "Piso", "Andar" = apartment

INSTRUÇÕES POR PORTAL:
- KYERO: preços em formato "€875,000", tipologias "3 bed", "4 bed"
- RE/MAX: procura "Ref:" para external_id
- ERA: formato "T3 Apartamento em Lisboa"
- CENTURY21: formato estruturado com referências
- SUPERCASA/CASA SAPO: padrão português típico
- GREEN ACRES: preços internacionais, múltiplos países
- QUATRU: formato português moderno

REGRAS:
- property_type: "apartment" para apartamentos/pisos/duplex/penthouse/studio
- property_type: "house" para moradias/vivendas/quintas
- listing_type: "sale" se preço > 10.000€, "rent" se < 5.000€/mês
- Extrai external_id do link ou referência visível
- Extrai TODOS os imóveis, não apenas o primeiro

Responde APENAS com JSON válido (sem markdown, sem \`\`\`):
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
      "property_type": "apartment|house|land|building|farm|store|warehouse|office",
      "listing_type": "sale|rent",
      "external_id": "string",
      "detail_url": "string",
      "energy_certificate": "string"
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
        let errorDetails = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorDetails = errorJson.error.message;
          }
        } catch {}
        
        // Check for specific error types
        if (errorDetails.includes('quota') || errorDetails.includes('RATE_LIMIT')) {
          return Response.json({ 
            success: false,
            error: 'Limite de pedidos da API Gemini atingido. Aguarde alguns minutos e tente novamente.',
            details: 'Rate limit exceeded'
          });
        }
        if (errorDetails.includes('API key') || errorDetails.includes('API_KEY')) {
          return Response.json({ 
            success: false,
            error: 'Chave da API Gemini inválida ou não configurada.',
            details: 'Invalid API key'
          });
        }
        
        return Response.json({ 
          success: false,
          error: 'Erro na API Gemini. Tente a opção "IA Padrão" como alternativa.',
          details: errorDetails.substring(0, 200)
        });
      }

      const geminiData = await geminiResponse.json();
      
      // Check for blocked or empty responses
      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        const blockReason = geminiData.promptFeedback?.blockReason;
        if (blockReason) {
          return Response.json({ 
            success: false,
            error: `Conteúdo bloqueado pela API: ${blockReason}. Tente a opção "IA Padrão".`,
            details: blockReason
          });
        }
        return Response.json({ 
          success: false,
          error: 'A API não retornou dados. Tente a opção "IA Padrão" como alternativa.',
          details: 'Empty response'
        });
      }
      
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
          success: false,
          error: 'Não foi possível extrair dados da listagem. O portal pode estar a bloquear o acesso.',
          rawResponse: responseText.substring(0, 500)
        });
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

    // Single property detail page
    const portal = detectPortal(url);
    
    const textContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 20000); // Increased for detail pages

    // Extract images using the enhanced function
    const images = extractImages(pageContent, url);

    // Use Gemini to extract single property data with portal-specific hints
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `És um especialista em extração de dados imobiliários. Esta é uma página de detalhe de imóvel do portal "${portal.name}" (${portal.domain}).

URL ORIGINAL: ${url}

CONTEÚDO DA PÁGINA:
${textContent}

INSTRUÇÕES CRÍTICAS PARA ${portal.name.toUpperCase()}:

PREÇOS (MUITO IMPORTANTE):
- Formato português: "495.000 €" = 495000 (ponto separa MILHARES!)
- "1.200.000€" = 1200000
- "€495,000" = 495000 (formato internacional, vírgula separa milhares)
- Preço mensal < 5000€ indica arrendamento

TIPOLOGIA PORTUGUESA:
- "T0" = estúdio (0 quartos)
- "T1" a "T5+" = 1 a 5+ quartos (apartamento)
- "V1" a "V5+" = 1 a 5+ quartos (moradia)
- "Moradia Geminada/Isolada/Em Banda" = house

ÁREAS:
- "Área útil" ou "Área habitável" = square_feet
- "Área bruta" ou "Área total" = gross_area
- Valores em m² (metros quadrados)

CARACTERÍSTICAS A EXTRAIR:
- Certificado energético (A+, A, B, B-, C, D, E, F, ou "Isento")
- Ano de construção
- Garagem, estacionamento
- Piscina, jardim, terraço, varanda
- Ar condicionado, aquecimento central
- Elevador (para apartamentos)
- Referência do imóvel (external_id)

TIPOS DE IMÓVEL:
- "apartment": apartamento, piso, andar, duplex, penthouse, estúdio, loft
- "house": moradia, vivenda, casa, quinta habitacional
- "land": terreno, lote
- "building": prédio
- "farm": quinta, herdade, propriedade rural
- "store": loja, espaço comercial
- "warehouse": armazém, pavilhão
- "office": escritório, gabinete

Responde APENAS com JSON válido (sem markdown, sem \`\`\`):
{
  "title": "string",
  "description": "string (descrição completa do imóvel)",
  "property_type": "apartment|house|land|building|farm|store|warehouse|office",
  "listing_type": "sale|rent",
  "price": number,
  "bedrooms": number,
  "bathrooms": number,
  "square_feet": number,
  "gross_area": number,
  "address": "string",
  "city": "string",
  "state": "string (distrito)",
  "zip_code": "string",
  "year_built": number,
  "energy_certificate": "string",
  "amenities": ["string"],
  "external_id": "string (referência do anúncio)",
  "floor": number,
  "parking_spaces": number,
  "condition": "string (novo, renovado, usado, para recuperar)"
}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorDetails = errorJson.error.message;
        }
      } catch {}
      
      // Check for specific error types
      if (errorDetails.includes('quota') || errorDetails.includes('RATE_LIMIT')) {
        return Response.json({ 
          success: false,
          error: 'Limite de pedidos da API Gemini atingido. Aguarde alguns minutos e tente novamente.',
          details: 'Rate limit exceeded'
        });
      }
      if (errorDetails.includes('API key') || errorDetails.includes('API_KEY')) {
        return Response.json({ 
          success: false,
          error: 'Chave da API Gemini inválida ou não configurada.',
          details: 'Invalid API key'
        });
      }
      
      return Response.json({ 
        success: false,
        error: 'Erro na API Gemini. Tente a opção "IA Padrão" como alternativa.',
        details: errorDetails.substring(0, 200)
      });
    }

    const geminiData = await geminiResponse.json();
    
    // Check for blocked or empty responses
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      const blockReason = geminiData.promptFeedback?.blockReason;
      if (blockReason) {
        return Response.json({ 
          success: false,
          error: `Conteúdo bloqueado pela API: ${blockReason}. Tente a opção "IA Padrão".`,
          details: blockReason
        });
      }
      return Response.json({ 
        success: false,
        error: 'A API não retornou dados. Tente a opção "IA Padrão" como alternativa.',
        details: 'Empty response'
      });
    }
    
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
        success: false,
        error: 'Não foi possível extrair dados do imóvel. O portal pode estar a bloquear o acesso.',
        rawResponse: responseText.substring(0, 500)
      });
    }

    propertyData.source_url = url;
    propertyData.images = images;
    propertyData.portal = portal.name;

    if (!propertyData.title || propertyData.title.length < 3) {
      const typeLabel = propertyData.property_type === 'house' ? 'Moradia' : 
                       propertyData.property_type === 'apartment' ? 'Apartamento' : 'Imóvel';
      propertyData.title = `${typeLabel}${propertyData.bedrooms ? ` T${propertyData.bedrooms}` : ''} em ${propertyData.city || 'Portugal'}`;
    }

    return Response.json({
      success: true,
      is_listing_page: false,
      property: propertyData,
      imageCount: images.length,
      portal: portal.name
    });

  } catch (error) {
    console.error('searchPropertyAI error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao processar pedido'
    });
  }
});