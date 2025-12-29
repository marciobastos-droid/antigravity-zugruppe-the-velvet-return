import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, amenities = [] } = await req.json();

    if (!title || !description) {
      return Response.json({ 
        error: 'Missing required fields',
        details: 'Title and description are required'
      }, { status: 400 });
    }

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

    return Response.json(translations);

  } catch (error) {
    console.error('Translation error:', error);
    return Response.json({ 
      error: 'Translation failed',
      details: error.message 
    }, { status: 500 });
  }
});