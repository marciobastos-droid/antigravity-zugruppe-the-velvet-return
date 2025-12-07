import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// This function should be called by a cron job (e.g., via GitHub Actions or external scheduler)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active feeds
    const feeds = await base44.asServiceRole.entities.PropertyFeed.filter({ is_active: true });
    
    const results = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    for (const feed of feeds) {
      let shouldSync = false;
      
      // Check sync frequency
      if (feed.sync_frequency === 'hourly') {
        shouldSync = true;
      } else if (feed.sync_frequency === 'daily' && currentHour === 2) {
        shouldSync = true;
      } else if (feed.sync_frequency === 'weekly' && now.getDay() === 1 && currentHour === 2) {
        shouldSync = true;
      }
      
      if (shouldSync) {
        try {
          // Call sync function
          const syncResponse = await base44.asServiceRole.functions.invoke('syncPropertyFeed', {
            feed_id: feed.id,
            sync_type: 'scheduled'
          });
          
          results.push({
            feed_id: feed.id,
            feed_name: feed.name,
            status: 'success',
            result: syncResponse.data
          });
        } catch (error) {
          results.push({
            feed_id: feed.id,
            feed_name: feed.name,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    return Response.json({
      success: true,
      synced: results.length,
      results
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});