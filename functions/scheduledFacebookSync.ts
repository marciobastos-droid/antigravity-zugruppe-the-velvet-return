import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users with Facebook Lead Ads configured
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersWithFacebook = allUsers.filter(u => u.fb_lead_settings?.configured);

    console.log(`Found ${usersWithFacebook.length} users with Facebook integration configured`);

    let totalSynced = 0;
    let totalErrors = 0;
    const syncResults = [];

    for (const user of usersWithFacebook) {
      const fbSettings = user.fb_lead_settings;
      
      if (!fbSettings.campaigns || fbSettings.campaigns.length === 0) {
        continue;
      }

      console.log(`Syncing campaigns for user: ${user.email}`);

      for (const campaign of fbSettings.campaigns) {
        try {
          // Check if campaign should be synced based on interval
          const lastSync = fbSettings.last_sync?.[campaign.form_id] || null;
          const syncIntervalHours = campaign.sync_interval_hours !== undefined ? campaign.sync_interval_hours : 24;
          
          // Skip if sync_interval_hours is 0 (manual only)
          if (syncIntervalHours === 0) {
            console.log(`Skipping ${campaign.campaign_name} - manual sync only`);
            continue;
          }

          // Check if enough time has passed since last sync
          if (lastSync) {
            const hoursSinceLastSync = (new Date() - new Date(lastSync)) / (1000 * 60 * 60);
            if (hoursSinceLastSync < syncIntervalHours) {
              console.log(`Skipping ${campaign.campaign_name} - synced ${hoursSinceLastSync.toFixed(1)}h ago, interval is ${syncIntervalHours}h`);
              continue;
            }
          }

          const payload = {
            access_token: fbSettings.access_token,
            page_id: fbSettings.page_id,
            form_id: campaign.form_id,
            campaign_id: campaign.campaign_id || '',
            campaign_name: campaign.campaign_name || '',
            form_name: campaign.form_name || '',
            assigned_to: campaign.assigned_to || '',
            last_sync: lastSync,
            sync_type: 'automatic'
          };

          // Call the sync function
          const syncResponse = await base44.asServiceRole.functions.invoke('syncFacebookLeads', payload);

          if (syncResponse.data.error) {
            throw new Error(syncResponse.data.details || syncResponse.data.error);
          }

          const { created_count, duplicated_count } = syncResponse.data;

          if (created_count > 0) {
            // Update last sync date
            const updatedLastSync = {
              ...(fbSettings.last_sync || {}),
              [campaign.form_id]: new Date().toISOString()
            };

            await base44.asServiceRole.entities.User.update(user.id, {
              fb_lead_settings: {
                ...fbSettings,
                last_sync: updatedLastSync
              }
            });

            // Create notification for assigned user or campaign owner
            const notificationRecipient = campaign.assigned_to || user.email;
            
            await base44.asServiceRole.entities.Notification.create({
              title: 'Novos Leads do Facebook',
              message: `${created_count} novo(s) lead(s) da campanha "${campaign.campaign_name || campaign.campaign_id}" sincronizado(s) automaticamente`,
              type: 'lead',
              priority: 'medium',
              user_email: notificationRecipient,
              related_type: 'FacebookLead',
              action_url: '/Tools'
            });
          }

          syncResults.push({
            user: user.email,
            campaign: campaign.campaign_name || campaign.campaign_id,
            created: created_count,
            duplicated: duplicated_count,
            success: true
          });

          totalSynced += created_count;

          console.log(`Synced ${created_count} leads for ${user.email} - ${campaign.campaign_name}`);

        } catch (error) {
          totalErrors++;
          syncResults.push({
            user: user.email,
            campaign: campaign.campaign_name || campaign.campaign_id,
            error: error.message,
            success: false
          });

          console.error(`Error syncing for ${user.email}:`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      total_users: usersWithFacebook.length,
      total_leads_synced: totalSynced,
      total_errors: totalErrors,
      results: syncResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduled sync error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});