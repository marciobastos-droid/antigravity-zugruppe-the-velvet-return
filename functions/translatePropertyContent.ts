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
      return Response.json({ 
        error: 'Missing property_id'
      }, { status: 400 });
    }

    // Fetch property data
    const properties = await base44.entities.Property.filter({ id: property_id });
    if (!properties || properties.length === 0) {
      return Response.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = properties[0];
    const title = property.title;
    const description = property.description;
    const amenities = property.amenities || [];

    // Traduzir para todos os idiomas
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' }
    ];

    const translations = {
      en: { title: "", description: "", amenities: [] },
      es: { title: "", description: "", amenities: [] },
      fr: { title: "", description: "", amenities: [] },
      de: { title: "", description: "", amenities: [] }
    };

    // Traduzir cada idioma
    for (const lang of languages) {
      const prompt = `You are a professional real estate translator.

TASK: Translate the following Portuguese property listing to ${lang.name}.

ORIGINAL TITLE (Portuguese):
${title}

ORIGINAL DESCRIPTION (Portuguese):
${description}

${amenities.length > 0 ? `AMENITIES (Portuguese):\n${amenities.join(', ')}\n\n` : ''}

INSTRUCTIONS:
1. Translate naturally and professionally for ${lang.name} real estate market
2. Maintain the tone and style
3. Keep property-specific terms accurate
4. Return ONLY valid JSON with this exact structure:
{
  "title": "translated title here",
  "description": "translated description here",
  "amenities": ["translated amenity 1", "translated amenity 2"]
}

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.`;

      try {
        const translation = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              amenities: { 
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["title", "description"]
          }
        });

        translations[lang.code] = {
          title: translation.title || "",
          description: translation.description || "",
          amenities: translation.amenities || []
        };
      } catch (error) {
        console.error(`Failed to translate to ${lang.code}:`, error);
        // Manter vazio em caso de erro
        translations[lang.code] = {
          title: "",
          description: "",
          amenities: []
        };
      }
    }

    // Update property with translations
    await base44.asServiceRole.entities.Property.update(property_id, {
      translations: translations
    });

    return Response.json({ 
      success: true,
      translations: translations 
    });

  } catch (error) {
    console.error('Translation error:', error);
    return Response.json({ 
      error: 'Translation failed',
      details: error.message 
    }, { status: 500 });
  }
});