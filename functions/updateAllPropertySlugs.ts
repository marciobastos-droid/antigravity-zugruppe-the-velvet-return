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
  
  if (property.bedrooms) {
    parts.push(`t${property.bedrooms}`);
  }
  
  parts.push(typeMap[property.property_type] || property.property_type);
  parts.push(property.listing_type === 'sale' ? 'venda' : 'arrendamento');
  
  if (property.city) {
    parts.push(slugify(property.city));
  }
  
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
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const properties = await base44.asServiceRole.entities.Property.list();
    let updated = 0;
    let skipped = 0;
    const slugMap = new Map();
    
    for (const property of properties) {
      if (property.slug) {
        skipped++;
        continue;
      }
      
      let slug = generateSlug(property);
      
      // Garantir unicidade
      if (slugMap.has(slug)) {
        slug = `${slug}-${property.id.substring(0, 8)}`;
      }
      
      slugMap.set(slug, property.id);
      
      await base44.asServiceRole.entities.Property.update(property.id, { slug });
      updated++;
    }
    
    return Response.json({ 
      success: true, 
      total: properties.length,
      updated,
      skipped,
      message: `${updated} slugs gerados, ${skipped} já existiam`
    });
    
  } catch (error) {
    console.error('[updateAllPropertySlugs] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});