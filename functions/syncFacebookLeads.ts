import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const syncStartTime = Date.now();
  try {
    // Ler o body do request primeiro
    const body = await req.json();
    let { access_token, page_id, form_id, campaign_id, campaign_name, form_name, last_sync, start_date, end_date, assigned_to, campaign_budget, campaign_start_date, campaign_end_date, campaign_status, sync_type = 'manual' } = body;

    // Limpar espaços em branco dos parâmetros recebidos
    access_token = access_token ? access_token.trim() : access_token;
    page_id = page_id ? page_id.trim() : page_id;
    form_id = form_id ? form_id.trim() : form_id;

    console.log('Received parameters:', {
      has_access_token: !!access_token,
      has_form_id: !!form_id,
      access_token_preview: access_token ? `${access_token.substring(0, 10)}...` : 'MISSING',
      form_id: form_id || 'MISSING'
    });

    // Validar parâmetros obrigatórios
    if (!access_token || !form_id) {
      console.error('Missing required parameters:', { 
        has_access_token: !!access_token,
        has_form_id: !!form_id 
      });
      return Response.json({ 
        error: 'Missing required parameters',
        details: `access_token: ${!!access_token ? 'present' : 'MISSING'}, form_id: ${!!form_id ? 'present' : 'MISSING'}`
      }, { status: 400 });
    }

    // Autenticar utilizador
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar leads existentes para deduplicação (de TODOS os formulários para evitar duplicados globais)
    const existingLeads = await base44.entities.FacebookLead.list();
    const existingLeadIds = new Set(existingLeads.map(l => l.lead_id).filter(Boolean));
    const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existingLeads.map(l => l.phone?.replace(/\D/g, '')).filter(p => p && p.length >= 9));

    // Construir URL da API do Facebook
    let apiUrl = `https://graph.facebook.com/v18.0/${form_id}/leads?access_token=${access_token}&fields=id,created_time,field_data`;
    
    // Adicionar filtro de data customizado (histórico) ou incremental
    if (start_date && end_date) {
      // Sincronização histórica com intervalo de datas
      const startTimestamp = Math.floor(new Date(start_date).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(new Date(end_date).setHours(23, 59, 59, 999)).getTime() / 1000); // Set to end of the day for inclusive date range
      apiUrl += `&since=${startTimestamp}&until=${endTimestamp}`;
      console.log(`Historical sync: ${start_date} to ${end_date}`);
    } else if (last_sync) {
      // Sincronização incremental desde a última sincronização
      const lastSyncTimestamp = Math.floor(new Date(last_sync).getTime() / 1000);
      apiUrl += `&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${lastSyncTimestamp}}]`;
      console.log(`Incremental sync since: ${last_sync}`);
    }

    // Buscar dados da campanha se campaign_id foi fornecido
    let campaignData = null;
    if (campaign_id) {
      try {
        const campaignUrl = `https://graph.facebook.com/v18.0/${campaign_id}?access_token=${access_token}&fields=name,status,daily_budget,lifetime_budget,start_time,stop_time,objective`;
        const campaignResponse = await fetch(campaignUrl);
        if (campaignResponse.ok) {
          campaignData = await campaignResponse.json();
          console.log('Campaign data fetched:', campaignData);
        }
      } catch (error) {
        console.warn('Could not fetch campaign data:', error);
      }
    }

    // Fazer chamada à API do Facebook para leads
    const fbResponse = await fetch(apiUrl);
    
    if (!fbResponse.ok) {
      const errorData = await fbResponse.json();
      console.error('Facebook API Error:', errorData);
      return Response.json({ 
        error: 'Facebook API Error', 
        details: errorData.error?.message || 'Unknown error' 
      }, { status: 500 });
    }

    const fbData = await fbResponse.json();
    const fbLeads = fbData.data || [];

    // Processar e mapear leads do Facebook
    const newLeads = [];
    let duplicatedCount = 0;

    for (const fbLead of fbLeads) {
      // Verificar se já existe pelo ID do Facebook
      if (existingLeadIds.has(fbLead.id)) {
        duplicatedCount++;
        continue;
      }

      // Mapear field_data para campos conhecidos
      const fieldData = {};
      if (fbLead.field_data) {
        for (const field of fbLead.field_data) {
          fieldData[field.name.toLowerCase()] = field.values?.[0] || '';
        }
      }

      // Extrair email e telefone do field_data
      const email = (fieldData.email || fieldData.e_mail || fieldData['e-mail'] || '').toLowerCase().trim();
      const phone = (fieldData.phone_number || fieldData.phone || fieldData.telefone || '').replace(/\D/g, '');
      
      // Verificar duplicação por email (global)
      if (email && existingEmails.has(email)) {
        duplicatedCount++;
        console.log(`Duplicado por email: ${email}`);
        continue;
      }
      
      // Verificar duplicação por telefone (global) - só se tiver 9+ dígitos
      if (phone && phone.length >= 9 && existingPhones.has(phone)) {
        duplicatedCount++;
        console.log(`Duplicado por telefone: ${phone}`);
        continue;
      }

      // Criar objeto de lead com dados da campanha
      const leadData = {
        lead_id: fbLead.id,
        campaign_id: campaign_id || '',
        form_id: form_id,
        campaign_name: campaignData?.name || campaign_name || '',
        campaign_budget: campaignData ? (parseFloat(campaignData.daily_budget) / 100 || parseFloat(campaignData.lifetime_budget) / 100) : (campaign_budget || undefined),
        campaign_start_date: campaignData?.start_time ? new Date(campaignData.start_time).toISOString().split('T')[0] : (campaign_start_date || undefined),
        campaign_end_date: campaignData?.stop_time ? new Date(campaignData.stop_time).toISOString().split('T')[0] : (campaign_end_date || undefined),
        campaign_status: campaignData?.status || campaign_status || undefined,
        form_name: form_name || '',
        full_name: fieldData.full_name || fieldData.name || fieldData.nome || '',
        email: email,
        phone: fieldData.phone_number || fieldData.phone || fieldData.telefone || '',
        location: fieldData.city || fieldData.location || fieldData.localização || fieldData.cidade || '',
        property_type: fieldData.property_type || fieldData.tipo_imovel || '',
        budget: fieldData.budget || fieldData.orçamento || '',
        message: fieldData.message || fieldData.mensagem || fieldData.comments || '',
        status: 'new',
        raw_data: fbLead
      };

      // Criar lead na base de dados
      await base44.entities.FacebookLead.create(leadData);
      newLeads.push(leadData);
      
      if (email) {
        existingEmails.add(email);
      }
    }

    // Criar notificação para o responsável atribuído ou para o utilizador atual
    if (newLeads.length > 0) {
      const notificationRecipient = assigned_to || user.email;

      await base44.entities.Notification.create({
        title: 'Novos Leads do Facebook',
        message: `${newLeads.length} novo(s) lead(s) da campanha "${campaign_name || campaign_id}"`,
        type: 'lead',
        priority: 'high',
        user_email: notificationRecipient,
        related_type: 'FacebookLead',
        action_url: '/Tools'
      });

      // Se houver responsável, também notificar o utilizador que sincronizou
      if (assigned_to && assigned_to !== user.email) {
        await base44.entities.Notification.create({
          title: 'Leads Sincronizados',
          message: `${newLeads.length} novo(s) lead(s) sincronizado(s) da campanha "${campaign_name || campaign_id}" (atribuída a ${assigned_to})`,
          type: 'lead',
          priority: 'medium',
          user_email: user.email,
          related_type: 'FacebookLead',
          action_url: '/Tools'
        });
      }
    }

    // Calcular duração
    const durationSeconds = Math.floor((Date.now() - syncStartTime) / 1000);

    // Criar log de sincronização
    await base44.entities.FacebookSyncLog.create({
      campaign_id: campaign_id || '',
      form_id: form_id,
      sync_type: start_date && end_date ? 'historical' : sync_type,
      status: 'success',
      leads_fetched: fbLeads.length,
      leads_created: newLeads.length,
      leads_duplicated: duplicatedCount,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      duration_seconds: durationSeconds,
      triggered_by: user.email
    });

    return Response.json({
      success: true,
      created_count: newLeads.length,
      duplicated_count: duplicatedCount,
      total_fetched: fbLeads.length,
      new_leads: newLeads.map(l => ({ full_name: l.full_name, email: l.email }))
    });

  } catch (error) {
    console.error('Sync error:', error);
    
    // Criar log de erro
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      const body = await req.json();
      
      if (user && body.form_id) {
        await base44.entities.FacebookSyncLog.create({
          campaign_id: body.campaign_id || '',
          form_id: body.form_id,
          sync_type: body.start_date && body.end_date ? 'historical' : (body.sync_type || 'manual'),
          status: 'error',
          leads_fetched: 0,
          leads_created: 0,
          leads_duplicated: 0,
          error_message: error.message || error.toString(),
          duration_seconds: Math.floor((Date.now() - syncStartTime) / 1000),
          triggered_by: user.email
        });
      }
    } catch (logError) {
      console.error('Failed to create error log:', logError);
    }
    
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});