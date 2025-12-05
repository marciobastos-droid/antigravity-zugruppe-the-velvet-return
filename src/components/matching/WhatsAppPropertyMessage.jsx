// Helper function to format property matches for WhatsApp messages
// Uses plain text without emojis that might break encoding

export function formatWhatsAppPropertyMessage(clientName, properties, appBaseUrl) {
  if (!properties || properties.length === 0) {
    return `Olá ${clientName}!\n\nDe momento não temos imóveis que correspondam aos seus critérios, mas estamos sempre a atualizar a nossa carteira.\n\nEntraremos em contacto assim que surgirem novas oportunidades!\n\nCumprimentos,\nEquipa Zugruppe`;
  }

  const propertyCount = properties.length;
  const propertyWord = propertyCount === 1 ? 'imóvel' : 'imóveis';
  
  let message = `Olá ${clientName}!\n\n`;
  message += `Selecionámos ${propertyCount} ${propertyWord} que pode${propertyCount === 1 ? '' : 'm'} interessar-lhe:\n\n`;

  properties.forEach((prop, index) => {
    const property = prop.property || prop;
    const score = prop.score || prop.match_score;
    
    // Build property type string
    const typeLabel = getPropertyTypeLabel(property.property_type);
    const bedrooms = property.bedrooms ? `T${property.bedrooms}` : '';
    const listingType = property.listing_type === 'rent' ? 'para arrendar' : 'à venda';
    
    // Title line
    const title = property.title || `${typeLabel} ${bedrooms}`.trim();
    message += `${index + 1}. *${title}*\n`;
    
    // Price
    const price = property.price ? formatPrice(property.price) : 'Preço sob consulta';
    message += `   Preço: ${price}\n`;
    
    // Location and details
    const location = [property.city, property.state].filter(Boolean).join(', ');
    if (location) {
      message += `   Local: ${location}`;
      if (bedrooms) message += ` | ${bedrooms}`;
      message += '\n';
    }
    
    // Area if available
    const area = property.useful_area || property.square_feet || property.gross_area;
    if (area) {
      message += `   Área: ${area}m²\n`;
    }
    
    // Match score if available
    if (score && score >= 70) {
      message += `   Compatibilidade: ${score}%\n`;
    }
    
    // Property URL
    if (appBaseUrl && property.id) {
      const propertyUrl = `${appBaseUrl}/propertydetails?id=${property.id}`;
      message += `   Ver: ${propertyUrl}\n`;
    }
    
    message += '\n';
  });

  message += `Tem interesse em algum destes imóveis?\n`;
  message += `Podemos agendar uma visita quando lhe for conveniente.\n\n`;
  message += `Cumprimentos,\nEquipa Zugruppe`;

  return message;
}

export function formatPrice(price) {
  if (!price) return 'Preço sob consulta';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

export function getPropertyTypeLabel(type) {
  const types = {
    apartment: 'Apartamento',
    house: 'Moradia',
    land: 'Terreno',
    building: 'Prédio',
    farm: 'Quinta',
    store: 'Loja',
    warehouse: 'Armazém',
    office: 'Escritório',
    hotel: 'Hotel',
    shop: 'Loja'
  };
  return types[type] || 'Imóvel';
}

// Shorter version for SMS or character-limited messages
export function formatShortPropertyMessage(clientName, properties, appBaseUrl) {
  if (!properties || properties.length === 0) {
    return `Olá ${clientName}! Ainda não temos imóveis compatíveis, mas contactaremos assim que surgirem. Equipa Zugruppe`;
  }

  const count = properties.length;
  let message = `Olá ${clientName}! Encontrámos ${count} imóvel(is) para si:\n\n`;

  properties.slice(0, 3).forEach((prop, i) => {
    const property = prop.property || prop;
    const price = property.price ? formatPrice(property.price) : 'Consultar';
    message += `${i + 1}. ${property.title || 'Imóvel'} - ${price}\n`;
  });

  if (count > 3) {
    message += `... e mais ${count - 3}\n`;
  }

  message += `\nInteressado? Responda para saber mais!`;
  return message;
}