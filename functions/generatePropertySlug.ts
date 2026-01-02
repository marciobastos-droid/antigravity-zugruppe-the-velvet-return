import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function slugify(text) {
  if (!text) return '';
  
  const portugueseMap = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n'
  };
  
  return text
    .toLowerCase()
    .trim()
    .split('')
    .map(char => portugueseMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

function generateSlug(property) {
  const parts = [];
  
  const typeMap = {
    apartment: 'apartamento',
    house: 'moradia',
    land: 'terreno',
    building: 'predio',
    farm: 'quinta',
    store: 'loja',
    warehouse: 'armazem',
    office: 'escritorio'
  };
  
  // Tipologia (ex: t2, t3)
  if (property.bedrooms) {
    parts.push(`t${property.bedrooms}`);
  }
  
  // Tipo de imóvel
  parts.push(typeMap[property.property_type] || property.property_type);
  
  // Venda ou arrendamento
  parts.push(property.listing_type === 'sale' ? 'venda' : 'arrendamento');
  
  // Cidade
  if (property.city) {
    parts.push(slugify(property.city));
  }
  
  // Bairro/zona se presente no endereço
  if (property.address) {
    const addressParts = property.address.split(',')[0].trim();
    if (addressParts.length < 30) {
      parts.push(slugify(addressParts));
    }
  }
  
  return parts.join('-');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { property_id, property_data } = await req.json();
    
    if (property_id) {
      // Gerar slug para um imóvel específico
      const properties = await base44.asServiceRole.entities.Property.filter({ id: property_id });
      if (!properties || properties.length === 0) {
        return Response.json({ error: 'Property not found' }, { status: 404 });
      }
      
      const property = properties[0];
      const slug = generateSlug(property);
      
      // Verificar se slug já existe
      const existing = await base44.asServiceRole.entities.Property.filter({ slug });
      if (existing.length > 0 && existing[0].id !== property_id) {
        // Adicionar ID ao slug se já existir
        const uniqueSlug = `${slug}-${property_id.substring(0, 8)}`;
        await base44.asServiceRole.entities.Property.update(property_id, { slug: uniqueSlug });
        return Response.json({ success: true, slug: uniqueSlug });
      }
      
      await base44.asServiceRole.entities.Property.update(property_id, { slug });
      return Response.json({ success: true, slug });
      
    } else if (property_data) {
      // Gerar slug a partir de dados fornecidos (para preview)
      const slug = generateSlug(property_data);
      return Response.json({ success: true, slug });
      
    } else {
      return Response.json({ error: 'Missing property_id or property_data' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[generatePropertySlug] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});