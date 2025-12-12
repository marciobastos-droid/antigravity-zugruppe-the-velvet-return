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

        // Preparar contexto para o LLM
        const propertyContext = `
Tipo: ${property.property_type || 'N/A'}
Negócio: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Localização: ${property.city}, ${property.state}${property.address ? `, ${property.address}` : ''}
Preço: €${property.price?.toLocaleString()}${property.listing_type === 'rent' ? '/mês' : ''}
Quartos: ${property.bedrooms || 'N/A'}
Casas de banho: ${property.bathrooms || 'N/A'}
Área útil: ${property.useful_area || property.square_feet || 'N/A'} m²
Área bruta: ${property.gross_area || 'N/A'} m²
Ano de construção: ${property.year_built || 'N/A'}
${property.year_renovated ? `Renovado em: ${property.year_renovated}` : ''}
Garagem: ${property.garage || 'N/A'}
Exposição solar: ${property.sun_exposure || 'N/A'}
Certificado energético: ${property.energy_certificate || 'N/A'}
${property.finishes ? `Acabamentos: ${property.finishes}` : ''}
${property.amenities?.length > 0 ? `Comodidades: ${property.amenities.join(', ')}` : ''}
${property.description ? `Descrição atual: ${property.description}` : ''}
        `.trim();

        const prompt = `És um especialista em marketing imobiliário em Portugal. Cria uma descrição profissional, atrativa e detalhada para o seguinte imóvel. A descrição deve:

- Ser em português de Portugal
- Ter entre 150-300 palavras
- Destacar os pontos fortes do imóvel
- Usar linguagem persuasiva mas profissional
- Incluir detalhes sobre localização, características e comodidades
- Terminar com um call-to-action convidativo

Informações do imóvel:
${propertyContext}

Gera apenas a descrição, sem títulos ou formatação adicional.`;

        // Chamar a integração InvokeLLM (sem imagens para evitar erros)
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt
        });

        const description = typeof result === 'string' ? result : result.content || result.message || result.description;

        if (!description) {
            throw new Error('LLM não retornou uma descrição válida');
        }

        return Response.json({
            success: true,
            description: description.trim()
        });

    } catch (error) {
        console.error('Error generating description:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});