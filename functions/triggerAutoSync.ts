import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Função para executar manualmente a sincronização automática de todas as campanhas
 * que estão prontas para sincronizar baseado nos seus intervalos configurados.
 * 
 * Esta função deve ser chamada periodicamente (ex: a cada hora) ou manualmente
 * para processar todas as campanhas com sincronização automática ativa.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar utilizador (apenas admins podem triggerar sync automática global)
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.user_type !== 'admin')) {
      return Response.json({ error: 'Unauthorized. Only admins can trigger auto sync.' }, { status: 403 });
    }

    // Buscar todos os utilizadores
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    console.log(`[AutoSync] Verificando ${allUsers.length} utilizadores...`);

    let totalSynced = 0;
    let totalErrors = 0;
    const syncResults = [];

    for (const targetUser of allUsers) {
      const fbSettings = targetUser.fb_lead_settings;
      
      // Verificar se o utilizador tem configuração do Facebook
      if (!fbSettings?.configured || !fbSettings?.access_token || !fbSettings?.campaigns) {
        continue;
      }

      console.log(`[AutoSync] Utilizador: ${targetUser.email}, Campanhas: ${fbSettings.campaigns.length}`);

      for (const campaign of fbSettings.campaigns) {
        try {
          const intervalHours = campaign.sync_interval_hours !== undefined ? campaign.sync_interval_hours : 24;
          
          // Ignorar campanhas com sync manual (interval = 0)
          if (intervalHours === 0) {
            console.log(`[AutoSync] Skipped ${campaign.campaign_name} - manual only`);
            continue;
          }

          // Verificar se já passou tempo suficiente desde a última sync
          const lastSync = fbSettings.last_sync?.[campaign.form_id];
          if (lastSync) {
            const hoursSinceLastSync = (new Date() - new Date(lastSync)) / (1000 * 60 * 60);
            if (hoursSinceLastSync < intervalHours) {
              console.log(`[AutoSync] Skipped ${campaign.campaign_name} - synced ${hoursSinceLastSync.toFixed(1)}h ago (interval: ${intervalHours}h)`);
              continue;
            }
          }

          console.log(`[AutoSync] Syncing ${campaign.campaign_name} for ${targetUser.email}...`);

          // Preparar payload para sincronização
          const syncPayload = {
            access_token: fbSettings.access_token,
            page_id: fbSettings.page_id,
            form_id: campaign.form_id,
            campaign_id: campaign.campaign_id || '',
            campaign_name: campaign.campaign_name || '',
            form_name: campaign.form_name || '',
            assigned_to: campaign.assigned_to || '',
            last_sync: lastSync || null,
            sync_type: 'automatic'
          };

          // Executar sincronização
          const syncResponse = await base44.asServiceRole.functions.invoke('syncFacebookLeads', syncPayload);

          if (syncResponse.data?.error) {
            throw new Error(syncResponse.data.details || syncResponse.data.error);
          }

          const { created_count = 0, duplicated_count = 0 } = syncResponse.data;

          // Atualizar última sincronização no utilizador
          const updatedLastSync = {
            ...(fbSettings.last_sync || {}),
            [campaign.form_id]: new Date().toISOString()
          };

          await base44.asServiceRole.entities.User.update(targetUser.id, {
            fb_lead_settings: {
              ...fbSettings,
              last_sync: updatedLastSync
            }
          });

          // Criar notificação se houver leads novas
          if (created_count > 0) {
            const notificationRecipient = campaign.assigned_to || targetUser.email;
            
            await base44.asServiceRole.entities.Notification.create({
              title: '🔔 Novos Leads do Facebook',
              message: `${created_count} novo(s) lead(s) da campanha "${campaign.campaign_name || campaign.campaign_id}" sincronizado(s) automaticamente`,
              type: 'lead',
              priority: 'high',
              user_email: notificationRecipient,
              related_type: 'FacebookLead',
              action_url: '/Tools'
            });
          }

          syncResults.push({
            user: targetUser.email,
            campaign: campaign.campaign_name || campaign.campaign_id,
            form_id: campaign.form_id,
            created: created_count,
            duplicated: duplicated_count,
            success: true
          });

          totalSynced += created_count;

          console.log(`[AutoSync] ✅ ${created_count} leads criadas para ${targetUser.email} - ${campaign.campaign_name}`);

        } catch (error) {
          totalErrors++;
          
          syncResults.push({
            user: targetUser.email,
            campaign: campaign.campaign_name || campaign.campaign_id,
            form_id: campaign.form_id,
            error: error.message,
            success: false
          });

          console.error(`[AutoSync] ❌ Error for ${targetUser.email} - ${campaign.campaign_name}:`, error.message);

          // Criar notificação de erro para o administrador
          await base44.asServiceRole.entities.Notification.create({
            title: '⚠️ Erro na Sincronização Automática Facebook',
            message: `Erro ao sincronizar campanha "${campaign.campaign_name}" do utilizador ${targetUser.email}: ${error.message}`,
            type: 'system',
            priority: 'high',
            user_email: user.email, // Notificar o admin que executou
            related_type: 'FacebookLead'
          });
        }
      }
    }

    return Response.json({
      success: true,
      total_leads_synced: totalSynced,
      total_errors: totalErrors,
      results: syncResults,
      timestamp: new Date().toISOString(),
      message: totalSynced > 0 
        ? `✅ Sincronização concluída: ${totalSynced} leads importadas` 
        : '✓ Nenhuma campanha pronta para sincronizar'
    });

  } catch (error) {
    console.error('[AutoSync] Fatal error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});