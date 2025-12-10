import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (!OPENAI_API_KEY) {
  console.error('[searchPropertyAI] OPENAI_API_KEY não configurada');
}

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
  jll: { domain: 'jll.pt', name: 'JLL' },
  sothebys: { domain: 'sothebysrealty.pt', name: "Sotheby's" },
  bontefilipidis: { domain: 'bontefilipidis.pt', name: 'Bonte Filipidis' }
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
  
  // Development/empreendimento page patterns - these have tables with multiple units
  if (urlLower.includes('/novos-empreendimentos/') && 
      !urlLower.includes('/imovel/')) {
    return 'development';
  }
  
  // Listing page patterns (search results)
  if (urlLower.includes('/comprar') || 
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
  
  // Clean the text - remove markdown code blocks and extra whitespace
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
    .trim();
  
  // Strategy 1: Direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('[safeParseJSON] Direct parse failed:', e.message);
  }
  
  // Strategy 2: Find and parse JSON object with comprehensive fixes
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    let jsonStr = jsonMatch[0];
    
    // Fix common JSON issues
    const fixJSON = (str) => {
      return str
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing commas between properties
        .replace(/}(\s*){/g, '},$1{')
        .replace(/"(\s*)"([a-zA-Z_])/g, '",$1"$2')
        // Fix unquoted keys
        .replace(/([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, '$1"$2"$3')
        // Fix single quotes to double quotes
        .replace(/:\s*'([^']*)'/g, ':"$1"')
        // Fix truncated strings (remove incomplete strings at end)
        .replace(/,\s*"[^"]*$/g, '')
        // Remove any remaining invalid characters
        .replace(/[\x00-\x1F\x7F]/g, ' ');
    };
    
    try {
      return JSON.parse(fixJSON(jsonStr));
    } catch (e) {
      console.log('[safeParseJSON] Fixed JSON parse failed:', e.message);
    }
    
    // Strategy 3: Try to truncate at last valid closing brace
    try {
      // Find balanced braces
      let depth = 0;
      let lastValidEnd = -1;
      let inString = false;
      let escaped = false;
      
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"' && !escaped) { inString = !inString; continue; }
        if (inString) continue;
        
        if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) lastValidEnd = i;
        }
      }
      
      if (lastValidEnd > 0) {
        const truncated = jsonStr.substring(0, lastValidEnd + 1);
        return JSON.parse(fixJSON(truncated));
      }
    } catch (e) {
      console.log('[safeParseJSON] Truncated parse failed:', e.message);
    }
  }
  
  // Strategy 4: Extract properties array manually - object by object
  try {
    const properties = [];
    const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let match;
    
    while ((match = objRegex.exec(cleaned)) !== null) {
      try {
        let objStr = match[0]
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, '$1"$2"$3');
        
        const obj = JSON.parse(objStr);
        if (obj.title || obj.price || obj.city) {
          properties.push(obj);
        }
      } catch (e) {
        // Skip invalid objects
      }
    }
    
    if (properties.length > 0) {
      console.log(`[safeParseJSON] Extracted ${properties.length} properties manually`);
      return { properties };
    }
  } catch (e) {}
  
  // Strategy 5: Last resort - try to extract key-value pairs
  try {
    const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
    const priceMatch = cleaned.match(/"price"\s*:\s*(\d+)/);
    const cityMatch = cleaned.match(/"city"\s*:\s*"([^"]+)"/);
    
    if (titleMatch || priceMatch) {
      const property = {};
      if (titleMatch) property.title = titleMatch[1];
      if (priceMatch) property.price = parseInt(priceMatch[1]);
      if (cityMatch) property.city = cityMatch[1];
      
      console.log('[safeParseJSON] Extracted single property from key-values');
      return { properties: [property] };
    }
  } catch (e) {}
  
  console.log('[safeParseJSON] All strategies failed');
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

    // Extract text content - aumentar limite para capturar mais imóveis
    const textContent = pageContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000); // Aumentado para 50k para capturar mais imóveis

    // Extract images
    const images = extractImages(pageContent, url);

    // Build prompts based on page type
    let prompt;
    
    if (pageType === 'development') {
      // Special prompt for development pages with unit tables
      prompt = `Esta é uma página de um EMPREENDIMENTO imobiliário que lista várias UNIDADES/FRAÇÕES para venda.
Portal: ${portal.name}
URL: ${url}

TEXTO DA PÁGINA:
${textContent.substring(0, 22000)}

INSTRUÇÕES CRÍTICAS:
1. Esta página contém uma TABELA com várias unidades/apartamentos do MESMO empreendimento
2. Extrai CADA LINHA da tabela como um imóvel separado
3. Cada linha tem: Referência, Tipo (T1/T2/T3/T4), Área, Piso, Garagem, Preço
4. O nome do empreendimento deve fazer parte do título de cada unidade
5. Unidades marcadas como "Vendido" devem ser IGNORADAS (não extrair)
6. Todas as unidades ficam na MESMA cidade/morada indicada na página

IMPORTANTE: 
- Extrai TODAS as unidades DISPONÍVEIS da tabela (não vendidas)
- O external_id é a REFERÊNCIA da unidade (ex: LS05277-T1-42C)
- bedrooms = número após o T (T1=1, T2=2, T3=3, T4=4)
- Responde APENAS com JSON válido

Campos por unidade: title, price (número), bedrooms (número), bathrooms (número), square_feet (área em número), city, state, property_type ("apartment"), listing_type ("sale"), external_id (referência), address

FORMATO:
{"properties":[{"title":"The Unique - Apartamento T1","price":445000,"bedrooms":1,"bathrooms":1,"square_feet":58.24,"city":"Aveiro","state":"Aveiro","property_type":"apartment","listing_type":"sale","external_id":"LS05277-T1-42C","address":"Cais da Fonte Nova"}]}`;
    } else if (pageType === 'listing') {
      prompt = `Extrai TODOS os imóveis da listagem principal desta página de pesquisa. Portal: ${portal.name}
URL da listagem: ${url}

TEXTO COMPLETO DA PÁGINA:
${textContent}

REGRAS CRÍTICAS - MÁXIMA EXTRAÇÃO:
1. **EXTRAI TODOS OS IMÓVEIS** listados na área principal de resultados
2. Conta quantos imóveis existem e extrai TODOS (normalmente 20-30 por página)
3. Cada card/anúncio de imóvel deve ser extraído, mesmo que faltem alguns dados
4. NÃO LIMITES a extração - queremos o MÁXIMO de imóveis possível
5. IGNORA apenas:
   - Seções de publicidade/patrocinado explícitas
   - Rodapé e navegação
   - Banners promocionais
6. SE UM IMÓVEL APARECER NA LISTA PRINCIPAL, EXTRAI-O (mesmo sem todos os campos)
7. Responde APENAS com JSON válido
8. Números sem símbolos (495000 não "495.000€")
9. Preços portugueses: 875.000€ = 875000, 1.450.000€ = 1450000

CAMPOS OBRIGATÓRIOS (mínimo):
- title: título do anúncio
- price: preço em número
- city: cidade

CAMPOS OPCIONAIS (extrai se disponível):
- description: descrição do anúncio
- bedrooms: número de quartos (T0=0, T1=1, T2=2, T3=3, T4=4, T5=5)
- bathrooms: número de WCs
- square_feet: área em m²
- state: distrito
- property_type: apartment/house/land/building
- listing_type: sale/rent
- external_id: referência/ID do anúncio
- detail_url: link COMPLETO para página individual

**OBJETIVO: EXTRAIR O MÁXIMO DE IMÓVEIS POSSÍVEL - NÃO SEJAS RESTRITIVO**

FORMATO:
{"properties":[{"title":"T2 em Lisboa","price":295000,"bedrooms":2,"city":"Lisboa","detail_url":"https://..."},{"title":"T3 no Porto","price":350000,"bedrooms":3,"city":"Porto"},...]}

IMPORTANTE: Se a página tiver 25 imóveis, retorna 25. Se tiver 50, retorna 50. NÃO LIMITES!`;
    } else {
      prompt = `Extrai os dados deste imóvel. Portal: ${portal.name}

TEXTO:
${textContent.substring(0, 20000)}

URLS DE IMAGENS ENCONTRADAS NO HTML:
${images.slice(0, 15).join('\n')}

REGRAS IMPORTANTES:
1. Responde APENAS com JSON válido, sem texto adicional
2. Usa aspas duplas para strings
3. Números sem aspas e sem símbolos
4. Sem vírgulas no final antes de } ou ]
5. Extrai a DESCRIÇÃO COMPLETA do imóvel (todo o texto descritivo do anúncio)
6. IMPORTANTE: Extrai APENAS URLs de imagens DO IMÓVEL (fotos do interior, exterior, vistas). NÃO incluas logos, ícones, avatares, banners, publicidade ou imagens de outros imóveis relacionados/sugeridos.
7. Das URLs fornecidas acima, seleciona APENAS as que são claramente fotos do imóvel principal desta página.

Campos: title, description (descrição completa do imóvel com todas as características mencionadas), property_type (apartment/house/land), listing_type (sale/rent), price (número), bedrooms (número), bathrooms (número), square_feet (número), address, city, state, external_id, images (array com URLs APENAS das fotos do imóvel, excluindo logos/ícones/publicidade)

FORMATO EXACTO:
{"title":"Titulo","description":"Descrição completa do imóvel incluindo características, acabamentos, localização, etc.","property_type":"apartment","listing_type":"sale","price":100000,"bedrooms":2,"bathrooms":1,"square_feet":80,"address":"Rua X","city":"Lisboa","state":"Lisboa","external_id":"REF123","images":["url1.jpg","url2.jpg"]}`;
    }

    // Validate API key
    if (!OPENAI_API_KEY) {
      return Response.json({ 
        success: false,
        error: 'Chave da API OpenAI não configurada. Configure OPENAI_API_KEY nos segredos da aplicação.'
      }, { status: 500 });
    }

    // Call OpenAI API with JSON mode
    const openaiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Tu es um especialista em extração de dados imobiliários. Extrai o MÁXIMO de imóveis possível. Responde APENAS com JSON válido, sem markdown ou texto adicional.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0,
          max_tokens: 16384,
          response_format: { type: "json_object" }
        })
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || openaiResponse.statusText;
      
      console.error('[searchPropertyAI] OpenAI API error:', errorMsg);
      
      return Response.json({ 
        success: false,
        error: `Erro na API OpenAI: ${errorMsg}`,
        details: errorData.error?.type || 'unknown_error'
      }, { status: openaiResponse.status });
    }

    const openaiData = await openaiResponse.json();
    
    if (!openaiData.choices || openaiData.choices.length === 0) {
      return Response.json({ 
        success: false,
        error: 'A API não retornou dados. Tente novamente.'
      });
    }
    
    const responseText = openaiData.choices?.[0]?.message?.content || '';
    
    // Parse response with fallback strategies
    const parsedData = safeParseJSON(responseText);
    
    if (!parsedData) {
      return Response.json({ 
        success: false,
        error: 'Não foi possível processar a resposta da IA. Tente novamente.',
        rawResponse: responseText.substring(0, 500)
      });
    }

    // Handle listing or development page
    if ((pageType === 'listing' || pageType === 'development') && parsedData.properties) {
      // Validação MÍNIMA - aceitar imóveis com campos básicos
      const validProperties = parsedData.properties.filter(p => {
        // Validação super flexível - apenas requer título OU preço
        if (!p.title && !p.price) return false;
        
        // Se tem título, aceitar mesmo sem preço (pode ser "Preço sob consulta")
        if (p.title && p.title.length >= 3) return true;
        
        // Se tem preço, aceitar mesmo com título curto
        if (p.price && p.price > 0) return true;
        
        return false;
      });
      
      const properties = validProperties.map(p => ({
        ...p,
        source_url: p.detail_url || url,
        images: p.images || [],
        property_type: p.property_type || 'apartment',
        listing_type: p.listing_type || 'sale',
        // Garantir campos obrigatórios com valores default
        title: p.title || `Imóvel em ${p.city || 'Portugal'}`,
        price: p.price || 0,
        city: p.city || 'N/A',
        state: p.state || p.city || 'N/A'
      }));

      console.log(`[searchPropertyAI] Extraídos ${properties.length} imóveis de ${portal.name}`);

      return Response.json({
        success: true,
        is_listing_page: true,
        total_found: properties.length,
        extracted_count: validProperties.length,
        filtered_count: parsedData.properties.length - validProperties.length,
        properties: properties,
        portal: portal.name,
        page_type: pageType
      });
    }

    // Handle single property
    const property = parsedData.properties?.[0] || parsedData;
    property.source_url = url;
    // Use AI-extracted images if available, otherwise fallback to HTML extraction
    if (!property.images || property.images.length === 0) {
      property.images = images;
    }
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