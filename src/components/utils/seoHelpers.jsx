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
  
  // Localização detalhada
  if (property.city && property.state) {
    parts.push(`em ${property.city}, ${property.state}`);
  } else if (property.city) {
    parts.push(`em ${property.city}`);
  }
  
  // Preço
  if (property.price) {
    parts.push(`por €${property.price.toLocaleString()}`);
  }
  
  // Área e casas de banho
  const details = [];
  if (property.useful_area || property.square_feet) {
    details.push(`${property.useful_area || property.square_feet}m²`);
  }
  if (property.bathrooms) {
    details.push(`${property.bathrooms} WC`);
  }
  if (details.length > 0) {
    parts.push(`com ${details.join(', ')}`);
  }
  
  // Action
  const action = property.listing_type === 'sale' ? 'para venda' : 'para arrendar';
  parts.push(action);
  
  // Características premium
  const highlights = [];
  if (property.energy_certificate && ['A+', 'A', 'B'].includes(property.energy_certificate)) {
    highlights.push(`Cert. Energético ${property.energy_certificate}`);
  }
  if (property.garage && property.garage !== 'none') {
    highlights.push('garagem');
  }
  if (property.amenities?.some(a => a.toLowerCase().includes('piscina'))) {
    highlights.push('piscina');
  }
  
  let description = parts.join(' ');
  if (highlights.length > 0) {
    description += `. ${highlights.join(', ')}.`;
  } else {
    description += '.';
  }
  
  // Adiciona início da descrição se houver espaço
  if (property.description && description.length < 130) {
    const extraDesc = property.description.substring(0, 155 - description.length - 3);
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
  
  // Tipo base e variações
  const type = propertyTypeMap[property.property_type];
  if (type) {
    keywords.push(type);
    if (property.bedrooms !== undefined) {
      keywords.push(`${type} t${property.bedrooms}`);
      keywords.push(`t${property.bedrooms}`);
    }
    // Variações do tipo
    keywords.push(`${type}s`);
    if (property.listing_type === 'sale') {
      keywords.push(`${type} para venda`, `comprar ${type}`);
    } else {
      keywords.push(`${type} para arrendar`, `arrendar ${type}`);
    }
  }
  
  // Localização multi-nível
  if (property.city) {
    keywords.push(property.city.toLowerCase());
    keywords.push(`imóveis ${property.city.toLowerCase()}`);
    keywords.push(`${type} ${property.city.toLowerCase()}`);
  }
  if (property.state && property.state !== property.city) {
    keywords.push(property.state.toLowerCase());
  }
  if (property.country && property.country !== 'Portugal') {
    keywords.push(property.country.toLowerCase());
  }
  
  // Ação principal
  keywords.push(property.listing_type === 'sale' ? 'venda' : 'arrendamento');
  keywords.push(property.listing_type === 'sale' ? 'comprar' : 'arrendar');
  
  // Características detalhadas
  if (property.bedrooms) keywords.push(`${property.bedrooms} quartos`);
  if (property.bathrooms) keywords.push(`${property.bathrooms} casas de banho`);
  if (property.useful_area || property.square_feet) {
    keywords.push(`${property.useful_area || property.square_feet}m²`);
  }
  
  // Faixa de preço
  if (property.price) {
    const priceK = Math.floor(property.price / 1000);
    keywords.push(`€${priceK}k`);
    if (property.price < 200000) keywords.push('imóvel económico');
    else if (property.price > 500000) keywords.push('imóvel de luxo', 'propriedade premium');
  }
  
  // Ano e estado
  if (property.year_built && property.year_built > 2015) keywords.push('imóvel novo', 'recente');
  if (property.year_renovated) keywords.push('renovado', 'remodelado');
  
  // Certificado energético
  if (property.energy_certificate && ['A+', 'A', 'B'].includes(property.energy_certificate)) {
    keywords.push('eficiência energética', `certificado ${property.energy_certificate}`);
  }
  
  // Amenidades principais
  if (property.amenities && property.amenities.length > 0) {
    const amenityKeywords = {
      'piscina': ['piscina', 'com piscina'],
      'garagem': ['garagem', 'estacionamento'],
      'jardim': ['jardim', 'espaço exterior'],
      'terraço': ['terraço', 'varanda'],
      'elevador': ['elevador'],
      'ar condicionado': ['ar condicionado', 'climatizado'],
      'condomínio fechado': ['condomínio fechado', 'segurança'],
      'vista mar': ['vista mar', 'frente mar']
    };
    
    property.amenities.forEach(amenity => {
      const lower = amenity.toLowerCase();
      Object.entries(amenityKeywords).forEach(([key, values]) => {
        if (lower.includes(key)) {
          keywords.push(...values);
        }
      });
    });
  }
  
  // Termos base e marca
  keywords.push('imóvel', 'propriedade', 'portugal', 'zugruppe', 'imobiliária');
  
  // Remover duplicados e limitar
  return [...new Set(keywords)].filter(Boolean).slice(0, 50).join(', ');
}

