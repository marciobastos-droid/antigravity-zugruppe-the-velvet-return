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

        const properties = await base44.entities.Property.list();
        const property = properties.find(p => p.id === propertyId);

        if (!property) {
            return Response.json({ error: 'Property not found' }, { status: 404 });
        }

        // Get similar properties for market comparison
        const similarProperties = properties.filter(p =>
            p.id !== propertyId &&
            p.city === property.city &&
            p.property_type === property.property_type &&
            p.listing_type === property.listing_type &&
            p.price > 0 &&
            (p.status === 'active' || p.status === 'sold' || p.status === 'rented')
        );

        const marketContext = buildMarketContext(property, similarProperties);

        const prompt = `És um analista de mercado imobiliário especializado em Portugal. Analisa este imóvel e fornece uma estratégia de pricing detalhada.

IMÓVEL A ANALISAR:
${buildPropertyContext(property)}

CONTEXTO DE MERCADO:
${marketContext}

ANÁLISE SOLICITADA:
1. Preço sugerido com base no mercado
2. Análise comparativa com imóveis semelhantes
3. Estratégia de pricing (agressivo/conservador/premium)
4. Justificação detalhada da recomendação
5. Fatores que influenciam o valor
6. Margem de negociação recomendada
7. Previsão de tempo de venda/arrendamento
8. Recomendações para maximizar o valor

Considera:
- Localização e valorização da zona
- Estado de conservação e acabamentos
- Procura atual no mercado
- Características únicas ou diferenciadoras
- Tendências de mercado em ${property.city}`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    suggested_price: { type: "number", description: "Preço sugerido" },
                    price_range_min: { type: "number", description: "Limite inferior da faixa de preço" },
                    price_range_max: { type: "number", description: "Limite superior da faixa de preço" },
                    price_per_sqm: { type: "number", description: "Preço por m²" },
                    strategy: { 
                        type: "string", 
                        enum: ["aggressive", "moderate", "premium", "conservative"],
                        description: "Estratégia de pricing recomendada"
                    },
                    confidence: { type: "number", description: "Nível de confiança da análise (0-100)" },
                    justification: { type: "string", description: "Justificação detalhada" },
                    value_factors: {
                        type: "array",
                        items: { type: "string" },
                        description: "Fatores que influenciam positivamente o valor"
                    },
                    risks: {
                        type: "array",
                        items: { type: "string" },
                        description: "Riscos ou fatores negativos"
                    },
                    negotiation_margin: { type: "number", description: "Margem de negociação sugerida (%)" },
                    estimated_sale_time_days: { type: "number", description: "Tempo estimado de venda em dias" },
                    recommendations: {
                        type: "array",
                        items: { type: "string" },
                        description: "Recomendações para maximizar valor"
                    },
                    market_position: {
                        type: "string",
                        enum: ["below_market", "market_average", "above_market", "premium"],
                        description: "Posição do preço atual vs mercado"
                    },
                    comparable_properties: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ref: { type: "string" },
                                price: { type: "number" },
                                similarity: { type: "string" }
                            }
                        },
                        description: "Imóveis comparáveis encontrados"
                    }
                },
                required: ["suggested_price", "strategy", "justification"]
            }
        });

        // Update property with AI pricing data
        await base44.asServiceRole.entities.Property.update(propertyId, {
            ai_suggested_price: result.suggested_price,
            ai_price_analysis: result,
            ai_features_used: [...new Set([...(property.ai_features_used || []), 'pricing'])]
        });

        return Response.json({
            success: true,
            analysis: result
        });

    } catch (error) {
        console.error('Error analyzing pricing:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});

function buildPropertyContext(property) {
    return `
Tipo: ${property.property_type}
Negócio: ${property.listing_type === 'sale' ? 'Venda' : 'Arrendamento'}
Localização: ${property.address || ''}, ${property.city}, ${property.state}
Preço Atual: €${property.price?.toLocaleString()}
Quartos: ${property.bedrooms || 'N/A'}
WCs: ${property.bathrooms || 'N/A'}
Área Útil: ${property.useful_area || property.square_feet || 'N/A'} m²
Área Bruta: ${property.gross_area || 'N/A'} m²
Ano Construção: ${property.year_built || 'N/A'}
${property.year_renovated ? `Renovado: ${property.year_renovated}` : ''}
Garagem: ${property.garage || 'Não'}
Exposição Solar: ${property.sun_exposure || 'N/A'}
Certificado Energético: ${property.energy_certificate || 'N/A'}
${property.finishes ? `Acabamentos: ${property.finishes}` : ''}
${property.amenities?.length > 0 ? `Comodidades: ${property.amenities.join(', ')}` : ''}
${property.description ? `Descrição: ${property.description.substring(0, 300)}` : ''}
    `.trim();
}

function buildMarketContext(property, similarProperties) {
    if (similarProperties.length === 0) {
        return "Sem imóveis comparáveis na base de dados.";
    }

    const prices = similarProperties.map(p => p.price).filter(p => p > 0);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const activeCount = similarProperties.filter(p => p.status === 'active').length;
    const soldCount = similarProperties.filter(p => p.status === 'sold' || p.status === 'rented').length;

    return `
Total de imóveis comparáveis: ${similarProperties.length}
- Ativos: ${activeCount}
- Vendidos/Arrendados: ${soldCount}

Faixa de preços no mercado:
- Mínimo: €${minPrice.toLocaleString()}
- Média: €${avgPrice.toLocaleString()}
- Máximo: €${maxPrice.toLocaleString()}

Preço atual vs média: ${((property.price / avgPrice - 1) * 100).toFixed(1)}%

Top 3 comparáveis:
${similarProperties.slice(0, 3).map((p, i) => 
    `${i + 1}. ${p.title} - €${p.price.toLocaleString()} - ${p.bedrooms}Q, ${p.useful_area || p.square_feet}m² - ${p.status}`
).join('\n')}
    `.trim();
}