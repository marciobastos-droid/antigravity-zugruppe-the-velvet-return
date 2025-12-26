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
    const allProperties = await base44.asServiceRole.entities.Property.filter({ status: 'active' });
    const properties = Array.isArray(allProperties) ? allProperties : [];

    if (properties.length === 0) {
      return Response.json({
        success: true,
        recommendations: [],
        summary: { traditional_matches: 0, ai_predictions: 0, avg_confidence: 0 },
        model_used: !!aiModel,
        model_confidence: aiModel?.confidence_score || 0,
        total_properties_analyzed: 0,
        message: 'Nenhuma propriedade ativa disponível'
      });
    }

    // Buscar interações anteriores
    const allInteractions = await base44.asServiceRole.entities.PropertyInteraction.filter({ profile_id });
    const interactions = Array.isArray(allInteractions) ? allInteractions : [];
    const viewedPropertyIds = interactions.map(i => i.property_id);

    // Preparar propriedades não vistas
    const unseenProperties = properties.filter(p => !viewedPropertyIds.includes(p.id));

    // Filtrar propriedades que cumprem requisitos básicos obrigatórios
    const matchingProperties = unseenProperties.filter(p => {
      // 1. Tipo de negócio (OBRIGATÓRIO)
      if (profile.listing_type && p.listing_type !== profile.listing_type) {
        return false;
      }

      // 2. Orçamento (OBRIGATÓRIO se definido)
      if (profile.budget_min && p.price < profile.budget_min) {
        return false;
      }
      if (profile.budget_max && p.price > profile.budget_max) {
        return false;
      }

      // 3. Tipo de propriedade (OBRIGATÓRIO se definido)
      if (profile.property_types?.length > 0) {
        if (!profile.property_types.includes(p.property_type)) {
          return false;
        }
      }

      // 4. Localização (OBRIGATÓRIO se definido)
      if (profile.locations?.length > 0) {
        const hasMatchingLocation = profile.locations.some(loc => {
          const locLower = loc.toLowerCase();
          return p.city?.toLowerCase().includes(locLower) || 
                 p.state?.toLowerCase().includes(locLower) ||
                 locLower.includes(p.city?.toLowerCase()) ||
                 locLower.includes(p.state?.toLowerCase());
        });
        if (!hasMatchingLocation) {
          return false;
        }
      }

      // 5. Quartos mínimos (OBRIGATÓRIO se definido)
      if (profile.bedrooms_min && p.bedrooms < profile.bedrooms_min) {
        return false;
      }

      // 6. Casas de banho mínimas (OBRIGATÓRIO se definido)
      if (profile.bathrooms_min && p.bathrooms < profile.bathrooms_min) {
        return false;
      }

      // 7. Área mínima (OBRIGATÓRIO se definido)
      if (profile.square_feet_min) {
        const propertyArea = p.useful_area || p.square_feet || 0;
        if (propertyArea < profile.square_feet_min) {
          return false;
        }
      }

      return true;
    });

    // Se não há propriedades que cumprem requisitos, retornar vazio
    if (matchingProperties.length === 0) {
      return Response.json({
        success: true,
        recommendations: [],
        summary: {
          traditional_matches: 0,
          ai_predictions: 0,
          avg_confidence: 0
        },
        model_used: !!aiModel,
        model_confidence: aiModel?.confidence_score || 0,
        total_properties_analyzed: unseenProperties.length,
        filtered_count: matchingProperties.length,
        message: 'Nenhum imóvel corresponde aos requisitos obrigatórios do cliente'
      });
    }

    // Usar IA para ranquear APENAS propriedades que cumprem requisitos
    const prompt = `És um sistema avançado de recomendação de imóveis. 

IMPORTANTE: Todos os imóveis abaixo JÁ FORAM PRÉ-FILTRADOS e cumprem os requisitos OBRIGATÓRIOS do cliente:
- Tipo de negócio: ${profile.listing_type || 'qualquer'}
- Orçamento: €${profile.budget_min || 0} - €${profile.budget_max || '∞'}
- Tipos aceites: ${profile.property_types?.join(', ') || 'todos'}
- Localizações: ${profile.locations?.join(', ') || 'qualquer'}
- Mínimo ${profile.bedrooms_min || 0} quartos
- Mínimo ${profile.bathrooms_min || 0} WCs
- Área mínima: ${profile.square_feet_min || 0}m²

Cliente: ${profile.buyer_name}
Comodidades Desejadas: ${profile.desired_amenities?.join(', ') || 'não especificadas'}
Notas Adicionais: ${profile.additional_notes || 'nenhuma'}

${aiModel ? `Modelo de IA (Confiança: ${aiModel.confidence_score}%):
- Preferências Aprendidas: ${JSON.stringify(aiModel.learned_preferences)}
- Necessidades Previstas: ${JSON.stringify(aiModel.predicted_needs)}
- Importância de Características: ${JSON.stringify(aiModel.feature_importance)}
- Sensibilidade ao Preço: ${aiModel.price_sensitivity}
` : 'Modelo de IA: Não disponível (sem interações suficientes)'}

Imóveis que CUMPREM todos os requisitos (${matchingProperties.length}):
${matchingProperties.slice(0, 50).map(p => `
ID: ${p.id}
Título: ${p.title}
Tipo: ${p.property_type} (✓ cumpre requisito)
Localização: ${p.city}, ${p.state} (✓ cumpre requisito)
Preço: €${p.price?.toLocaleString()} (✓ dentro do orçamento)
Quartos: ${p.bedrooms} (✓ cumpre mínimo)
WCs: ${p.bathrooms} (✓ cumpre mínimo)
Área: ${p.useful_area || p.square_feet}m² (✓ cumpre mínimo)
Comodidades: ${p.amenities?.slice(0, 8).join(', ') || 'não especificadas'}
Certificado Energético: ${p.energy_certificate || 'N/A'}
${p.description ? `Descrição: ${p.description.substring(0, 200)}...` : ''}
`).join('\n---\n')}

TAREFA: Rankeia estes imóveis (todos já validados) de 1-10 baseado em:
1. Comodidades desejadas pelo cliente
2. Qualidade e estado do imóvel
3. Valor pelo dinheiro
4. Características adicionais que podem agradar
${aiModel ? '5. Padrões aprendidos do modelo IA' : ''}

REGRAS CRÍTICAS:
- Todos os imóveis listados JÁ cumprem os requisitos básicos
- NÃO sugiras imóveis fora do orçamento, tipo errado, ou localização errada
- Foca em diferenciar pela qualidade, comodidades e valor
- Se houver comodidades desejadas, prioriza imóveis que as tenham

Retorna as top 10 recomendações ordenadas por score (100 = match perfeito).`;

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
      total_properties_analyzed: unseenProperties.length,
      filtered_count: matchingProperties.length,
      requirements_applied: {
        listing_type: profile.listing_type,
        budget_range: `€${profile.budget_min || 0} - €${profile.budget_max || '∞'}`,
        property_types: profile.property_types,
        locations: profile.locations,
        min_bedrooms: profile.bedrooms_min,
        min_bathrooms: profile.bathrooms_min,
        min_area: profile.square_feet_min
      }
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});