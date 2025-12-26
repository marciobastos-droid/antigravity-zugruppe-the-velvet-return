import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, data } = await req.json();

    // Não requer autenticação - tracking funciona para visitantes anónimos também
    
    // Determinar se o visitante é conhecido (user autenticado ou email guardado)
    let visitorIdentifier = null;
    let opportunityId = null;
    let profileId = null;

    if (data.user_email) {
      visitorIdentifier = data.user_email;
    } else if (data.guest_email) {
      visitorIdentifier = data.guest_email;
    }

    // Se tivermos um identificador, procurar oportunidade ou perfil existente
    if (visitorIdentifier) {
      try {
        // Procurar oportunidade existente
        const opportunities = await base44.asServiceRole.entities.Opportunity.filter({
          buyer_email: visitorIdentifier
        });

        if (opportunities.length > 0) {
          opportunityId = opportunities[0].id;
          
          // Atualizar engagement
          await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
            last_engagement_date: new Date().toISOString(),
            engagement_score: (opportunities[0].engagement_score || 0) + 1
          });
        }

        // Procurar perfil de cliente
        const profiles = await base44.asServiceRole.entities.BuyerProfile.filter({
          buyer_email: visitorIdentifier
        });

        if (profiles.length > 0) {
          profileId = profiles[0].id;
        }
      } catch (error) {
        console.error('Error finding opportunity/profile:', error);
      }
    }

    // Registar atividade baseada no tipo de ação
    if (action === 'page_view') {
      // Registar visualização de página
      if (data.page_type === 'property' && data.page_id) {
        // Registar visualização de imóvel
        try {
          await base44.asServiceRole.entities.PropertyViewHistory.create({
            property_id: data.page_id,
            viewer_email: visitorIdentifier || 'anonymous',
            viewer_name: data.user_name || null,
            session_id: data.session_id,
            referrer: data.referrer || null,
            device_type: getDeviceType(data.user_agent),
            is_authenticated: data.is_authenticated || false,
            opportunity_id: opportunityId,
            profile_id: profileId
          });

          // Se houver interação com imóvel, registar
          if (profileId && data.page_id) {
            const existing = await base44.asServiceRole.entities.PropertyInteraction.filter({
              profile_id: profileId,
              property_id: data.page_id
            });

            if (existing.length === 0) {
              await base44.asServiceRole.entities.PropertyInteraction.create({
                profile_id: profileId,
                property_id: data.page_id,
                interaction_type: 'viewed',
                time_spent_seconds: 0
              });
            }
          }
        } catch (error) {
          console.error('Error tracking property view:', error);
        }
      }

      // Adicionar nota rápida à oportunidade sobre a visita
      if (opportunityId && data.page_type === 'property') {
        try {
          const opportunity = await base44.asServiceRole.entities.Opportunity.read(opportunityId);
          const quickNotes = opportunity.quick_notes || [];
          
          quickNotes.push({
            text: `🔍 Visitou: ${data.page_title || 'Página do website'}`,
            date: new Date().toISOString(),
            by: 'system'
          });

          await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
            quick_notes: quickNotes.slice(-20) // Manter apenas últimas 20 notas
          });
        } catch (error) {
          console.error('Error adding quick note:', error);
        }
      }
    } else if (action === 'time_spent' && data.time_spent_seconds > 10) {
      // Registar tempo gasto - aumenta engagement score
      if (opportunityId) {
        try {
          const opportunity = await base44.asServiceRole.entities.Opportunity.read(opportunityId);
          const currentScore = opportunity.engagement_score || 0;
          
          // Cada minuto de tempo = +2 pontos de engagement
          const scoreIncrease = Math.min(Math.floor(data.time_spent_seconds / 30), 10);
          
          await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
            engagement_score: currentScore + scoreIncrease
          });
        } catch (error) {
          console.error('Error updating engagement:', error);
        }
      }

      // Atualizar tempo gasto em PropertyInteraction
      if (profileId && data.page_id) {
        try {
          const interactions = await base44.asServiceRole.entities.PropertyInteraction.filter({
            profile_id: profileId,
            property_id: data.page_id
          });

          if (interactions.length > 0) {
            const current = interactions[0].time_spent_seconds || 0;
            await base44.asServiceRole.entities.PropertyInteraction.update(interactions[0].id, {
              time_spent_seconds: current + data.time_spent_seconds
            });
          }
        } catch (error) {
          console.error('Error updating interaction time:', error);
        }
      }
    } else if (action === 'contact_form_opened') {
      // Utilizador abriu formulário de contacto - forte indicador de interesse
      if (opportunityId) {
        try {
          const opportunity = await base44.asServiceRole.entities.Opportunity.read(opportunityId);
          const quickNotes = opportunity.quick_notes || [];
          
          quickNotes.push({
            text: `📝 Abriu formulário de contacto em: ${data.page_title || 'Website'}`,
            date: new Date().toISOString(),
            by: 'system'
          });

          await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
            quick_notes: quickNotes.slice(-20),
            engagement_score: (opportunity.engagement_score || 0) + 5
          });
        } catch (error) {
          console.error('Error tracking form open:', error);
        }
      }
    } else if (action === 'favorite_added' && data.property_id) {
      // Adicionou imóvel aos favoritos
      if (opportunityId) {
        try {
          const opportunity = await base44.asServiceRole.entities.Opportunity.read(opportunityId);
          const quickNotes = opportunity.quick_notes || [];
          
          quickNotes.push({
            text: `❤️ Adicionou aos favoritos: ${data.property_title || 'Imóvel'}`,
            date: new Date().toISOString(),
            by: 'system'
          });

          await base44.asServiceRole.entities.Opportunity.update(opportunityId, {
            quick_notes: quickNotes.slice(-20),
            engagement_score: (opportunity.engagement_score || 0) + 10
          });
        } catch (error) {
          console.error('Error tracking favorite:', error);
        }
      }

      // Registar interesse forte
      if (profileId) {
        try {
          const interactions = await base44.asServiceRole.entities.PropertyInteraction.filter({
            profile_id: profileId,
            property_id: data.property_id
          });

          if (interactions.length > 0) {
            await base44.asServiceRole.entities.PropertyInteraction.update(interactions[0].id, {
              interaction_type: 'shortlisted'
            });
          } else {
            await base44.asServiceRole.entities.PropertyInteraction.create({
              profile_id: profileId,
              property_id: data.property_id,
              interaction_type: 'shortlisted'
            });
          }
        } catch (error) {
          console.error('Error tracking favorite interaction:', error);
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    // Não falhar - tracking é não-crítico
    return Response.json({ success: false, error: error.message });
  }
});

function getDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}