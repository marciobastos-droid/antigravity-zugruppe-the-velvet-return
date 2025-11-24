import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Função para calcular score de match
function calculateMatchScore(profile, property) {
  let score = 0;
  let maxScore = 0;

  // Property type match - PRIORIDADE MÁXIMA (40 pontos)
  if (profile.property_types?.length > 0) {
    maxScore += 40;
    if (profile.property_types.includes(property.property_type)) {
      score += 40;
    } else {
      // Se o tipo não corresponde, retorna 0 imediatamente
      return 0;
    }
  }

  // Price match (25 pontos)
  if (profile.budget_min || profile.budget_max) {
    maxScore += 25;
    const inBudget = 
      (!profile.budget_min || property.price >= profile.budget_min) &&
      (!profile.budget_max || property.price <= profile.budget_max);
    
    if (inBudget) {
      score += 25;
    }
  }

  // Location match (20 pontos)
  if (profile.locations?.length > 0) {
    maxScore += 20;
    const locationMatch = profile.locations.some(loc => 
      property.city?.toLowerCase().includes(loc.toLowerCase()) ||
      property.address?.toLowerCase().includes(loc.toLowerCase())
    );
    if (locationMatch) {
      score += 20;
    }
  }

  // Bedrooms (10 pontos)
  if (profile.bedrooms_min) {
    maxScore += 10;
    if (property.bedrooms >= profile.bedrooms_min) {
      score += 10;
    }
  }

  // Area (10 pontos)
  if (profile.square_feet_min) {
    maxScore += 10;
    const propertyArea = property.useful_area || property.gross_area || property.square_feet;
    if (propertyArea >= profile.square_feet_min) {
      score += 10;
    }
  }

  // Listing type (5 pontos)
  if (profile.listing_type && profile.listing_type !== 'both') {
    maxScore += 5;
    if (property.listing_type === profile.listing_type) {
      score += 5;
    }
  }

  const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return finalScore;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active profiles and properties
    const profiles = await base44.asServiceRole.entities.BuyerProfile.filter({ status: 'active' });
    const properties = await base44.asServiceRole.entities.Property.filter({ status: 'active' });
    
    let totalMatches = 0;
    let notificationsCreated = 0;
    const results = [];

    for (const profile of profiles) {
      const matches = [];
      
      // Filter properties by basic criteria
      for (const property of properties) {
        // Skip if listing types don't match
        if (profile.listing_type !== 'both' && property.listing_type !== profile.listing_type) {
          continue;
        }

        const score = calculateMatchScore(profile, property);
        
        // Only consider matches with score >= 70%
        if (score >= 70) {
          matches.push({
            property_id: property.id,
            property_title: property.title,
            score: score
          });
        }
      }

      if (matches.length > 0) {
        totalMatches += matches.length;
        
        // Update profile with last match date
        await base44.asServiceRole.entities.BuyerProfile.update(profile.id, {
          last_match_date: new Date().toISOString()
        });

        // Create notification for profile owner or assigned agent
        const recipientEmail = profile.assigned_agent || profile.created_by;
        if (recipientEmail) {
          await base44.asServiceRole.entities.Notification.create({
            title: `${matches.length} Novo(s) Match(es) para ${profile.buyer_name}`,
            message: `Encontrámos ${matches.length} propriedade(s) que correspondem às preferências do cliente ${profile.buyer_name}.`,
            type: 'lead',
            priority: matches.length >= 5 ? 'high' : 'medium',
            user_email: recipientEmail,
            related_type: 'BuyerProfile',
            related_id: profile.id,
            action_url: '/ClientPreferences',
            metadata: {
              profile_id: profile.id,
              matches_count: matches.length,
              top_matches: matches.slice(0, 3)
            }
          });
          notificationsCreated++;
        }

        results.push({
          profile_id: profile.id,
          profile_name: profile.buyer_name,
          matches_count: matches.length
        });
      }
    }

    return Response.json({
      success: true,
      total_profiles: profiles.length,
      profiles_with_matches: results.length,
      total_matches: totalMatches,
      notifications_created: notificationsCreated,
      results: results
    });

  } catch (error) {
    console.error('Error processing matches:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});