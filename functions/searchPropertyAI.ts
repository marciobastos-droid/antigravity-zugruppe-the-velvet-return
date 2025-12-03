import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Supported portals configuration
const SUPPORTED_PORTALS = {
  idealista: { domain: 'idealista.pt', name: 'Idealista' },
  imovirtual: { domain: 'imovirtual.com', name: 'Imovirtual' },
  infocasa: { domain: 'infocasa.pt', name: 'Infocasa' },
  supercasa: { domain: 'supercasa.pt', name: 'Supercasa' },
  casasapo: { domain: 'casa.sapo.pt', name: 'Casa SAPO' },
  custojusto: { domain: 'custojusto.pt', name: 'CustoJusto' },
  olx: { domain: 'olx.pt', name: 'OLX' },
  kyero: { domain: 'kyero.com', name: 'Kyero' },
  green_acres: { domain: 'green-acres.', name: 'Green Acres' },
  quatru: { domain: 'quatru.pt', name: 'Quatru' },
  remax: { domain: 'remax.pt', name: 'RE/MAX' },
  era: { domain: 'era.pt', name: 'ERA' },
  century21: { domain: 'century21.pt', name: 'Century 21' },
  kw: { domain: 'kwportugal.pt', name: 'Keller Williams' },
  luximos: { domain: 'luximos.pt', name: 'Luximos' },
  jll: { domain: 'jll.pt', name: 'JLL' }
};

function detectPortal(url) {
  const urlLower = url.toLowerCase();
  for (const [key, portal] of Object.entries(SUPPORTED_PORTALS)) {
    if (urlLower.includes(portal.domain)) {
      return { key, ...portal };
    }
  }
  return { key: 'unknown', domain: new URL(url).hostname, name: 'Portal Desconhecido' };
}

function detectPageType(url) {
  const urlLower = url.toLowerCase();
  
  // Listing page patterns
  if (urlLower.includes('/novos-empreendimentos') || 
      urlLower.includes('/comprar') || 
      urlLower.includes('/arrendar') ||
      urlLower.includes('/pesquisa') ||
      urlLower.includes('/listagem') ||
      urlLower.includes('/imoveis') ||
      urlLower.includes('search') ||
      urlLower.includes('results')) {
    return 'listing';
  }
  
  // Detail page patterns
  if (/\/imovel\/\d|\/anuncio\/\d|\/property\/\d|\/\d{7,}\/?$/.test(urlLower)) {
    return 'detail';
  }
  
  return 'listing'; // Default to listing
}

function extractImages(html, baseUrl) {
  const images = [];
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;
  
  const imgPatterns = [
    /<img[^>]+src=["']([^"']+)["'][^>]*>/gi,
    /data-src=["']([^"']+)["']/gi,
    /data-lazy-src=["']([^"']+)["']/gi,
    /data-original=["']([^"']+)["']/gi,
    /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi,
    /data-flickity-lazyload=["']([^"']+)["']/gi
  ];
  
  for (const pattern of imgPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      let imgUrl = match[1];
      
      if (!imgUrl || 
          imgUrl.includes('logo') || 
          imgUrl.includes('icon') || 
          imgUrl.includes('avatar') ||
          imgUrl.includes('placeholder') ||
          imgUrl.length < 20) {
        continue;
      }
      
      if (imgUrl.startsWith('//')) {
        imgUrl = 'https:' + imgUrl;
      } else if (imgUrl.startsWith('/')) {
        imgUrl = origin + imgUrl;
      } else if (!imgUrl.startsWith('http')) {
        imgUrl = origin + '/' + imgUrl;
      }
      
      if (imgUrl.startsWith('http') && !images.includes(imgUrl)) {
        if (/\.(jpg|jpeg|png|webp)/i.test(imgUrl) || 
            imgUrl.includes('cdn') ||
            imgUrl.includes('media') ||
            imgUrl.includes('images') ||
            imgUrl.includes('fotos')) {
          images.push(imgUrl);
        }
      }
    }
  }
  
  return [...new Set(images)].slice(0, 30);
}