/**
 * Gera structured data Schema.org para imóvel
 */
export function generatePropertyStructuredData(property, imageUrl) {
  if (!property) return null;
  
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://zugruppe.pt';
  const propertyUrl = `${baseUrl}${generatePropertySEOUrl(property)}?id=${property.id}`;
  
  // Map property types to Schema.org accommodation types
  const schemaTypeMap = {
    'apartment': 'Apartment',
    'house': 'House',
    'land': 'Residence',
    'building': 'Residence',
    'farm': 'House',
    'store': 'Store',
    'warehouse': 'Store',
    'office': 'OfficeSpace'
  };
  
  const accommodationType = schemaTypeMap[property.property_type] || 'Residence';
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["Product", accommodationType],
    "name": property.title,
    "description": property.description || generatePropertyMetaDescription(property),
    "url": propertyUrl,
    "image": property.images?.length > 0 ? property.images : [imageUrl || `${baseUrl}/default-property.jpg`],
    "datePublished": property.created_date,
    "dateModified": property.updated_date,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.address || '',
      "addressLocality": property.city || '',
      "addressRegion": property.state || '',
      "postalCode": property.zip_code || '',
      "addressCountry": property.country || "PT"
    }
  };
  
  // Geo coordinates
  if (property.latitude && property.longitude) {
    structuredData.geo = {
      "@type": "GeoCoordinates",
      "latitude": property.latitude,
      "longitude": property.longitude
    };
  }
  
  // Offer details with rental/sale specifics
  structuredData.offers = {
    "@type": "Offer",
    "price": property.price,
    "priceCurrency": property.currency || "EUR",
    "availability": property.availability_status === 'available' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    "priceValidUntil": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    "itemCondition": property.year_built && property.year_built > new Date().getFullYear() - 5 ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    "businessFunction": property.listing_type === 'sale' ? "http://purl.org/goodrelations/v1#Sell" : "http://purl.org/goodrelations/v1#LeaseOut",
    "seller": {
      "@type": "RealEstateAgent",
      "name": "Zugruppe",
      "url": baseUrl,
      "logo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6915a593b6edd8435f5838bd/359538617_Zugruppe01.jpg",
      "telephone": "+351234026615",
      "email": "info@zuconnect.pt"
    }
  };
  
  // Property features (specific fields for accommodation types)
  if (property.bedrooms !== undefined) {
    structuredData.numberOfRooms = property.bedrooms;
    structuredData.numberOfBedrooms = property.bedrooms;
  }
  if (property.bathrooms) {
    structuredData.numberOfBathroomsTotal = property.bathrooms;
  }
  
  // Floor size
  if (property.useful_area || property.square_feet) {
    structuredData.floorSize = {
      "@type": "QuantitativeValue",
      "value": property.useful_area || property.square_feet,
      "unitCode": "MTK",
      "unitText": "m²"
    };
  }
  
  // Additional details
  if (property.year_built) {
    structuredData.yearBuilt = property.year_built;
  }
  
  if (property.created_date) {
    structuredData.datePosted = property.created_date;
  }
  
  // Property ID
  if (property.ref_id) {
    structuredData.sku = property.ref_id;
    structuredData.identifier = property.ref_id;
    structuredData.productID = property.ref_id;
  }
  
  // Amenities as features
  if (property.amenities && property.amenities.length > 0) {
    structuredData.amenityFeature = property.amenities.map(amenity => ({
      "@type": "LocationFeatureSpecification",
      "name": amenity,
      "value": true
    }));
  }
  
  // Additional properties array
  structuredData.additionalProperty = [];
  
  if (property.gross_area) {
    structuredData.additionalProperty.push({
      "@type": "PropertyValue",
      "name": "grossArea",
      "value": property.gross_area,
      "unitCode": "MTK",
      "unitText": "m²"
    });
  }
  
  if (property.energy_certificate) {
    structuredData.additionalProperty.push({
      "@type": "PropertyValue",
      "name": "energyRating",
      "value": property.energy_certificate
    });
  }
  
  if (property.garage && property.garage !== 'none') {
    structuredData.additionalProperty.push({
      "@type": "PropertyValue",
      "name": "numberOfParkingSpaces",
      "value": property.garage
    });
  }
  
  if (property.floor) {
    structuredData.additionalProperty.push({
      "@type": "PropertyValue",
      "name": "floorLevel",
      "value": property.floor
    });
  }
  
  if (property.front_count) {
    structuredData.additionalProperty.push({
      "@type": "PropertyValue",
      "name": "numberOfFronts",
      "value": property.front_count
    });
  }
  
  if (property.sun_exposure) {
    structuredData.additionalProperty.push({
      "@type": "PropertyValue",
      "name": "sunExposure",
      "value": property.sun_exposure
    });
  }
  
  // Aggregate rating if available
  if (property.quality_score) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": (property.quality_score / 20).toFixed(1),
      "bestRating": "5",
      "worstRating": "1"
    };
  }
  
  return structuredData;
}