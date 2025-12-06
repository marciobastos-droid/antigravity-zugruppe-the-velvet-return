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
        const propertyProfile = `
Tipo: ${property.property_type}
Natureza: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Preço: €${property.price}
Localização: ${property.city}, ${property.state}
Quartos: ${property.bedrooms || 0}
Área: ${property.useful_area || property.square_feet || 0} m²
${property.tags?.length > 0 ? `Tags: ${property.tags.join(', ')}` : ''}
${property.description ? `Características: ${property.description.substring(0, 300)}` : ''}
        `.trim();

        const availablePortals = [
            { id: "idealista", name: "Idealista", description: "Portal líder em Portugal" },
            { id: "imovirtual", name: "Imovirtual", description: "Grande alcance nacional" },
            { id: "casafari", name: "Casafari", description: "Plataforma profissional B2B" },
            { id: "olx", name: "OLX", description: "Maior alcance popular" },
            { id: "supercasa", name: "Supercasa", description: "Portal tradicional" },
            { id: "custojusto", name: "Custo Justo", description: "Classificados gratuitos" }
        ];

        const availablePages = [
            { id: "browse", name: "Página Navegar", description: "Listagem principal" },
            { id: "zuhaus", name: "ZuHaus - Residencial", description: "Imóveis residenciais" },
            { id: "zuhandel", name: "ZuHandel - Comercial", description: "Imóveis comerciais" },
            { id: "homepage_featured", name: "Homepage - Destaque", description: "Destaque na homepage" },
            { id: "investor_section", name: "Secção Investidores", description: "Para investidores" },
            { id: "luxury_collection", name: "Coleção Luxo", description: "Imóveis premium" }
        ];

        const prompt = `És um especialista em marketing imobiliário digital. Analisa este imóvel e recomenda os melhores canais de publicação.

Perfil do imóvel:
${propertyProfile}

Portais disponíveis:
${availablePortals.map(p => `- ${p.id}: ${p.name} (${p.description})`).join('\n')}

Páginas do website disponíveis:
${availablePages.map(p => `- ${p.id}: ${p.name} (${p.description})`).join('\n')}

Para cada canal recomendado, fornece:
1. ID do canal
2. Prioridade (alta/média/baixa)
3. Razão da recomendação (1 frase curta)

Responde em formato JSON com duas listas: "portals" e "pages".`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    portals: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                priority: { type: "string", enum: ["alta", "média", "baixa"] },
                                reason: { type: "string" }
                            }
                        }
                    },
                    pages: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                priority: { type: "string", enum: ["alta", "média", "baixa"] },
                                reason: { type: "string" }
                            }
                        }
                    }
                },
                required: ["portals", "pages"]
            }
        });

        return Response.json({
            success: true,
            recommendations: {
                portals: result.portals || [],
                pages: result.pages || []
            }
        });

    } catch (error) {
        console.error('Error recommending channels:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});