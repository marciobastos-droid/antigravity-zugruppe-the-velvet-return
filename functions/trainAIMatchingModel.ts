import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profile_id } = await req.json();
    
    if (!profile_id) {
      return Response.json({ error: 'profile_id is required' }, { status: 400 });
    }

    // Buscar perfil do cliente
    const profile = await base44.asServiceRole.entities.BuyerProfile.filter({ id: profile_id });
    if (!profile || profile.length === 0) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    const clientProfile = profile[0];

    // Buscar todas as interações do cliente
    const interactions = await base44.asServiceRole.entities.PropertyInteraction.filter({ 
      profile_id 
    });

    // Buscar modelo existente ou criar novo
    let existingModel = await base44.asServiceRole.entities.AIMatchingModel.filter({ profile_id });
    const hasExistingModel = existingModel && existingModel.length > 0;

    // Analisar interações com IA
    const analysisPrompt = `Analisa as interações de um cliente com imóveis e aprende os seus padrões de comportamento.

Cliente:
- Nome: ${clientProfile.buyer_name}
- Preferências declaradas: ${JSON.stringify({
  property_types: clientProfile.property_types,
  locations: clientProfile.locations,
  budget: { min: clientProfile.budget_min, max: clientProfile.budget_max },
  bedrooms_min: clientProfile.bedrooms_min,
  bathrooms_min: clientProfile.bathrooms_min,
  square_feet_min: clientProfile.square_feet_min
})}

Interações (${interactions.length}):
${interactions.map(int => `
- Tipo: ${int.interaction_type}
- Score Match: ${int.match_score}%
- Características do Imóvel: ${JSON.stringify(int.property_features)}
- Tempo gasto: ${int.time_spent_seconds || 0}s
- Data: ${int.created_date}
`).join('\n')}

Analisa:
1. Preferências implícitas (diferentes das declaradas)
2. Sensibilidade ao preço (0-1)
3. Importância de cada característica
4. Padrões de comportamento
5. Necessidades previstas que o cliente pode ter mas não declarou
6. Insights de mercado relevantes
7. Confiança da análise (0-100)

Retorna análise estruturada.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          learned_preferences: {
            type: "object",
            properties: {
              property_types: { type: "array", items: { type: "string" } },
              locations: { type: "array", items: { type: "string" } },
              price_range: { type: "object" },
              must_have_features: { type: "array", items: { type: "string" } }
            }
          },
          property_type_weights: { 
            type: "object",
            description: "Peso de cada tipo (house, apartment, etc.)"
          },
          location_preferences: { 
            type: "object",
            description: "Peso de cada localização"
          },
          price_sensitivity: { type: "number" },
          feature_importance: {
            type: "object",
            description: "Importância de cada característica (bedrooms, bathrooms, area, etc.)"
          },
          predicted_needs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                need: { type: "string" },
                confidence: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          },
          interaction_patterns: {
            type: "object",
            properties: {
              preferred_interaction_times: { type: "array", items: { type: "string" } },
              engagement_level: { type: "string" },
              decision_speed: { type: "string" }
            }
          },
          market_insights: {
            type: "object",
            properties: {
              trending_areas: { type: "array", items: { type: "string" } },
              price_trends: { type: "string" },
              recommendations: { type: "array", items: { type: "string" } }
            }
          },
          confidence_score: { type: "number" }
        }
      }
    });

    const analysis = aiResponse;

    // Criar ou atualizar modelo
    const modelData = {
      profile_id,
      learned_preferences: analysis.learned_preferences || {},
      property_type_weights: analysis.property_type_weights || {},
      location_preferences: analysis.location_preferences || {},
      price_sensitivity: analysis.price_sensitivity || 0.5,
      feature_importance: analysis.feature_importance || {},
      predicted_needs: analysis.predicted_needs || [],
      interaction_patterns: analysis.interaction_patterns || {},
      market_insights: analysis.market_insights || {},
      confidence_score: analysis.confidence_score || 0,
      last_training_date: new Date().toISOString(),
      total_interactions: interactions.length
    };

    let model;
    if (hasExistingModel) {
      model = await base44.asServiceRole.entities.AIMatchingModel.update(
        existingModel[0].id,
        modelData
      );
    } else {
      model = await base44.asServiceRole.entities.AIMatchingModel.create(modelData);
    }

    return Response.json({
      success: true,
      model,
      interactions_analyzed: interactions.length,
      confidence: analysis.confidence_score
    });

  } catch (error) {
    console.error('Error training model:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});