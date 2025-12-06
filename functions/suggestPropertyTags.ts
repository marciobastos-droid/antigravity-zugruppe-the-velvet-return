import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { propertyId } = await req.json();

        if (!propertyId) {
            return Response.json({ error: 'propertyId required' }, { status: 400 });
        }

        // Buscar o imóvel
        const properties = await base44.entities.Property.list();
        const property = properties.find(p => p.id === propertyId);

        if (!property) {
            return Response.json({ error: 'Property not found' }, { status: 404 });
        }

        // Preparar contexto
        const propertyInfo = `
Tipo: ${property.property_type}
Negócio: ${property.listing_type}
Localização: ${property.city}, ${property.state}
Preço: €${property.price}
Quartos: ${property.bedrooms || 0}
WCs: ${property.bathrooms || 0}
Área: ${property.useful_area || property.square_feet || 0} m²
Ano: ${property.year_built || 'N/A'}
${property.year_renovated ? `Renovado: ${property.year_renovated}` : ''}
Garagem: ${property.garage || 'Não'}
Certificado: ${property.energy_certificate || 'N/A'}
${property.amenities?.length > 0 ? `Comodidades: ${property.amenities.join(', ')}` : ''}
${property.description ? `Descrição: ${property.description.substring(0, 200)}` : ''}
        `.trim();

        const prompt = `Analisa este imóvel e sugere 5-8 tags/etiquetas relevantes em português que ajudem na categorização e pesquisa do imóvel.

Informações do imóvel:
${propertyInfo}

As tags devem ser:
- Curtas e diretas (1-3 palavras)
- Relevantes para o perfil do imóvel
- Úteis para marketing e pesquisa
- Em português de Portugal

Exemplos de tags úteis: "Vista Mar", "Centro Histórico", "Luxo", "Investimento", "Reformado", "Piscina", "Jardim", "Terraço", "Luminoso", "Moderno", "Rústico", etc.

Responde APENAS com uma lista JSON de strings, sem texto adicional.`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "Lista de tags sugeridas"
                    }
                },
                required: ["tags"]
            }
        });

        return Response.json({
            success: true,
            tags: result.tags || []
        });

    } catch (error) {
        console.error('Error suggesting tags:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});