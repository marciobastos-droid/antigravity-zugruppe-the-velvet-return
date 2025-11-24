import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id, include_predictions = true } = await req.json();
    
    if (!profile_id) {
      return Response.json({ error: 'profile_id is required' }, { status: 400 });
    }

    // Buscar perfil
    const profiles = await base44.asServiceRole.entities.BuyerProfile.filter({ id: profile_id });
    if (!profiles || profiles.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const profile = profiles[0];

    // Buscar modelo de IA
    const models = await base44.asServiceRole.entities.AIMatchingModel.filter({ profile_id });
    const aiModel = models && models.length > 0 ? models[0] : null;

    // Buscar propriedades ativas
    const properties = await base44.asServiceRole.entities.Property.filter({ status: 'active' });

    // Buscar interações anteriores
    const interactions = await base44.asServiceRole.entities.PropertyInteraction.filter({ profile_id });
    const viewedPropertyIds = interactions.map(i => i.property_id);

    // Preparar propriedades não vistas
    const unseenProperties = properties.filter(p => !viewedPropertyIds.includes(p.id));

    // Usar IA para ranquear e recomendar
    const prompt = `És um sistema avançado de recomendação de imóveis. Analisa o perfil do cliente, o modelo de aprendizagem (se disponível), e recomenda os melhores imóveis.

Cliente: ${profile.buyer_name}
Preferências Declaradas:
${JSON.stringify({
  property_types: profile.property_types,
  locations: profile.locations,
  budget_min: profile.budget_min,
  budget_max: profile.budget_max,
  bedrooms_min: profile.bedrooms_min,
  listing_type: profile.listing_type
}, null, 2)}

${aiModel ? `Modelo de IA (Confiança: ${aiModel.confidence_score}%):
- Preferências Aprendidas: ${JSON.stringify(aiModel.learned_preferences)}
- Necessidades Previstas: ${JSON.stringify(aiModel.predicted_needs)}
- Importância de Características: ${JSON.stringify(aiModel.feature_importance)}
- Sensibilidade ao Preço: ${aiModel.price_sensitivity}
- Insights de Mercado: ${JSON.stringify(aiModel.market_insights)}
` : 'Modelo de IA: Não disponível (sem interações suficientes)'}

Imóveis Disponíveis (${unseenProperties.length}):
${unseenProperties.slice(0, 50).map(p => `
ID: ${p.id}
Título: ${p.title}
Tipo: ${p.property_type}
Localização: ${p.city}, ${p.state}
Preço: €${p.price}
Quartos: ${p.bedrooms}
WCs: ${p.bathrooms}
Área: ${p.useful_area || p.square_feet}m²
Comodidades: ${p.amenities?.join(', ')}
`).join('\n---\n')}

${include_predictions ? `
TAREFA ESPECIAL: Identifica imóveis que o cliente pode gostar mas que NÃO correspondem exatamente às suas preferências declaradas, baseando-te em:
1. Padrões do modelo de IA
2. Necessidades previstas
3. Tendências de mercado
4. Características ocultas que podem interessar
` : ''}

Retorna:
1. Top 10 recomendações com scores
2. Para cada uma: razão da recomendação, se é "tradicional" ou "predictive"
3. Destaca quais NÃO correspondem exatamente às preferências mas são recomendadas pela IA`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                property_id: { type: "string" },
                score: { type: "number" },
                match_type: { 
                  type: "string",
                  enum: ["traditional", "ai_predicted", "market_trend"]
                },
                reasoning: { type: "string" },
                key_features: { type: "array", items: { type: "string" } },
                predicted_appeal: { type: "string" }
              }
            }
          },
          summary: {
            type: "object",
            properties: {
              traditional_matches: { type: "number" },
              ai_predictions: { type: "number" },
              avg_confidence: { type: "number" }
            }
          }
        }
      }
    });

    // Enriquecer recomendações com dados completos
    const enrichedRecommendations = aiResponse.recommendations.map(rec => {
      const property = unseenProperties.find(p => p.id === rec.property_id);
      return {
        ...rec,
        property
      };
    }).filter(rec => rec.property); // Remover se propriedade não encontrada

    return Response.json({
      success: true,
      recommendations: enrichedRecommendations,
      summary: aiResponse.summary,
      model_used: !!aiModel,
      model_confidence: aiModel?.confidence_score || 0,
      total_properties_analyzed: unseenProperties.length
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});