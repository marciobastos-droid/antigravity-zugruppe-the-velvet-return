import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { property, performance } = await req.json();

    // Analyze property and performance data using AI
    const analysisPrompt = `
Analise a performance deste anúncio imobiliário e forneça sugestões de otimização:

IMÓVEL:
- Título: ${property.title}
- Tipo: ${property.property_type}
- Negócio: ${property.listing_type}
- Preço: €${property.price}
- Quartos: ${property.bedrooms || 0}
- Casas de Banho: ${property.bathrooms || 0}
- Área: ${property.useful_area || 0}m²
- Localização: ${property.city}
- Número de Fotos: ${property.images}
- Tags: ${property.tags.join(', ') || 'Nenhuma'}
- Descrição: ${property.description?.substring(0, 200) || 'Sem descrição'}

PERFORMANCE:
- Visualizações: ${performance.views}
- Cliques: ${performance.clicks}
- Pedidos de Informação: ${performance.inquiries}
- CTR: ${performance.ctr}%
- Taxa de Conversão: ${performance.conversionRate}%
- Performance Média: ${performance.avgPerformance}/100

Com base nestes dados, identifique problemas e sugira melhorias CONCRETAS e ACIONÁVEIS.
Foque em:
1. Preço (se está acima/abaixo do mercado)
2. Descrição (se é atrativa e completa)
3. Fotos (quantidade e qualidade)
4. Título (se é cativante)
5. Tags e palavras-chave

Responda APENAS em JSON com este formato:
{
  "suggestions": [
    {
      "type": "price|description|images|tags|title",
      "priority": "high|medium|low",
      "title": "Título curto da sugestão",
      "reason": "Explicação do problema identificado",
      "current_value": "Valor atual",
      "suggested_value": "Valor ou conteúdo sugerido",
      "expected_impact": "Descrição breve do impacto esperado"
    }
  ]
}

Limite a 5 sugestões mais importantes. Seja específico e prático.
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                priority: { type: "string" },
                title: { type: "string" },
                reason: { type: "string" },
                current_value: { type: "string" },
                suggested_value: {},
                expected_impact: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      suggestions: result.suggestions || []
    });

  } catch (error) {
    console.error('Error analyzing property:', error);
    return Response.json({ 
      error: error.message,
      suggestions: []
    }, { status: 500 });
  }
});