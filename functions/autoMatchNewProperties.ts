import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get request body - can be called with specific property or check all recent
    const body = await req.json().catch(() => ({}));
    const { property_id, check_all_recent } = body;

    // Fetch all necessary data
    const [properties, contacts, opportunities] = await Promise.all([
      base44.asServiceRole.entities.Property.list('-created_date'),
      base44.asServiceRole.entities.ClientContact.list(),
      base44.asServiceRole.entities.Opportunity.list()
    ]);

    // Determine which properties to check
    let propertiesToCheck = [];
    
    if (property_id) {
      // Check specific property
      const property = properties.find(p => p.id === property_id);
      if (property && property.status === 'active') {
        propertiesToCheck = [property];
      }
    } else if (check_all_recent) {
      // Check properties created in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      propertiesToCheck = properties.filter(p => 
        p.status === 'active' && 
        new Date(p.created_date) > oneDayAgo
      );
    } else {
      // Check properties created in the last hour (for scheduled runs)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      propertiesToCheck = properties.filter(p => 
        p.status === 'active' && 
        new Date(p.created_date) > oneHourAgo
      );
    }

    if (propertiesToCheck.length === 0) {
      return Response.json({ 
        success: true, 
        message: "No new properties to check",
        matches: [] 
      });
    }

    const allMatches = [];
    const notificationsCreated = [];
    const emailsDrafted = [];

    // Get contacts with property requirements
    const contactsWithRequirements = contacts.filter(c => {
      const req = c.property_requirements;
      return req && (req.budget_min || req.budget_max || req.locations?.length || req.property_types?.length);
    });

    // Get buyer-type opportunities
    const buyerOpportunities = opportunities.filter(o => 
      o.lead_type === 'comprador' || o.lead_type === 'parceiro_comprador'
    );

    for (const property of propertiesToCheck) {
      // Match against contacts
      for (const contact of contactsWithRequirements) {
        const matchResult = calculateMatch(property, contact.property_requirements);
        
        if (matchResult.score >= 60) {
          allMatches.push({
            type: 'contact',
            contact_id: contact.id,
            contact_name: contact.full_name,
            contact_email: contact.email,
            property_id: property.id,
            property_title: property.title,
            score: matchResult.score,
            match_details: matchResult.details,
            assigned_agent: contact.assigned_agent
          });

          // Create notification for assigned agent
          if (contact.assigned_agent) {
            const notification = await base44.asServiceRole.entities.Notification.create({
              title: `🎯 Match encontrado: ${contact.full_name}`,
              message: `O imóvel "${property.title}" corresponde ${matchResult.score}% aos requisitos de ${contact.full_name}. ${matchResult.summary}`,
              type: 'lead',
              priority: matchResult.score >= 80 ? 'high' : 'medium',
              related_id: contact.id,
              related_type: 'ClientContact',
              user_email: contact.assigned_agent,
              action_url: `/ClientDatabase?contact=${contact.id}`,
              metadata: {
                property_id: property.id,
                match_score: matchResult.score
              }
            });
            notificationsCreated.push(notification);
          }

          // Draft personalized email if score is high
          if (matchResult.score >= 70 && contact.email) {
            const emailDraft = await generatePersonalizedEmail(base44, property, contact, matchResult);
            emailsDrafted.push(emailDraft);
          }
        }
      }

      // Match against opportunities
      for (const opp of buyerOpportunities) {
        const oppRequirements = {
          budget_max: opp.budget,
          locations: opp.location ? [opp.location] : [],
          property_types: opp.property_type_interest ? [opp.property_type_interest] : []
        };

        const matchResult = calculateMatch(property, oppRequirements);
        
        if (matchResult.score >= 50) {
          allMatches.push({
            type: 'opportunity',
            opportunity_id: opp.id,
            contact_name: opp.buyer_name,
            contact_email: opp.buyer_email,
            property_id: property.id,
            property_title: property.title,
            score: matchResult.score,
            match_details: matchResult.details,
            assigned_agent: opp.assigned_to
          });

          // Create notification
          if (opp.assigned_to) {
            const notification = await base44.asServiceRole.entities.Notification.create({
              title: `🎯 Match para lead: ${opp.buyer_name}`,
              message: `O novo imóvel "${property.title}" pode interessar ao lead ${opp.buyer_name} (${matchResult.score}% match).`,
              type: 'opportunity',
              priority: matchResult.score >= 70 ? 'high' : 'medium',
              related_id: opp.id,
              related_type: 'Opportunity',
              user_email: opp.assigned_to,
              action_url: `/Opportunities?lead=${opp.id}`,
              metadata: {
                property_id: property.id,
                match_score: matchResult.score
              }
            });
            notificationsCreated.push(notification);
          }
        }
      }
    }

    return Response.json({
      success: true,
      properties_checked: propertiesToCheck.length,
      total_matches: allMatches.length,
      notifications_created: notificationsCreated.length,
      emails_drafted: emailsDrafted.length,
      matches: allMatches,
      emails: emailsDrafted
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateMatch(property, requirements) {
  if (!requirements) return { score: 0, details: {}, summary: "" };

  const details = {};
  let totalWeight = 0;
  let weightedScore = 0;

  // Location match (weight: 30)
  if (requirements.locations?.length > 0) {
    const locationMatch = requirements.locations.some(loc => 
      property.city?.toLowerCase().includes(loc.toLowerCase()) ||
      loc.toLowerCase().includes(property.city?.toLowerCase() || '')
    );
    details.location = locationMatch ? 100 : 0;
    weightedScore += (locationMatch ? 100 : 0) * 30;
    totalWeight += 30;
  }

  // Price match (weight: 25)
  if (requirements.budget_max || requirements.budget_min) {
    let priceScore = 100;
    if (requirements.budget_max && property.price > requirements.budget_max) {
      const overBudget = (property.price - requirements.budget_max) / requirements.budget_max;
      priceScore = Math.max(0, 100 - overBudget * 200);
    }
    if (requirements.budget_min && property.price < requirements.budget_min * 0.7) {
      priceScore = Math.max(0, priceScore - 30);
    }
    details.price = Math.round(priceScore);
    weightedScore += priceScore * 25;
    totalWeight += 25;
  }

  // Property type match (weight: 20)
  if (requirements.property_types?.length > 0) {
    const typeMatch = requirements.property_types.includes(property.property_type);
    details.property_type = typeMatch ? 100 : 0;
    weightedScore += (typeMatch ? 100 : 0) * 20;
    totalWeight += 20;
  }

  // Bedrooms match (weight: 15)
  if (requirements.bedrooms_min || requirements.bedrooms_max) {
    let bedroomScore = 100;
    if (requirements.bedrooms_min && property.bedrooms < requirements.bedrooms_min) {
      bedroomScore = property.bedrooms === requirements.bedrooms_min - 1 ? 70 : 30;
    }
    if (requirements.bedrooms_max && property.bedrooms > requirements.bedrooms_max) {
      bedroomScore = Math.min(bedroomScore, 80);
    }
    details.bedrooms = bedroomScore;
    weightedScore += bedroomScore * 15;
    totalWeight += 15;
  }

  // Area match (weight: 10)
  if (requirements.area_min || requirements.area_max) {
    const propArea = property.useful_area || property.square_feet || 0;
    let areaScore = 100;
    if (requirements.area_min && propArea < requirements.area_min) {
      const diff = (requirements.area_min - propArea) / requirements.area_min;
      areaScore = Math.max(0, 100 - diff * 150);
    }
    details.area = Math.round(areaScore);
    weightedScore += areaScore * 10;
    totalWeight += 10;
  }

  const finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  // Generate summary
  const summaryParts = [];
  if (details.location === 100) summaryParts.push("localização perfeita");
  if (details.price >= 90) summaryParts.push("dentro do orçamento");
  if (details.property_type === 100) summaryParts.push("tipo de imóvel ideal");
  if (details.bedrooms >= 90) summaryParts.push("tipologia adequada");

  return {
    score: finalScore,
    details,
    summary: summaryParts.length > 0 ? `Match: ${summaryParts.join(", ")}.` : ""
  };
}

async function generatePersonalizedEmail(base44, property, contact, matchResult) {
  try {
    const emailContent = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Gera um email personalizado em português de Portugal para apresentar um imóvel a um cliente.

DADOS DO CLIENTE:
- Nome: ${contact.full_name}
- Requisitos: ${JSON.stringify(contact.property_requirements)}

DADOS DO IMÓVEL:
- Título: ${property.title}
- Preço: €${property.price?.toLocaleString()}
- Localização: ${property.city}, ${property.address || ''}
- Tipologia: T${property.bedrooms || 0}
- Área: ${property.useful_area || property.square_feet || 'N/A'}m²
- Tipo: ${property.property_type}

MATCH SCORE: ${matchResult.score}%
DESTAQUES DO MATCH: ${matchResult.summary}

Gera um email curto, profissional e personalizado. Menciona especificamente porque este imóvel corresponde aos requisitos do cliente. Não inclui assinatura.`,
      response_json_schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" }
        }
      }
    });

    return {
      contact_id: contact.id,
      contact_name: contact.full_name,
      contact_email: contact.email,
      property_id: property.id,
      property_title: property.title,
      match_score: matchResult.score,
      email_subject: emailContent.subject,
      email_body: emailContent.body,
      status: 'draft'
    };
  } catch (e) {
    return {
      contact_id: contact.id,
      contact_email: contact.email,
      property_id: property.id,
      error: e.message
    };
  }
}