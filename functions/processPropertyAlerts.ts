import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all saved searches with alerts enabled
    const savedSearches = await base44.asServiceRole.entities.SavedSearchCriteria.filter({ 
      alerts_enabled: true 
    });

    if (savedSearches.length === 0) {
      return Response.json({ message: "No active alerts", processed: 0 });
    }

    // Get all active properties
    const properties = await base44.asServiceRole.entities.Property.filter({ status: 'active' });
    
    // Get all property feedback to exclude rejected properties
    const allFeedback = await base44.asServiceRole.entities.PropertyFeedback.list();
    
    const now = new Date();
    let emailsSent = 0;

    for (const search of savedSearches) {
      // Check frequency
      const lastAlert = search.last_alert_date ? new Date(search.last_alert_date) : null;
      
      if (lastAlert) {
        const hoursSinceLastAlert = (now - lastAlert) / (1000 * 60 * 60);
        
        if (search.alert_frequency === 'daily' && hoursSinceLastAlert < 24) continue;
        if (search.alert_frequency === 'weekly' && hoursSinceLastAlert < 168) continue;
      }

      // Get rejected properties for this contact
      const rejectedIds = allFeedback
        .filter(f => f.contact_id === search.contact_id && f.feedback_type === 'rejected')
        .map(f => f.property_id);

      // Filter properties based on criteria
      const criteria = search.criteria;
      const sentIds = search.matched_properties_sent || [];
      
      const matchingProperties = properties.filter(p => {
        // Skip already sent or rejected
        if (sentIds.includes(p.id) || rejectedIds.includes(p.id)) return false;
        
        // Listing type match
        if (criteria.listing_type && p.listing_type !== criteria.listing_type) return false;
        
        // Property type match
        if (criteria.property_types?.length > 0 && !criteria.property_types.includes(p.property_type)) return false;
        
        // City match
        if (criteria.cities?.length > 0) {
          const cityMatch = criteria.cities.some(city => 
            p.city?.toLowerCase().includes(city.toLowerCase())
          );
          if (!cityMatch) return false;
        }
        
        // Price match
        const price = p.price || 0;
        if (criteria.priceMin && price < parseFloat(criteria.priceMin)) return false;
        if (criteria.priceMax && price > parseFloat(criteria.priceMax)) return false;
        
        // Bedrooms match
        const beds = p.bedrooms || 0;
        if (criteria.bedroomsMin && beds < parseInt(criteria.bedroomsMin)) return false;
        if (criteria.bedroomsMax && beds > parseInt(criteria.bedroomsMax)) return false;
        
        // Area match
        const area = p.useful_area || p.square_feet || 0;
        if (criteria.areaMin && area < parseInt(criteria.areaMin)) return false;
        
        return true;
      });

      // If there are new matching properties, send email
      if (matchingProperties.length > 0 && search.contact_email) {
        const propertyList = matchingProperties.slice(0, 5).map(p => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 ${p.title}

• Localização: ${p.city}${p.address ? `, ${p.address}` : ''}
• Preço: €${p.price?.toLocaleString()}${p.listing_type === 'rent' ? '/mês' : ''}
• Tipologia: ${p.bedrooms ? `T${p.bedrooms}` : 'N/A'} | ${p.bathrooms || 'N/A'} WC
• Área: ${p.useful_area || p.square_feet || 'N/A'}m²
        `).join('\n');

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: search.contact_email,
            subject: `🔔 ${matchingProperties.length} novo(s) imóvel(is) para "${search.name}"`,
            body: `
Olá ${search.contact_name || 'Cliente'},

Encontrámos ${matchingProperties.length} novo(s) imóvel(is) que correspondem à sua pesquisa "${search.name}":

${propertyList}

${matchingProperties.length > 5 ? `\n... e mais ${matchingProperties.length - 5} imóveis.\n` : ''}

Entre em contacto connosco para mais informações ou para agendar uma visita.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para desativar estes alertas, contacte o seu consultor.

Cumprimentos,
Zugruppe - Privileged Approach
            `
          });

          // Update the saved search with sent property IDs
          await base44.asServiceRole.entities.SavedSearchCriteria.update(search.id, {
            last_alert_date: now.toISOString(),
            matched_properties_sent: [...sentIds, ...matchingProperties.map(p => p.id)]
          });

          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email for search ${search.id}:`, emailError);
        }
      }
    }

    return Response.json({ 
      message: "Alerts processed successfully",
      processed: savedSearches.length,
      emailsSent
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});