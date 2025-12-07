import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { parse as parseXML } from 'npm:fast-xml-parser@4.3.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feed_id, sync_type = 'manual' } = await req.json();
    
    const startTime = Date.now();
    
    // Get feed config
    const feeds = await base44.asServiceRole.entities.PropertyFeed.filter({ id: feed_id });
    if (!feeds || feeds.length === 0) {
      return Response.json({ error: 'Feed not found' }, { status: 404 });
    }
    const feed = feeds[0];

    // Create sync log
    const syncLog = await base44.asServiceRole.entities.FeedSyncLog.create({
      feed_id: feed.id,
      feed_name: feed.name,
      status: 'running',
      sync_type
    });

    let properties = [];
    let errors = [];

    try {
      // Fetch data from source
      const headers = feed.api_config?.headers || {};
      if (feed.api_config?.auth_type === 'api_key' && feed.api_config?.api_key) {
        headers['X-API-Key'] = feed.api_config.api_key;
      } else if (feed.api_config?.auth_type === 'bearer' && feed.api_config?.api_key) {
        headers['Authorization'] = `Bearer ${feed.api_config.api_key}`;
      }

      const response = await fetch(feed.source_url, {
        method: feed.api_config?.method || 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.text();

      // Parse data based on feed type
      if (feed.feed_type === 'xml') {
        const parser = new parseXML();
        const parsed = parser.parse(rawData);
        properties = extractPropertiesFromXML(parsed, feed.field_mapping);
      } else if (feed.feed_type === 'json') {
        const parsed = JSON.parse(rawData);
        properties = extractPropertiesFromJSON(parsed, feed.field_mapping);
      } else if (feed.feed_type === 'api') {
        const parsed = JSON.parse(rawData);
        properties = extractPropertiesFromJSON(parsed, feed.field_mapping);
      }

      // Apply filters
      if (feed.filters) {
        properties = properties.filter(p => {
          if (feed.filters.listing_type?.length && !feed.filters.listing_type.includes(p.listing_type)) return false;
          if (feed.filters.property_type?.length && !feed.filters.property_type.includes(p.property_type)) return false;
          if (feed.filters.min_price && p.price < feed.filters.min_price) return false;
          if (feed.filters.max_price && p.price > feed.filters.max_price) return false;
          return true;
        });
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;

      // Get existing properties to check for duplicates
      const existingProps = await base44.asServiceRole.entities.Property.list();

      for (const propData of properties) {
        try {
          // Add feed metadata
          propData.source_url = feed.source_url;
          propData.country = feed.country || propData.country || 'Portugal';
          
          if (!feed.auto_publish) {
            propData.visibility = 'private';
            propData.status = 'pending';
          }

          // Check for duplicates
          let existingProp = null;
          
          if (propData.external_id) {
            existingProp = existingProps.find(p => 
              p.external_id === propData.external_id && p.source_url === feed.source_url
            );
          }
          
          if (!existingProp && propData.address && propData.city) {
            existingProp = existingProps.find(p =>
              p.address?.toLowerCase() === propData.address?.toLowerCase() &&
              p.city?.toLowerCase() === propData.city?.toLowerCase() &&
              Math.abs((p.price || 0) - (propData.price || 0)) < 1000
            );
          }

          if (existingProp) {
            if (feed.duplicate_handling === 'skip') {
              skipped++;
              continue;
            } else if (feed.duplicate_handling === 'update') {
              await base44.asServiceRole.entities.Property.update(existingProp.id, propData);
              updated++;
            } else {
              await base44.asServiceRole.entities.Property.create(propData);
              created++;
            }
          } else {
            await base44.asServiceRole.entities.Property.create(propData);
            created++;
          }
        } catch (error) {
          errors.push({
            property_ref: propData.external_id || propData.title || 'Unknown',
            error: error.message
          });
        }
      }

      // Update sync log
      const duration = Math.round((Date.now() - startTime) / 1000);
      await base44.asServiceRole.entities.FeedSyncLog.update(syncLog.id, {
        status: errors.length > 0 ? 'partial' : 'success',
        properties_found: properties.length,
        properties_created: created,
        properties_updated: updated,
        properties_skipped: skipped,
        errors: errors.slice(0, 50),
        duration_seconds: duration
      });

      // Update feed
      await base44.asServiceRole.entities.PropertyFeed.update(feed.id, {
        last_sync_date: new Date().toISOString(),
        last_sync_status: errors.length > 0 ? 'partial' : 'success',
        total_imported: (feed.total_imported || 0) + created
      });

      return Response.json({
        success: true,
        sync_log_id: syncLog.id,
        summary: {
          found: properties.length,
          created,
          updated,
          skipped,
          errors: errors.length,
          duration_seconds: duration
        },
        errors: errors.slice(0, 10)
      });

    } catch (error) {
      // Update sync log with error
      await base44.asServiceRole.entities.FeedSyncLog.update(syncLog.id, {
        status: 'error',
        errors: [{ property_ref: 'Feed', error: error.message }],
        duration_seconds: Math.round((Date.now() - startTime) / 1000)
      });

      await base44.asServiceRole.entities.PropertyFeed.update(feed.id, {
        last_sync_date: new Date().toISOString(),
        last_sync_status: 'error'
      });

      return Response.json({ error: error.message }, { status: 500 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractPropertiesFromXML(data, mapping) {
  const properties = [];
  
  // Try common XML structures
  const possibleArrays = [
    data.properties?.property,
    data.property,
    data.listings?.listing,
    data.listing,
    data.items?.item,
    data.item
  ];

  let propArray = possibleArrays.find(arr => Array.isArray(arr));
  if (!propArray && typeof data === 'object') {
    propArray = [data];
  }

  if (!propArray) return properties;

  for (const item of propArray) {
    const prop = mapFields(item, mapping || getDefaultMapping());
    if (prop.title && prop.price) {
      properties.push(prop);
    }
  }

  return properties;
}

function extractPropertiesFromJSON(data, mapping) {
  const properties = [];
  
  // Try common JSON structures
  let propArray = data.properties || data.listings || data.items || data.data || data.results;
  
  if (Array.isArray(data)) {
    propArray = data;
  } else if (!propArray && typeof data === 'object') {
    propArray = [data];
  }

  if (!Array.isArray(propArray)) return properties;

  for (const item of propArray) {
    const prop = mapFields(item, mapping || getDefaultMapping());
    if (prop.title && prop.price) {
      properties.push(prop);
    }
  }

  return properties;
}

function mapFields(source, mapping) {
  const mapped = {};
  
  for (const [targetField, sourceField] of Object.entries(mapping)) {
    let value = getNestedValue(source, sourceField);
    
    // Type conversions
    if (value !== undefined && value !== null) {
      if (['price', 'bedrooms', 'bathrooms', 'square_feet', 'useful_area', 'gross_area'].includes(targetField)) {
        value = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
      } else if (targetField === 'images' && typeof value === 'string') {
        value = value.split(',').map(s => s.trim()).filter(Boolean);
      } else if (targetField === 'amenities' && typeof value === 'string') {
        value = value.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      mapped[targetField] = value;
    }
  }
  
  return mapped;
}

function getNestedValue(obj, path) {
  if (typeof path !== 'string') return path;
  
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

function getDefaultMapping() {
  return {
    external_id: 'id',
    title: 'title',
    description: 'description',
    property_type: 'type',
    listing_type: 'listing_type',
    price: 'price',
    currency: 'currency',
    bedrooms: 'bedrooms',
    bathrooms: 'bathrooms',
    square_feet: 'area',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    zip_code: 'postal_code',
    images: 'images',
    amenities: 'features'
  };
}