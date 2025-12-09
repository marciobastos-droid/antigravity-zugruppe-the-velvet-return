/**
 * Gera um slug SEO-friendly a partir de texto
 */
export function generateSlug(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .substring(0, 100); // Limita tamanho
}

/**
 * Gera URL SEO-friendly para imóvel
 * Ex: /imoveis/apartamento/lisboa/t2-luxo-centro-historico
 */
export function generatePropertySEOUrl(property) {
  if (!property) return '';
  
  const propertyTypeMap = {
    apartment: 'apartamento',
    house: 'moradia',
    land: 'terreno',
    building: 'predio',
    farm: 'quinta',
    store: 'loja',
    warehouse: 'armazem',
    office: 'escritorio'
  };
  
  const type = propertyTypeMap[property.property_type] || 'imovel';
  const city = generateSlug(property.city || 'portugal');
  const title = generateSlug(property.title || 'imovel');
  
  return `/imoveis/${type}/${city}/${title}`;
}

/**
 * Extrai ID do imóvel de uma URL SEO-friendly ou URL antiga
 * Aceita: /imoveis/apartamento/lisboa/titulo?id=123 ou /propertydetails?id=123
 */
export function extractPropertyIdFromUrl(url) {
  // Tenta extrair do query string (formato antigo e novo)
  const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
  const id = urlParams.get('id');
  
  if (id) return id;
  
  // Se não houver ID no query string, retorna null
  // (no futuro, poderia buscar pelo slug no título)
  return null;
}

/**
 * Gera meta description otimizada para SEO
 */
export function generatePropertyMetaDescription(property) {
  if (!property) return '';
  
  const parts = [];
  
  // Tipo e tipologia
  const propertyTypeMap = {
    apartment: 'Apartamento',
    house: 'Moradia',
    land: 'Terreno',
    building: 'Prédio',
    farm: 'Quinta',
    store: 'Loja',
    warehouse: 'Armazém',
    office: 'Escritório'
  };
  
  const type = propertyTypeMap[property.property_type] || 'Imóvel';
  if (property.bedrooms !== undefined && property.bedrooms !== null) {
    parts.push(`${type} T${property.bedrooms}`);
  } else {
    parts.push(type);
  }
  
  // Localização
  if (property.city) {
    parts.push(`em ${property.city}`);
  }
  
  // Preço
  if (property.price) {
    parts.push(`por €${property.price.toLocaleString()}`);
  }
  
  // Área
  if (property.useful_area || property.square_feet) {
    parts.push(`com ${property.useful_area || property.square_feet}m²`);
  }
  
  // Action
  const action = property.listing_type === 'sale' ? 'para venda' : 'para arrendar';
  parts.push(action);
  
  let description = parts.join(' ') + '.';
  
  // Adiciona início da descrição se houver espaço
  if (property.description && description.length < 120) {
    const extraDesc = property.description.substring(0, 160 - description.length - 3);
    description += ' ' + extraDesc + '...';
  }
  
  return description.substring(0, 160);
}

/**
 * Gera keywords otimizadas
 */
export function generatePropertyKeywords(property) {
  if (!property) return '';
  
  const keywords = [];
  
  const propertyTypeMap = {
    apartment: 'apartamento',
    house: 'moradia',
    land: 'terreno',
    building: 'prédio',
    farm: 'quinta',
    store: 'loja',
    warehouse: 'armazém',
    office: 'escritório'
  };
  
  // Tipo
  const type = propertyTypeMap[property.property_type];
  if (type) {
    keywords.push(type);
    if (property.bedrooms !== undefined) {
      keywords.push(`${type} t${property.bedrooms}`);
    }
  }
  
  // Localização
  if (property.city) keywords.push(property.city.toLowerCase());
  if (property.state) keywords.push(property.state.toLowerCase());
  
  // Ação
  keywords.push(property.listing_type === 'sale' ? 'venda' : 'arrendamento');
  
  // Características
  if (property.bedrooms) keywords.push(`${property.bedrooms} quartos`);
  if (property.bathrooms) keywords.push(`${property.bathrooms} wc`);
  
  // Amenidades principais
  if (property.amenities && property.amenities.length > 0) {
    const mainAmenities = ['piscina', 'garagem', 'jardim', 'terraço'];
    property.amenities.forEach(amenity => {
      const lower = amenity.toLowerCase();
      if (mainAmenities.some(a => lower.includes(a))) {
        keywords.push(lower);
      }
    });
  }
  
  keywords.push('imóvel', 'portugal', 'zugruppe');
  
  return keywords.filter(Boolean).join(', ');
}

/**
 * Gera structured data Schema.org para imóvel
 */
export function generatePropertyStructuredData(property, imageUrl) {
  if (!property) return null;
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://zugruppe.pt';
  const propertyUrl = `${baseUrl}${generatePropertySEOUrl(property)}?id=${property.id}`;
  
  return {
    "@context": "https://schema.org",
    "@type": property.listing_type === 'sale' ? "RealEstateListing" : "RentAction",
    "name": property.title,
    "description": property.description || generatePropertyMetaDescription(property),
    "url": propertyUrl,
    "image": imageUrl || property.images?.[0] || `${baseUrl}/default-property.jpg`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.address,
      "addressLocality": property.city,
      "addressRegion": property.state,
      "postalCode": property.zip_code,
      "addressCountry": property.country || "PT"
    },
    "geo": property.latitude && property.longitude ? {
      "@type": "GeoCoordinates",
      "latitude": property.latitude,
      "longitude": property.longitude
    } : undefined,
    "offers": {
      "@type": "Offer",
      "price": property.price,
      "priceCurrency": property.currency || "EUR",
      "availability": property.availability_status === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "priceValidUntil": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    "numberOfRooms": property.bedrooms,
    "numberOfBathroomsTotal": property.bathrooms,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": property.useful_area || property.square_feet,
      "unitCode": "MTK"
    },
    "yearBuilt": property.year_built,
    "datePosted": property.created_date,
    "seller": {
      "@type": "Organization",
      "name": "Zugruppe",
      "url": baseUrl,
      "logo": `${baseUrl}/logo.png`
    }
  };
}