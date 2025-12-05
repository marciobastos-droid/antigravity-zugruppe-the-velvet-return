// Helper function to format property matches for WhatsApp messages
// Uses plain text without emojis that might break encoding

export function formatWhatsAppPropertyMessage(clientName, properties, appBaseUrl) {
  if (!properties || properties.length === 0) {
    return `Ola ${clientName}!\n\nDe momento nao temos imoveis que correspondam aos seus criterios, mas estamos sempre a atualizar a nossa carteira.\n\nEntraremos em contacto assim que surgirem novas oportunidades!\n\nCumprimentos,\nEquipa Zugruppe`;
  }

  const propertyCount = properties.length;
  const propertyWord = propertyCount === 1 ? 'imovel' : 'imoveis';
  
  let message = `Ola ${clientName}!\n\n`;
  message += `Seleccionamos ${propertyCount} ${propertyWord} que pode${propertyCount === 1 ? '' : 'm'} interessar-lhe:\n\n`;

  properties.forEach((prop, index) => {
    const property = prop.property || prop;
    const score = prop.score || prop.match_score;
    
    // Build property type string
    const typeLabel = getPropertyTypeLabel(property.property_type);
    const bedrooms = property.bedrooms ? `T${property.bedrooms}` : '';
    
    // Title line
    const title = property.title || `${typeLabel} ${bedrooms}`.trim();
    message += `${index + 1}. *${title}*\n`;
    
    // Price
    const price = property.price ? formatPrice(property.price) : 'Preco sob consulta';
    message += `   Preco: ${price}\n`;
    
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
      message += `   Area: ${area}m2\n`;
    }
    
    // Match score if available - use checkmark instead of special chars
    if (score && score >= 70) {
      message += `   [v] Compatibilidade: ${score}%\n`;
    }
    
    message += '\n';
  });

  message += `Tem interesse em algum destes imoveis?\n`;
  message += `Podemos agendar uma visita quando lhe for conveniente.\n\n`;
  message += `Cumprimentos,\nEquipa Zugruppe`;

  return message;
}

export function formatPrice(price) {
  if (!price) return 'Preco sob consulta';
  // Format without special currency symbol to avoid encoding issues
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
  return `${formatted} EUR`;
}

export function getPropertyTypeLabel(type) {
  const types = {
    apartment: 'Apartamento',
    house: 'Moradia',
    land: 'Terreno',
    building: 'Predio',
    farm: 'Quinta',
    store: 'Loja',
    warehouse: 'Armazem',
    office: 'Escritorio',
    hotel: 'Hotel',
    shop: 'Loja'
  };
  return types[type] || 'Imovel';
}

// Shorter version for SMS or character-limited messages
export function formatShortPropertyMessage(clientName, properties, appBaseUrl) {
  if (!properties || properties.length === 0) {
    return `Ola ${clientName}! Ainda nao temos imoveis compativeis, mas contactaremos assim que surgirem. Equipa Zugruppe`;
  }

  const count = properties.length;
  let message = `Ola ${clientName}! Encontramos ${count} imovel(is) para si:\n\n`;

  properties.slice(0, 3).forEach((prop, i) => {
    const property = prop.property || prop;
    const price = property.price ? formatPrice(property.price) : 'Consultar';
    message += `${i + 1}. ${property.title || 'Imovel'} - ${price}\n`;
  });

  if (count > 3) {
    message += `... e mais ${count - 3}\n`;
  }

  message += `\nInteressado? Responda para saber mais!`;
  return message;
}