// Safe JSON parse with multiple fallback strategies
function safeParseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Clean the text
  let cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue to fallbacks
  }
  
  // Try to extract JSON object from text
  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    let jsonStr = jsonObjectMatch[0];
    
    // Try direct parse of extracted JSON
    try {
      return JSON.parse(jsonStr);
    } catch (e2) {
      // Try fixing common issues
    }
    
    // Fix common JSON issues
    jsonStr = jsonStr
      // Remove trailing commas before } or ]
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix unquoted keys
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
      // Fix single quotes to double quotes (but not inside strings)
      .replace(/'/g, '"')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      // Fix escaped newlines in strings
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    
    try {
      return JSON.parse(jsonStr);
    } catch (e3) {
      // Try more aggressive cleaning
    }
    
    // More aggressive: try to rebuild properties array
    const propertiesMatch = cleaned.match(/"properties"\s*:\s*\[([\s\S]*)\]/);
    if (propertiesMatch) {
      try {
        // Try to parse individual property objects
        const propsContent = propertiesMatch[1];
        const propertyMatches = propsContent.match(/\{[^{}]*\}/g);
        if (propertyMatches) {
          const properties = [];
          for (const propStr of propertyMatches) {
            try {
              const fixedProp = propStr
                .replace(/,(\s*})/g, '$1')
                .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
                .replace(/'/g, '"');
              const prop = JSON.parse(fixedProp);
              if (prop && typeof prop === 'object') {
                properties.push(prop);
              }
            } catch (propError) {
              // Skip malformed property
            }
          }
          if (properties.length > 0) {
            return { properties };
          }
        }
      } catch (e4) {
        // Continue
      }
    }
  }
  
  // Last resort: try to find any valid JSON object
  try {
    const simpleMatch = cleaned.match(/\{[^{}]+\}/);
    if (simpleMatch) {
      return JSON.parse(simpleMatch[0]);
    }
  } catch (e5) {
    // Give up
  }
  
  return null;
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
      return Response.json({ success: false, error: 'URL é obrigatório' });
    }

    const portal = detectPortal(url);
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
        success: false,
        error: 'Não foi possível aceder ao website. Verifique o URL.',
        details: fetchError.message 
      });
    }

    // Extract text content
    const textContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 25000);

    // Extract images
    const images = extractImages(pageContent, url);

    // Build a simpler, more robust prompt
    const prompt = pageType === 'listing' 
      ? `Extrai TODOS os imóveis desta página de listagem do portal ${portal.name}.

URL: ${url}

TEXTO DA PÁGINA:
${textContent}

Para cada imóvel encontrado, extrai:
- title: título do anúncio
- price: preço como número (495.000€ = 495000)
- bedrooms: número de quartos (T3 = 3)
- bathrooms: número de WCs
- square_feet: área em m²
- city: cidade
- state: distrito
- address: morada
- property_type: apartment, house, land, building, farm, store, warehouse, office
- listing_type: sale ou rent
- external_id: referência do anúncio
- description: descrição curta

Responde apenas com JSON válido no formato:
{"properties": [{"title": "...", "price": 0, ...}]}`
      : `Extrai os dados deste imóvel do portal ${portal.name}.

URL: ${url}

TEXTO DA PÁGINA:
${textContent}

Extrai:
- title, description, property_type, listing_type, price, bedrooms, bathrooms, square_feet, address, city, state, year_built, energy_certificate, amenities, external_id

Responde apenas com JSON válido no formato:
{"title": "...", "price": 0, ...}`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
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
        success: false,
        error: 'Erro na API Gemini. Tente novamente.',
        details: errorText.substring(0, 200)
      });
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      return Response.json({ 
        success: false,
        error: 'A API não retornou dados. Tente novamente.'
      });
    }
    
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse response with fallback strategies
    const parsedData = safeParseJSON(responseText);
    
    if (!parsedData) {
      return Response.json({ 
        success: false,
        error: 'Não foi possível processar a resposta da IA. Tente novamente.',
        rawResponse: responseText.substring(0, 500)
      });
    }

    // Handle listing page
    if (pageType === 'listing' && parsedData.properties) {
      const properties = parsedData.properties.map(p => ({
        ...p,
        source_url: url,
        images: [],
        property_type: p.property_type || 'apartment',
        listing_type: p.listing_type || 'sale'
      }));

      return Response.json({
        success: true,
        is_listing_page: true,
        total_found: properties.length,
        properties: properties,
        portal: portal.name
      });
    }

    // Handle single property
    const property = parsedData.properties?.[0] || parsedData;
    property.source_url = url;
    property.images = images;
    property.portal = portal.name;

    if (!property.title || property.title.length < 3) {
      const typeLabel = property.property_type === 'house' ? 'Moradia' : 
                       property.property_type === 'apartment' ? 'Apartamento' : 'Imóvel';
      property.title = `${typeLabel}${property.bedrooms ? ` T${property.bedrooms}` : ''} em ${property.city || 'Portugal'}`;
    }

    return Response.json({
      success: true,
      is_listing_page: false,
      property: property,
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