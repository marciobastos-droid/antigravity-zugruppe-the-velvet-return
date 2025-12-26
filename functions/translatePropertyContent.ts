import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property_id, target_languages } = await req.json();
    
    if (!property_id) {
      return Response.json({ error: 'property_id is required' }, { status: 400 });
    }

    // Fetch property
    const properties = await base44.entities.Property.filter({ id: property_id });
    if (!properties || properties.length === 0) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = properties[0];
    const languages = target_languages || ['en', 'es', 'fr', 'de'];
    const translations = property.translations || {};

    // Translate to each language
    for (const lang of languages) {
      if (translations[lang]) continue; // Skip if already translated

      const languageNames = {
        en: 'English',
        es: 'Spanish',
        fr: 'French',
        de: 'German'
      };

      const prompt = `You are a professional real estate translator. Translate the following property details from Portuguese to ${languageNames[lang]}.

IMPORTANT: Maintain the professional real estate tone and appeal to international buyers interested in Portugal.

Original Title: ${property.title}
Original Description: ${property.description || 'N/A'}
Original Amenities: ${property.amenities?.join(', ') || 'N/A'}

Please provide translations in JSON format:
{
  "title": "translated title",
  "description": "translated description (maintain paragraph structure)",
  "amenities": ["translated", "amenities", "list"]
}

Make the translation appealing and highlight Portugal's real estate appeal for international buyers.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            amenities: { type: "array", items: { type: "string" } }
          }
        }
      });

      translations[lang] = response;
    }

    // Update property with translations
    await base44.entities.Property.update(property_id, { translations });

    return Response.json({ 
      success: true, 
      translations,
      message: `Property translated to ${languages.length} languages`
    });

  } catch (error) {
    console.error('Translation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});